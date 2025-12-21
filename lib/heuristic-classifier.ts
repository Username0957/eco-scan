// Heuristic Classifier FINAL
// Offline plastic waste classification (no AI cloud)
// Optimized for real-world trash images

import type { DetectedObject } from "./types"

/* ===================== TYPES ===================== */

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

/* ===================== DATABASE ===================== */

const PLASTIC_DATABASE: Record<string, Omit<DetectedObject, "name">> = {
  PET: {
    plasticType: "PET (Polyethylene Terephthalate)",
    plasticCode: "1",
    decompositionTime: "450 tahun",
    microplasticRisk: "Tinggi",
    ecoAlternative: "Botol kaca / stainless",
    description: "Plastik bening untuk botol minuman",
  },
  HDPE: {
    plasticType: "HDPE",
    plasticCode: "2",
    decompositionTime: "500 tahun",
    microplasticRisk: "Sedang",
    ecoAlternative: "Wadah kaca",
    description: "Plastik tebal seperti galon dan deterjen",
  },
  PVC: {
    plasticType: "PVC",
    plasticCode: "3",
    decompositionTime: "1000+ tahun",
    microplasticRisk: "Tinggi",
    ecoAlternative: "Material alami",
    description: "Plastik konstruksi berbahaya",
  },
  LDPE: {
    plasticType: "LDPE",
    plasticCode: "4",
    decompositionTime: "500 tahun",
    microplasticRisk: "Sedang",
    ecoAlternative: "Tas kain",
    description: "Kantong plastik",
  },
  PP: {
    plasticType: "PP",
    plasticCode: "5",
    decompositionTime: "500 tahun",
    microplasticRisk: "Sedang",
    ecoAlternative: "Wadah kaca / bambu",
    description: "Wadah makanan & sedotan",
  },
  PS: {
    plasticType: "PS (Styrofoam)",
    plasticCode: "6",
    decompositionTime: "500–1000 tahun",
    microplasticRisk: "Tinggi",
    ecoAlternative: "Wadah kertas / daun",
    description: "Styrofoam putih rapuh",
  },
}

/* ===================== IMAGE ANALYSIS ===================== */

export async function analyzeImage(dataUrl: string): Promise<ImageAnalysis> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      const size = 96
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")
      if (!ctx) return resolve(defaultAnalysis())

      ctx.drawImage(img, 0, 0, size, size)
      const { data } = ctx.getImageData(0, 0, size, size)

      let brightness = 0
      let saturation = 0
      let transparent = 0
      let edge = 0
      let variance = 0
      let count = 0

      const colors = new Map<string, { r: number; g: number; b: number; c: number }>()

      for (let y = 1; y < size; y++) {
        for (let x = 1; x < size; x++) {
          const i = (y * size + x) * 4
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]

          const br = (r + g + b) / 765
          brightness += br

          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          const sat = max === 0 ? 0 : (max - min) / max
          saturation += sat

          if (a < 180) transparent++

          const pi = ((y - 1) * size + (x - 1)) * 4
          const diff = Math.abs(r - data[pi]) + Math.abs(g - data[pi + 1]) + Math.abs(b - data[pi + 2])
          variance += diff
          if (diff > 60) edge++

          const qr = Math.floor(r / 32) * 32
          const qg = Math.floor(g / 32) * 32
          const qb = Math.floor(b / 32) * 32
          const key = `${qr},${qg},${qb}`
          const c = colors.get(key)
          c ? c.c++ : colors.set(key, { r, g, b, c: 1 })

          count++
        }
      }

      const dominantColors = [...colors.values()]
        .sort((a, b) => b.c - a.c)
        .slice(0, 5)
        .map((c) => ({
          r: Math.round(c.r),
          g: Math.round(c.g),
          b: Math.round(c.b),
          percentage: c.c / count,
        }))

      const avgB = brightness / count
      const avgS = saturation / count
      const avgV = variance / count
      const edgeRatio = edge / count
      const transRatio = transparent / count

      let texture: ImageAnalysis["texture"] =
        avgV > 35 && avgB > 0.85 && avgS < 0.1
          ? "foam"
          : avgV < 12 && avgB > 0.75
          ? "glossy"
          : avgV > 25
          ? "textured"
          : "matte"

      let shape: ImageAnalysis["shape"] =
        transRatio > 0.45 && edgeRatio < 0.18
          ? "bottle"
          : edgeRatio < 0.12 && avgV < 18
          ? "bag"
          : edgeRatio > 0.35
          ? "irregular"
          : "container"

      resolve({
        dominantColors,
        brightness: avgB,
        saturation: avgS,
        transparency: transRatio,
        texture,
        shape,
        edges: edgeRatio,
        colorVariance: avgV,
      })
    }

    img.onerror = () => resolve(defaultAnalysis())
    img.src = dataUrl
  })
}

function defaultAnalysis(): ImageAnalysis {
  return {
    dominantColors: [{ r: 200, g: 200, b: 200, percentage: 1 }],
    brightness: 0.5,
    saturation: 0.3,
    transparency: 0.3,
    texture: "matte",
    shape: "irregular",
    edges: 0.25,
    colorVariance: 20,
  }
}

/* ===================== CLASSIFIER ===================== */

export async function classifyImageHeuristic(
  dataUrl: string,
  filename?: string,
): Promise<{ result: HeuristicResult; objects: DetectedObject[] }> {
  const analysis = await analyzeImage(dataUrl)

  /* === STRONG STYROFOAM OVERRIDE === */
  if (analysis.texture === "foam" && analysis.brightness > 0.85 && analysis.saturation < 0.1) {
    return {
      result: {
        type: "PS",
        plasticCode: "6",
        confidence: 0.9,
        method: "texture",
        details: "Styrofoam putih bertekstur foam terdeteksi",
      },
      objects: [{ name: "Wadah Styrofoam", ...PLASTIC_DATABASE.PS }],
    }
  }

  let type: keyof typeof PLASTIC_DATABASE = "PP"
  let confidence = 0.5
  let method: HeuristicResult["method"] = "combined"

  if (analysis.transparency > 0.5 && analysis.texture === "glossy") {
    type = "PET"
    confidence = 0.75
    method = "color"
  } else if (analysis.shape === "bag") {
    type = "LDPE"
    confidence = 0.7
    method = "shape"
  } else if (analysis.shape === "container" && analysis.texture !== "glossy") {
    type = "PP"
    confidence = 0.65
  } else if (analysis.texture === "textured") {
    type = "HDPE"
    confidence = 0.6
  }

  if (analysis.colorVariance > 40 || analysis.edges > 0.4) confidence *= 0.85

  return {
    result: {
      type,
      plasticCode: PLASTIC_DATABASE[type].plasticCode,
      confidence,
      method,
      details: `Texture: ${analysis.texture}, Shape: ${analysis.shape}`,
    },
    objects: [{ name: getObjectName(type, analysis), ...PLASTIC_DATABASE[type] }],
  }
}

function getObjectName(type: string, analysis: ImageAnalysis): string {
  if (analysis.texture === "foam") return "Wadah Styrofoam"
  if (analysis.shape === "bag") return "Kantong Plastik"
  if (analysis.shape === "bottle") return "Botol Plastik"
  if (analysis.shape === "container") return "Wadah Plastik"
  return type
}

export function getPlasticDatabase() {
  return PLASTIC_DATABASE
}
