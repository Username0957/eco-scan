export interface VisualFeatures {
  dominantColors: { color: string; percentage: number }[]
  brightness: "dark" | "medium" | "bright"
  hasTransparency: boolean
  aspectRatio: string
  estimatedObjects: string[]
  textureAnalysis: "smooth" | "rough" | "mixed"
  edgeDensity: "low" | "medium" | "high"
  colorfulness: "monochrome" | "limited" | "colorful"
}

export interface VisionAnalysisResult {
  features: VisualFeatures
  description: string
  confidence: number
  suggestedCategories: string[]
}

// Plastik biasanya memiliki karakteristik visual tertentu
const PLASTIC_COLOR_SIGNATURES = [
  {
    colors: ["#FFFFFF", "#F5F5F5", "#E0E0E0"],
    type: "putih/transparan",
    items: ["botol air", "wadah makanan", "kantong plastik"],
  },
  { colors: ["#00FF00", "#008000", "#90EE90"], type: "hijau", items: ["botol sprite", "wadah sayur"] },
  { colors: ["#0000FF", "#1E90FF", "#87CEEB"], type: "biru", items: ["botol air mineral", "tutup botol", "galon"] },
  { colors: ["#FF0000", "#DC143C", "#FF6347"], type: "merah", items: ["tutup botol", "wadah makanan", "sedotan"] },
  {
    colors: ["#FFFF00", "#FFD700", "#FFA500"],
    type: "kuning/oranye",
    items: ["botol jus", "wadah minyak", "kantong snack"],
  },
  { colors: ["#000000", "#333333", "#666666"], type: "hitam", items: ["kantong plastik", "wadah elektronik", "pipa"] },
  { colors: ["#8B4513", "#A0522D", "#D2691E"], type: "coklat", items: ["botol teh", "wadah kopi"] },
]

// Deteksi bentuk berdasarkan aspect ratio dan edge
const SHAPE_SIGNATURES = {
  bottle: { aspectRatio: [0.3, 0.5], edgeDensity: "medium" },
  bag: { aspectRatio: [0.8, 1.2], edgeDensity: "low" },
  container: { aspectRatio: [0.6, 1.0], edgeDensity: "medium" },
  straw: { aspectRatio: [0.05, 0.15], edgeDensity: "low" },
  cup: { aspectRatio: [0.7, 1.0], edgeDensity: "medium" },
}

export function analyzeImageLocally(imageData: ImageData): VisualFeatures {
  const { data, width, height } = imageData

  // 1. Analisis warna dominan
  const colorMap = new Map<string, number>()
  let totalBrightness = 0
  let transparentPixels = 0

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]

    if (a < 128) {
      transparentPixels++
      continue
    }

    // Kuantisasi warna untuk grouping
    const qr = Math.round(r / 32) * 32
    const qg = Math.round(g / 32) * 32
    const qb = Math.round(b / 32) * 32
    const colorKey = `#${qr.toString(16).padStart(2, "0")}${qg.toString(16).padStart(2, "0")}${qb.toString(16).padStart(2, "0")}`

    colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1)
    totalBrightness += (r + g + b) / 3
  }

  const totalPixels = data.length / 4 - transparentPixels
  const avgBrightness = totalBrightness / totalPixels

  // Sort colors by frequency
  const sortedColors = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([color, count]) => ({
      color: color.toUpperCase(),
      percentage: Math.round((count / totalPixels) * 100),
    }))

  // 2. Analisis edge density (deteksi tepi sederhana)
  let edgeCount = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      const idxRight = (y * width + x + 1) * 4
      const idxDown = ((y + 1) * width + x) * 4

      const diffH =
        Math.abs(data[idx] - data[idxRight]) +
        Math.abs(data[idx + 1] - data[idxRight + 1]) +
        Math.abs(data[idx + 2] - data[idxRight + 2])
      const diffV =
        Math.abs(data[idx] - data[idxDown]) +
        Math.abs(data[idx + 1] - data[idxDown + 1]) +
        Math.abs(data[idx + 2] - data[idxDown + 2])

      if (diffH > 100 || diffV > 100) edgeCount++
    }
  }

  const edgeDensityRatio = edgeCount / totalPixels

  // 3. Analisis colorfulness
  const uniqueColors = colorMap.size

  // 4. Estimasi objek berdasarkan warna
  const estimatedObjects: string[] = []
  for (const signature of PLASTIC_COLOR_SIGNATURES) {
    for (const sigColor of signature.colors) {
      for (const dominantColor of sortedColors.slice(0, 3)) {
        if (colorDistance(dominantColor.color, sigColor) < 100) {
          estimatedObjects.push(...signature.items)
          break
        }
      }
    }
  }

  return {
    dominantColors: sortedColors,
    brightness: avgBrightness < 85 ? "dark" : avgBrightness > 170 ? "bright" : "medium",
    hasTransparency: transparentPixels > totalPixels * 0.1,
    aspectRatio: `${width}:${height}`,
    estimatedObjects: [...new Set(estimatedObjects)].slice(0, 5),
    textureAnalysis: edgeDensityRatio < 0.05 ? "smooth" : edgeDensityRatio > 0.15 ? "rough" : "mixed",
    edgeDensity: edgeDensityRatio < 0.05 ? "low" : edgeDensityRatio > 0.15 ? "high" : "medium",
    colorfulness: uniqueColors < 20 ? "monochrome" : uniqueColors < 100 ? "limited" : "colorful",
  }
}

function colorDistance(color1: string, color2: string): number {
  const r1 = Number.parseInt(color1.slice(1, 3), 16)
  const g1 = Number.parseInt(color1.slice(3, 5), 16)
  const b1 = Number.parseInt(color1.slice(5, 7), 16)
  const r2 = Number.parseInt(color2.slice(1, 3), 16)
  const g2 = Number.parseInt(color2.slice(3, 5), 16)
  const b2 = Number.parseInt(color2.slice(5, 7), 16)

  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

export function generateVisualDescription(features: VisualFeatures): string {
  const colorDesc = features.dominantColors
    .slice(0, 3)
    .map((c) => `${c.color} (${c.percentage}%)`)
    .join(", ")

  const objectsDesc =
    features.estimatedObjects.length > 0
      ? `Kemungkinan objek: ${features.estimatedObjects.join(", ")}.`
      : "Objek tidak teridentifikasi dengan jelas."

  return `Analisis Visual Gambar:
- Warna dominan: ${colorDesc}
- Kecerahan: ${features.brightness}
- Transparansi: ${features.hasTransparency ? "Ya" : "Tidak"}
- Tekstur permukaan: ${features.textureAnalysis}
- Kepadatan detail/tepi: ${features.edgeDensity}
- Variasi warna: ${features.colorfulness}
- Rasio aspek: ${features.aspectRatio}
- ${objectsDesc}

Berdasarkan karakteristik visual di atas, identifikasi jenis sampah plastik/non-organik yang ada dalam gambar.`
}

export function calculateConfidence(features: VisualFeatures): number {
  let confidence = 0.5

  // Jika ada estimasi objek, tingkatkan confidence
  if (features.estimatedObjects.length > 0) confidence += 0.2

  // Jika warna dominan jelas, tingkatkan confidence
  if (features.dominantColors[0]?.percentage > 30) confidence += 0.1

  // Jika tekstur smooth (plastik biasanya smooth), tingkatkan confidence
  if (features.textureAnalysis === "smooth") confidence += 0.1

  // Jika ada transparansi (plastik sering transparan), tingkatkan confidence
  if (features.hasTransparency) confidence += 0.1

  return Math.min(confidence, 1)
}

export function getSuggestedCategories(features: VisualFeatures): string[] {
  const categories: string[] = []

  // Berdasarkan warna
  for (const color of features.dominantColors.slice(0, 2)) {
    if (color.color.includes("FF") && !color.color.includes("00")) {
      categories.push("Plastik berwarna")
    }
    if (color.color === "#FFFFFF" || color.color === "#E0E0E0") {
      categories.push("Plastik putih/transparan")
    }
  }

  // Berdasarkan tekstur
  if (features.textureAnalysis === "smooth") {
    categories.push("Plastik halus (PET, HDPE)")
  }

  // Berdasarkan estimasi objek
  categories.push(...features.estimatedObjects.map((obj) => `Kemungkinan: ${obj}`))

  return [...new Set(categories)].slice(0, 5)
}
