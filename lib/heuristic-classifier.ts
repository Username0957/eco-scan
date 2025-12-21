/* =========================================================
   HEURISTIC + TEACHABLE MACHINE HYBRID CLASSIFIER (FINAL)
   =========================================================
   - Offline-first
   - No cloud AI dependency
   - Teachable Machine = heuristic signal (NOT decision maker)
   - Designed for eco-education app
========================================================= */

import * as tmImage from "@teachablemachine/image"

/* =======================
   TYPES
======================= */

export type PlasticType =
  | "PET"
  | "HDPE"
  | "LDPE"
  | "PP"
  | "PS"
  | "NON_PLASTIC"
  | "PVC"

export interface VisualFeatures {
  brightness: number
  saturation: number
  contrast: number
  edgeDensity: number
  transparency: number
}

interface TMPrediction {
  className: string
  probability: number
}


export interface TMSignal {
  material: PlasticType
  confidence: number
}

export interface ClassificationResult {
  material: PlasticType
  confidence: number
  ecoScore: number
  reasoning: string[]
}

/* =======================
   ECO DATABASE
======================= */

const ECO_DB: Record<PlasticType, { score: number; label: string }> = {
  PET: { score: 55, label: "Sulit terurai" },
  HDPE: { score: 60, label: "Lebih aman, masih plastik" },
  LDPE: { score: 40, label: "Plastik sekali pakai" },
  PP: { score: 65, label: "Relatif aman" },
  PS: { score: 20, label: "Sangat berbahaya" },
  NON_PLASTIC: { score: 90, label: "Ramah lingkungan" },
  PVC: { score: 15, label: "Sangat berbahaya" },
}

/* =======================
   TEACHABLE MACHINE LOADER
======================= */

let tmModel: tmImage.CustomMobileNet | null = null

async function loadTMModel() {
  if (tmModel) return tmModel

  tmModel = await tmImage.load(
    "/tm-my-image-model/model.json",
    "/tm-my-image-model/metadata.json"
  )

  return tmModel
}

async function extractTMSignal(
  imageEl: HTMLImageElement
): Promise<TMSignal> {
  const model = await loadTMModel()
  const predictions = await model.predict(imageEl)

 const best = (predictions as TMPrediction[])
  .sort(
    (a: TMPrediction, b: TMPrediction) =>
      b.probability - a.probability
  )[0]




  return {
    material: best.className as PlasticType,
    confidence: best.probability,
  }
}

/* =======================
   HEURISTIC VISUAL FEATURES
======================= */

export function extractVisualFeatures(
  imageData: ImageData
): VisualFeatures {
  let totalBrightness = 0
  let totalSaturation = 0
  let edges = 0
  let transparent = 0

  const { data, width, height } = imageData

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)

    totalBrightness += (r + g + b) / 3 / 255
    totalSaturation += max === 0 ? 0 : (max - min) / max

    if (a < 200 || (max > 240 && totalSaturation < 0.1)) {
      transparent++
    }

    if (i > 4) {
      const diff =
        Math.abs(r - data[i - 4]) +
        Math.abs(g - data[i - 3]) +
        Math.abs(b - data[i - 2])
      if (diff > 40) edges++
    }
  }

  const pixels = width * height

  return {
    brightness: totalBrightness / pixels,
    saturation: totalSaturation / pixels,
    contrast: edges / pixels,
    edgeDensity: edges / pixels,
    transparency: transparent / pixels,
  }
}

/* =======================
   FUSION HEURISTIC ENGINE
======================= */

function classifyMaterial(
  visual: VisualFeatures,
  tm: TMSignal | null
): ClassificationResult {
  const scores: Record<PlasticType, number> = {
    PET: 0,
    HDPE: 0,
    LDPE: 0,
    PP: 0,
    PS: 0,
    NON_PLASTIC: 0,
    PVC: 0,
  }

  const reasoning: string[] = []

  /* ----- Heuristic Rules ----- */

  if (visual.transparency > 0.45) {
    scores.PET += 0.4
    scores.PP += 0.2
    reasoning.push("Objek transparan terdeteksi")
  }

  if (visual.edgeDensity < 0.25 && visual.contrast < 0.3) {
    scores.LDPE += 0.45
    reasoning.push("Permukaan fleksibel & tipis")
  }

  if (visual.edgeDensity > 0.6) {
    scores.HDPE += 0.4
    reasoning.push("Struktur keras & tebal")
  }

  if (visual.saturation < 0.15 && visual.contrast < 0.2) {
    scores.PS += 0.5
    reasoning.push("Ciri styrofoam terdeteksi")
  }

  /* ----- TM as Heuristic Signal ----- */

  if (tm) {
    reasoning.push(
      `Model visual mendeteksi ${tm.material} (${(
        tm.confidence * 100
      ).toFixed(0)}%)`
    )

    scores[tm.material] += tm.confidence * 0.5

    Object.keys(scores).forEach((k) => {
      if (k !== tm.material) {
        scores[k as PlasticType] -= tm.confidence * 0.1
      }
    })

    if (tm.material === "NON_PLASTIC" && tm.confidence > 0.8) {
      scores.NON_PLASTIC += 0.6
      reasoning.push("Kemungkinan besar bukan plastik")
    }
  }

  /* ----- Final Decision ----- */

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [material, rawScore] = sorted[0]

  return {
    material: material as PlasticType,
    confidence: Math.min(0.95, Math.max(0.4, rawScore)),
    ecoScore: ECO_DB[material as PlasticType].score,
    reasoning,
  }
}

/* =======================
   MAIN ENTRY POINT
======================= */

export async function analyzeImageHybrid(
  imageData: ImageData,
  imageEl: HTMLImageElement
): Promise<ClassificationResult> {
  const visual = extractVisualFeatures(imageData)
  const tmSignal = await extractTMSignal(imageEl)

  return classifyMaterial(visual, tmSignal)
}

// Backward compatibility for existing code
export async function classifyImageHeuristic(
  imageData: ImageData,
  imageEl: HTMLImageElement
) {
  return analyzeImageHybrid(imageData, imageEl)
}
