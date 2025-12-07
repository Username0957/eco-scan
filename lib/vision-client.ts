// Client-side vision analysis using Canvas API

export interface ClientVisionResult {
  visualDescription: string
  dominantColors: string[]
  estimatedObjects: string[]
  confidence: number
  thumbnailBase64: string // Thumbnail kecil untuk AI jika diperlukan
}

export async function analyzeImageClient(base64Image: string): Promise<ClientVisionResult> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      try {
        // Buat canvas kecil untuk analisis (hemat memory)
        const analysisCanvas = document.createElement("canvas")
        const analysisSize = 200 // Ukuran kecil untuk analisis cepat

        const scale = Math.min(analysisSize / img.width, analysisSize / img.height)
        analysisCanvas.width = Math.round(img.width * scale)
        analysisCanvas.height = Math.round(img.height * scale)

        const ctx = analysisCanvas.getContext("2d", { willReadFrequently: true })
        if (!ctx) {
          reject(new Error("Canvas context not available"))
          return
        }

        ctx.drawImage(img, 0, 0, analysisCanvas.width, analysisCanvas.height)
        const imageData = ctx.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height)

        // Analisis warna dominan
        const colorMap = new Map<string, number>()
        const { data } = imageData

        for (let i = 0; i < data.length; i += 16) {
          // Sample setiap 4 pixel untuk kecepatan
          const r = Math.round(data[i] / 51) * 51
          const g = Math.round(data[i + 1] / 51) * 51
          const b = Math.round(data[i + 2] / 51) * 51
          const key = `rgb(${r},${g},${b})`
          colorMap.set(key, (colorMap.get(key) || 0) + 1)
        }

        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([color]) => color)

        // Estimasi objek berdasarkan warna
        const estimatedObjects = estimateObjectsFromColors(sortedColors)

        // Hitung confidence
        const confidence = calculateLocalConfidence(sortedColors, estimatedObjects)

        // Generate visual description
        const visualDescription = generateLocalDescription(sortedColors, estimatedObjects, {
          width: img.width,
          height: img.height,
        })

        // Buat thumbnail sangat kecil (100x100) untuk fallback AI jika diperlukan
        const thumbCanvas = document.createElement("canvas")
        const thumbSize = 100
        const thumbScale = Math.min(thumbSize / img.width, thumbSize / img.height)
        thumbCanvas.width = Math.round(img.width * thumbScale)
        thumbCanvas.height = Math.round(img.height * thumbScale)

        const thumbCtx = thumbCanvas.getContext("2d")
        if (thumbCtx) {
          thumbCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height)
        }

        const thumbnailBase64 = thumbCanvas.toDataURL("image/jpeg", 0.5)

        resolve({
          visualDescription,
          dominantColors: sortedColors,
          estimatedObjects,
          confidence,
          thumbnailBase64,
        })
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = base64Image
  })
}

function estimateObjectsFromColors(colors: string[]): string[] {
  const objects: string[] = []

  const colorPatterns = [
    {
      pattern: /rgb$$255,255,255$$|rgb$$204,204,204$$|rgb$$255,255,204$$/,
      items: ["botol plastik transparan", "wadah plastik putih", "kantong plastik"],
    },
    {
      pattern: /rgb$$0,255,0$$|rgb$$0,204,0$$|rgb$$51,255,51$$/,
      items: ["botol minuman hijau", "wadah plastik hijau"],
    },
    {
      pattern: /rgb$$0,0,255$$|rgb$$0,102,255$$|rgb$$51,51,255$$/,
      items: ["botol air mineral", "tutup botol biru", "galon air"],
    },
    {
      pattern: /rgb$$255,0,0$$|rgb$$255,51,51$$|rgb$$204,0,0$$/,
      items: ["tutup botol merah", "sedotan merah", "wadah merah"],
    },
    {
      pattern: /rgb$$255,255,0$$|rgb$$255,204,0$$|rgb$$255,153,0$$/,
      items: ["botol jus", "kantong snack", "wadah kuning"],
    },
    { pattern: /rgb$$0,0,0$$|rgb$$51,51,51$$/, items: ["kantong plastik hitam", "wadah elektronik"] },
    { pattern: /rgb$$153,102,51$$|rgb$$204,153,102$$/, items: ["botol teh", "wadah coklat"] },
  ]

  for (const color of colors) {
    for (const { pattern, items } of colorPatterns) {
      if (pattern.test(color)) {
        objects.push(...items)
      }
    }
  }

  return [...new Set(objects)].slice(0, 5)
}

function calculateLocalConfidence(colors: string[], objects: string[]): number {
  let confidence = 0.4 // Base confidence

  if (objects.length > 0) confidence += 0.2
  if (objects.length > 2) confidence += 0.1

  // Plastik biasanya punya warna solid
  const hasWhiteOrClear = colors.some(
    (c) => c.includes("255,255,255") || c.includes("204,204,204") || c.includes("255,255,204"),
  )
  if (hasWhiteOrClear) confidence += 0.15

  // Warna-warna plastik umum
  const hasPlasticColors = colors.some((c) => c.includes("0,255,0") || c.includes("0,0,255") || c.includes("255,0,0"))
  if (hasPlasticColors) confidence += 0.15

  return Math.min(confidence, 0.95)
}

function generateLocalDescription(
  colors: string[],
  objects: string[],
  dimensions: { width: number; height: number },
): string {
  const colorNames = colors.map((c) => {
    if (c.includes("255,255,255") || c.includes("204,204,204")) return "putih/abu-abu terang"
    if (c.includes("0,255,0") || c.includes("0,204,0")) return "hijau"
    if (c.includes("0,0,255") || c.includes("0,102,255")) return "biru"
    if (c.includes("255,0,0") || c.includes("204,0,0")) return "merah"
    if (c.includes("255,255,0") || c.includes("255,204,0")) return "kuning"
    if (c.includes("0,0,0") || c.includes("51,51,51")) return "hitam/gelap"
    if (c.includes("153,102,51") || c.includes("204,153,102")) return "coklat"
    return "warna lain"
  })

  const uniqueColorNames = [...new Set(colorNames)]

  let description = `Gambar dengan dimensi ${dimensions.width}x${dimensions.height} piksel. `
  description += `Warna dominan: ${uniqueColorNames.slice(0, 3).join(", ")}. `

  if (objects.length > 0) {
    description += `Berdasarkan analisis warna, kemungkinan objek dalam gambar: ${objects.join(", ")}. `
  }

  description += `Tolong identifikasi jenis sampah plastik/non-organik yang ada dan berikan informasi detail untuk masing-masing objek.`

  return description
}
