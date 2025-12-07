// Heuristic Classifier v2 - Klasifikasi plastik tanpa AI cloud
// Menggunakan multi-region color analysis, texture detection, dan shape analysis

import type { DetectedObject } from "./types"

export interface HeuristicResult {
  type: string
  plasticCode: string
  confidence: number
  method: "filename" | "color" | "texture" | "shape" | "combined"
  details?: string
}

export interface ImageAnalysis {
  dominantColors: RGB[]
  brightness: number
  saturation: number
  transparency: number
  texture: "glossy" | "matte" | "textured" | "foam"
  shape: "bottle" | "bag" | "container" | "tube" | "cup" | "irregular"
  edges: number
  colorVariance: number
}

interface RGB {
  r: number
  g: number
  b: number
  percentage: number
}

// Database plastik lokal dengan informasi lengkap
const PLASTIC_DATABASE: Record<string, Omit<DetectedObject, "name">> = {
  PET: {
    plasticType: "PET (Polyethylene Terephthalate)",
    plasticCode: "1",
    decompositionTime: "450 tahun",
    microplasticRisk: "Tinggi" as const,
    ecoAlternative: "Botol stainless steel atau kaca",
    description: "Plastik PET biasa digunakan untuk botol minuman. Mudah dikenali dari kode daur ulang #1.",
  },
  HDPE: {
    plasticType: "HDPE (High-Density Polyethylene)",
    plasticCode: "2",
    decompositionTime: "500 tahun",
    microplasticRisk: "Sedang" as const,
    ecoAlternative: "Wadah kaca atau stainless steel",
    description: "HDPE digunakan untuk botol susu, wadah deterjen. Lebih aman dari PET.",
  },
  PVC: {
    plasticType: "PVC (Polyvinyl Chloride)",
    plasticCode: "3",
    decompositionTime: "1000+ tahun",
    microplasticRisk: "Tinggi" as const,
    ecoAlternative: "Pipa logam atau material alami",
    description: "PVC sangat berbahaya jika dibakar, menghasilkan dioksin.",
  },
  LDPE: {
    plasticType: "LDPE (Low-Density Polyethylene)",
    plasticCode: "4",
    decompositionTime: "500 tahun",
    microplasticRisk: "Sedang" as const,
    ecoAlternative: "Tas kain atau tas biodegradable",
    description: "LDPE digunakan untuk kantong plastik, plastik wrap. Sulit didaur ulang.",
  },
  PP: {
    plasticType: "PP (Polypropylene)",
    plasticCode: "5",
    decompositionTime: "500 tahun",
    microplasticRisk: "Sedang" as const,
    ecoAlternative: "Wadah kaca atau bambu",
    description: "PP digunakan untuk sedotan, tutup botol, wadah makanan panas.",
  },
  PS: {
    plasticType: "PS (Polystyrene/Styrofoam)",
    plasticCode: "6",
    decompositionTime: "500-1000 tahun",
    microplasticRisk: "Tinggi" as const,
    ecoAlternative: "Wadah kertas atau daun",
    description: "Styrofoam sangat berbahaya, mudah pecah menjadi mikroplastik.",
  },
  OTHER: {
    plasticType: "Other (Plastik Campuran)",
    plasticCode: "7",
    decompositionTime: "Tidak diketahui",
    microplasticRisk: "Tinggi" as const,
    ecoAlternative: "Hindari penggunaan",
    description: "Plastik kode 7 adalah campuran berbagai jenis, sulit didaur ulang.",
  },
}

const FILENAME_SIGNATURES: { keywords: string[]; type: keyof typeof PLASTIC_DATABASE; objectName: string }[] = [
  // PET - Botol minuman
  {
    keywords: [
      "botol",
      "aqua",
      "sprite",
      "coca",
      "coke",
      "fanta",
      "mineral",
      "pet",
      "bottle",
      "minum",
      "air",
      "beverag",
      "drink",
      "soda",
      "juice",
      "jus",
      "teh",
      "tea",
      "pocari",
      "mizone",
      "le minerale",
      "vit",
      "ades",
      "nestle",
      "pristine",
      "evian",
      "dasani",
    ],
    type: "PET",
    objectName: "Botol Minuman Plastik",
  },
  // HDPE - Wadah tebal
  {
    keywords: [
      "galon",
      "jerigen",
      "hdpe",
      "susu",
      "deterjen",
      "detergent",
      "shampoo",
      "sampo",
      "sabun",
      "lotion",
      "pelembab",
      "oli",
      "chemical",
      "kimia",
      "bleach",
      "pemutih",
      "gallon",
      "drum",
      "ember",
      "bucket",
    ],
    type: "HDPE",
    objectName: "Wadah Plastik HDPE",
  },
  // PVC - Pipa dan material konstruksi
  {
    keywords: [
      "pipa",
      "pvc",
      "vinyl",
      "selang",
      "pipe",
      "hose",
      "paralon",
      "kabel",
      "cable",
      "konstruksi",
      "building",
      "lantai",
      "floor",
    ],
    type: "PVC",
    objectName: "Produk PVC",
  },
  // LDPE - Kantong dan plastik tipis
  {
    keywords: [
      "kresek",
      "kantong",
      "plastik",
      "wrap",
      "ldpe",
      "bag",
      "tas",
      "bungkus",
      "wrapper",
      "film",
      "shrink",
      "bubble",
      "gelembung",
      "cling",
      "stretch",
      "sampah",
      "trash",
      "garbage",
    ],
    type: "LDPE",
    objectName: "Kantong Plastik",
  },
  // PP - Wadah makanan dan tutup
  {
    keywords: [
      "sedotan",
      "straw",
      "tutup",
      "pp",
      "cup",
      "gelas",
      "wadah",
      "container",
      "food",
      "makanan",
      "microwave",
      "tupperware",
      "toples",
      "jar",
      "yogurt",
      "margarin",
      "mentega",
      "butter",
      "lid",
      "cap",
    ],
    type: "PP",
    objectName: "Wadah Plastik PP",
  },
  // PS - Styrofoam
  {
    keywords: [
      "styro",
      "foam",
      "gabus",
      "ps",
      "styrofoam",
      "busa",
      "polystyrene",
      "eps",
      "tempat makan",
      "food box",
      "kotak",
      "nasi",
      "mie",
      "bakso",
      "insulation",
      "packing",
      "kemasan",
    ],
    type: "PS",
    objectName: "Styrofoam",
  },
]

interface PlasticColorProfile {
  type: keyof typeof PLASTIC_DATABASE
  characteristics: {
    brightnessRange: [number, number]
    saturationRange: [number, number]
    transparencyRange: [number, number]
    textureTypes: ("glossy" | "matte" | "textured" | "foam")[]
    shapeTypes: ("bottle" | "bag" | "container" | "tube" | "cup" | "irregular")[]
    colorPatterns: { hueRange: [number, number]; weight: number }[]
  }
  confidence: number
}

const PLASTIC_PROFILES: PlasticColorProfile[] = [
  {
    type: "PET",
    characteristics: {
      brightnessRange: [0.5, 1.0],
      saturationRange: [0.0, 0.5],
      transparencyRange: [0.5, 1.0],
      textureTypes: ["glossy"],
      shapeTypes: ["bottle"],
      colorPatterns: [
        { hueRange: [0, 360], weight: 0.3 }, // Transparan (semua hue rendah saturasi)
        { hueRange: [80, 160], weight: 0.8 }, // Hijau (Sprite)
        { hueRange: [180, 240], weight: 0.7 }, // Biru
      ],
    },
    confidence: 0.75,
  },
  {
    type: "HDPE",
    characteristics: {
      brightnessRange: [0.3, 0.9],
      saturationRange: [0.0, 0.4],
      transparencyRange: [0.0, 0.3],
      textureTypes: ["matte", "textured"],
      shapeTypes: ["container", "bottle"],
      colorPatterns: [
        { hueRange: [0, 60], weight: 0.6 }, // Kuning/oranye
        { hueRange: [200, 260], weight: 0.5 }, // Biru
      ],
    },
    confidence: 0.7,
  },
  {
    type: "PVC",
    characteristics: {
      brightnessRange: [0.2, 0.7],
      saturationRange: [0.1, 0.6],
      transparencyRange: [0.0, 0.2],
      textureTypes: ["glossy", "matte"],
      shapeTypes: ["tube", "irregular"],
      colorPatterns: [
        { hueRange: [0, 30], weight: 0.6 }, // Abu-abu/coklat
        { hueRange: [180, 220], weight: 0.5 }, // Abu biru
      ],
    },
    confidence: 0.65,
  },
  {
    type: "LDPE",
    characteristics: {
      brightnessRange: [0.4, 1.0],
      saturationRange: [0.0, 0.8],
      transparencyRange: [0.3, 0.9],
      textureTypes: ["glossy", "matte"],
      shapeTypes: ["bag", "irregular"],
      colorPatterns: [
        { hueRange: [0, 360], weight: 0.4 }, // Berbagai warna
        { hueRange: [0, 30], weight: 0.6 }, // Hitam/abu
        { hueRange: [330, 360], weight: 0.5 }, // Merah/pink
      ],
    },
    confidence: 0.65,
  },
  {
    type: "PP",
    characteristics: {
      brightnessRange: [0.5, 1.0],
      saturationRange: [0.2, 1.0],
      transparencyRange: [0.0, 0.5],
      textureTypes: ["glossy", "matte"],
      shapeTypes: ["container", "cup"],
      colorPatterns: [
        { hueRange: [0, 30], weight: 0.7 }, // Merah
        { hueRange: [30, 60], weight: 0.6 }, // Oranye/kuning
        { hueRange: [180, 240], weight: 0.6 }, // Biru
      ],
    },
    confidence: 0.7,
  },
  {
    type: "PS",
    characteristics: {
      brightnessRange: [0.8, 1.0],
      saturationRange: [0.0, 0.1],
      transparencyRange: [0.0, 0.2],
      textureTypes: ["foam", "textured"],
      shapeTypes: ["container", "cup", "irregular"],
      colorPatterns: [
        { hueRange: [0, 360], weight: 0.9 }, // Putih (saturasi sangat rendah)
      ],
    },
    confidence: 0.8,
  },
]

export async function analyzeImage(dataUrl: string): Promise<ImageAnalysis> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const size = 100
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve(getDefaultAnalysis())
        return
      }

      ctx.drawImage(img, 0, 0, size, size)
      const imageData = ctx.getImageData(0, 0, size, size)
      const data = imageData.data

      // 1. Extract colors from multiple regions
      const regions = [
        { x: 0, y: 0, w: size / 2, h: size / 2 }, // Top-left
        { x: size / 2, y: 0, w: size / 2, h: size / 2 }, // Top-right
        { x: 0, y: size / 2, w: size / 2, h: size / 2 }, // Bottom-left
        { x: size / 2, y: size / 2, w: size / 2, h: size / 2 }, // Bottom-right
        { x: size / 4, y: size / 4, w: size / 2, h: size / 2 }, // Center
      ]

      const colorCounts: Map<string, { r: number; g: number; b: number; count: number }> = new Map()
      let totalBrightness = 0
      let totalSaturation = 0
      let transparentPixels = 0
      let edgeCount = 0
      let varianceSum = 0
      let pixelCount = 0

      // Analyze each pixel
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]
          const a = data[idx + 3]

          // Quantize color to reduce noise
          const qr = Math.floor(r / 32) * 32
          const qg = Math.floor(g / 32) * 32
          const qb = Math.floor(b / 32) * 32
          const key = `${qr},${qg},${qb}`

          if (colorCounts.has(key)) {
            const existing = colorCounts.get(key)!
            existing.count++
            existing.r += r
            existing.g += g
            existing.b += b
          } else {
            colorCounts.set(key, { r, g, b, count: 1 })
          }

          // Calculate brightness (0-1)
          const brightness = (r + g + b) / (255 * 3)
          totalBrightness += brightness

          // Calculate saturation
          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          const saturation = max === 0 ? 0 : (max - min) / max
          totalSaturation += saturation

          // Check transparency
          if (a < 200 || (brightness > 0.9 && saturation < 0.1)) {
            transparentPixels++
          }

          // Edge detection (simple gradient)
          if (x > 0 && y > 0) {
            const prevIdx = ((y - 1) * size + (x - 1)) * 4
            const diff = Math.abs(r - data[prevIdx]) + Math.abs(g - data[prevIdx + 1]) + Math.abs(b - data[prevIdx + 2])
            if (diff > 50) edgeCount++
            varianceSum += diff
          }

          pixelCount++
        }
      }

      // Get top dominant colors
      const sortedColors = Array.from(colorCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((c) => ({
          r: Math.round(c.r / c.count),
          g: Math.round(c.g / c.count),
          b: Math.round(c.b / c.count),
          percentage: c.count / pixelCount,
        }))

      // Determine texture
      const avgVariance = varianceSum / pixelCount
      const edgeRatio = edgeCount / pixelCount
      let texture: "glossy" | "matte" | "textured" | "foam"

      if (avgVariance < 10 && totalBrightness / pixelCount > 0.8) {
        texture = "glossy"
      } else if (avgVariance > 30 && totalBrightness / pixelCount > 0.85 && totalSaturation / pixelCount < 0.1) {
        texture = "foam"
      } else if (avgVariance > 20) {
        texture = "textured"
      } else {
        texture = "matte"
      }

      // Determine shape based on edge patterns
      let shape: "bottle" | "bag" | "container" | "tube" | "cup" | "irregular"
      if (edgeRatio < 0.1 && avgVariance < 15) {
        shape = "bag" // Smooth, uniform
      } else if (edgeRatio > 0.3) {
        shape = "irregular"
      } else if (sortedColors.length > 0 && sortedColors[0].percentage > 0.5) {
        shape = "container"
      } else {
        shape = "bottle"
      }

      resolve({
        dominantColors: sortedColors,
        brightness: totalBrightness / pixelCount,
        saturation: totalSaturation / pixelCount,
        transparency: transparentPixels / pixelCount,
        texture,
        shape,
        edges: edgeRatio,
        colorVariance: avgVariance,
      })
    }
    img.onerror = () => resolve(getDefaultAnalysis())
    img.src = dataUrl
  })
}

function getDefaultAnalysis(): ImageAnalysis {
  return {
    dominantColors: [{ r: 200, g: 200, b: 200, percentage: 1 }],
    brightness: 0.5,
    saturation: 0.3,
    transparency: 0.3,
    texture: "matte",
    shape: "irregular",
    edges: 0.2,
    colorVariance: 15,
  }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s, l }
}

function scorePlasticType(analysis: ImageAnalysis, profile: PlasticColorProfile): number {
  let score = 0
  let factors = 0

  // Brightness match
  if (
    analysis.brightness >= profile.characteristics.brightnessRange[0] &&
    analysis.brightness <= profile.characteristics.brightnessRange[1]
  ) {
    score += 0.15
  }
  factors++

  // Saturation match
  if (
    analysis.saturation >= profile.characteristics.saturationRange[0] &&
    analysis.saturation <= profile.characteristics.saturationRange[1]
  ) {
    score += 0.15
  }
  factors++

  // Transparency match
  if (
    analysis.transparency >= profile.characteristics.transparencyRange[0] &&
    analysis.transparency <= profile.characteristics.transparencyRange[1]
  ) {
    score += 0.2
  }
  factors++

  // Texture match
  if (profile.characteristics.textureTypes.includes(analysis.texture)) {
    score += 0.2
  }
  factors++

  // Shape match
  if (profile.characteristics.shapeTypes.includes(analysis.shape)) {
    score += 0.15
  }
  factors++

  // Color pattern match (using dominant color)
  if (analysis.dominantColors.length > 0) {
    const primaryColor = analysis.dominantColors[0]
    const hsl = rgbToHsl(primaryColor.r, primaryColor.g, primaryColor.b)

    for (const pattern of profile.characteristics.colorPatterns) {
      if (hsl.h >= pattern.hueRange[0] && hsl.h <= pattern.hueRange[1]) {
        score += 0.15 * pattern.weight
        break
      }
    }
  }
  factors++

  return (score / factors) * profile.confidence
}

export function classifyByFilename(filename: string): HeuristicResult | null {
  const name = filename.toLowerCase().replace(/[_-]/g, " ")

  for (const sig of FILENAME_SIGNATURES) {
    for (const keyword of sig.keywords) {
      if (name.includes(keyword)) {
        return {
          type: sig.type,
          plasticCode: PLASTIC_DATABASE[sig.type].plasticCode,
          confidence: 0.8 + Math.random() * 0.1,
          method: "filename",
          details: `Terdeteksi keyword "${keyword}" dalam nama file`,
        }
      }
    }
  }

  return null
}

export async function classifyImageHeuristic(
  dataUrl: string,
  filename?: string,
): Promise<{ result: HeuristicResult; objects: DetectedObject[] }> {
  // 1. Analyze image
  const analysis = await analyzeImage(dataUrl)

  // 2. Check filename first (highest priority if matched)
  let filenameResult: HeuristicResult | null = null
  if (filename) {
    filenameResult = classifyByFilename(filename)
  }

  // 3. Score all plastic types
  const scores: { type: keyof typeof PLASTIC_DATABASE; score: number; details: string }[] = []

  for (const profile of PLASTIC_PROFILES) {
    const score = scorePlasticType(analysis, profile)
    scores.push({
      type: profile.type,
      score,
      details: `Brightness: ${(analysis.brightness * 100).toFixed(0)}%, Texture: ${analysis.texture}, Shape: ${analysis.shape}`,
    })
  }

  // Sort by score
  scores.sort((a, b) => b.score - a.score)
  const bestMatch = scores[0]

  // 4. Combine results
  let finalType: keyof typeof PLASTIC_DATABASE
  let finalConfidence: number
  let finalMethod: HeuristicResult["method"]
  let finalDetails: string

  if (filenameResult && filenameResult.confidence > 0.75) {
    // Filename match is strong, use it
    finalType = filenameResult.type as keyof typeof PLASTIC_DATABASE
    finalConfidence = filenameResult.confidence
    finalMethod = "filename"
    finalDetails = filenameResult.details || ""
  } else if (filenameResult && bestMatch.score > 0.3) {
    // Combine filename and image analysis
    if (filenameResult.type === bestMatch.type) {
      // Both agree - high confidence
      finalType = bestMatch.type
      finalConfidence = Math.min(0.95, (filenameResult.confidence + bestMatch.score) / 1.5)
      finalMethod = "combined"
      finalDetails = `Nama file dan analisis gambar cocok: ${bestMatch.type}`
    } else {
      // Disagree - prefer filename but lower confidence
      finalType = filenameResult.type as keyof typeof PLASTIC_DATABASE
      finalConfidence = filenameResult.confidence * 0.8
      finalMethod = "combined"
      finalDetails = `Nama file menunjukkan ${filenameResult.type}, gambar menunjukkan ${bestMatch.type}`
    }
  } else if (bestMatch.score > 0.3) {
    // Use image analysis
    finalType = bestMatch.type
    finalConfidence = Math.min(0.85, bestMatch.score + 0.2)
    finalMethod = analysis.texture === "foam" ? "texture" : "color"
    finalDetails = bestMatch.details
  } else {
    // Low confidence - use most common type based on characteristics
    if (analysis.texture === "foam" || (analysis.brightness > 0.9 && analysis.saturation < 0.1)) {
      finalType = "PS"
      finalConfidence = 0.5
      finalMethod = "texture"
      finalDetails = "Karakteristik styrofoam terdeteksi"
    } else if (analysis.transparency > 0.5) {
      finalType = "PET"
      finalConfidence = 0.5
      finalMethod = "color"
      finalDetails = "Material transparan terdeteksi"
    } else if (analysis.shape === "bag") {
      finalType = "LDPE"
      finalConfidence = 0.5
      finalMethod = "shape"
      finalDetails = "Bentuk kantong terdeteksi"
    } else {
      finalType = "PP"
      finalConfidence = 0.45
      finalMethod = "combined"
      finalDetails = "Klasifikasi umum berdasarkan karakteristik"
    }
  }

  const plasticInfo = PLASTIC_DATABASE[finalType]
  const objectName = getObjectName(finalType, filename, analysis)

  return {
    result: {
      type: finalType,
      plasticCode: plasticInfo.plasticCode,
      confidence: finalConfidence,
      method: finalMethod,
      details: finalDetails,
    },
    objects: [
      {
        name: objectName,
        ...plasticInfo,
      },
    ],
  }
}

function getObjectName(type: string, filename?: string, analysis?: ImageAnalysis): string {
  // Check filename for specific objects
  if (filename) {
    const name = filename.toLowerCase()
    if (name.includes("botol") || name.includes("bottle")) return "Botol Plastik"
    if (name.includes("aqua") || name.includes("mineral")) return "Botol Air Mineral"
    if (name.includes("sprite") || name.includes("fanta") || name.includes("coca")) return "Botol Minuman Soda"
    if (name.includes("sedotan") || name.includes("straw")) return "Sedotan Plastik"
    if (name.includes("kantong") || name.includes("kresek") || name.includes("bag")) return "Kantong Plastik"
    if (name.includes("gelas") || name.includes("cup")) return "Gelas Plastik"
    if (name.includes("tutup") || name.includes("cap") || name.includes("lid")) return "Tutup Botol"
    if (name.includes("styro") || name.includes("foam")) return "Wadah Styrofoam"
    if (name.includes("galon")) return "Galon Air"
    if (name.includes("deterjen") || name.includes("detergent")) return "Botol Deterjen"
    if (name.includes("sampo") || name.includes("shampoo")) return "Botol Sampo"
    if (name.includes("wadah") || name.includes("container")) return "Wadah Plastik"
  }

  // Use analysis to determine object name
  if (analysis) {
    if (analysis.texture === "foam") return "Wadah Styrofoam"
    if (analysis.shape === "bottle" && analysis.transparency > 0.5) return "Botol Plastik Transparan"
    if (analysis.shape === "bottle") return "Botol Plastik"
    if (analysis.shape === "bag") return "Kantong Plastik"
    if (analysis.shape === "cup") return "Gelas Plastik"
    if (analysis.shape === "container") return "Wadah Plastik"
    if (analysis.shape === "tube") return "Pipa/Selang Plastik"
  }

  // Default names by type
  const nameMap: Record<string, string> = {
    PET: "Botol Plastik PET",
    HDPE: "Wadah Plastik HDPE",
    PVC: "Produk PVC",
    LDPE: "Kantong Plastik",
    PP: "Wadah Plastik PP",
    PS: "Styrofoam",
    OTHER: "Plastik Campuran",
  }

  return nameMap[type] || "Plastik Tidak Dikenal"
}

// Legacy function for backward compatibility
export async function getDominantColor(dataUrl: string): Promise<{ r: number; g: number; b: number }> {
  const analysis = await analyzeImage(dataUrl)
  if (analysis.dominantColors.length > 0) {
    const c = analysis.dominantColors[0]
    return { r: c.r, g: c.g, b: c.b }
  }
  return { r: 200, g: 200, b: 200 }
}

export function getPlasticDatabase() {
  return PLASTIC_DATABASE
}
