// Eco Score calculation for educational purposes (not gamification)
// Scores based on environmental impact

import type { DetectedObject } from "./types"

export interface EcoScore {
  score: number // 0-100
  level: "Buruk untuk lingkungan" | "Perlu dikurangi" | "Lebih ramah"
  color: string
  explanation: string
  confidence: number
}

export function calculateEcoScore(obj: DetectedObject, confidence: number): EcoScore {
  let score = 50 // Base score

  // 1. Plastic type impact (40 points)
  const plasticCode = obj.plasticCode
  const plasticScores: Record<string, number> = {
    "1": 60, // PET - recyclable but problematic
    "2": 70, // HDPE - better
    "3": 20, // PVC - very bad
    "4": 50, // LDPE - medium
    "5": 70, // PP - better
    "6": 10, // PS - very bad (styrofoam)
    "7": 30, // Other - unknown mix
  }
  score = plasticScores[plasticCode] || 50

  // 2. Microplastic risk (30 points)
  const riskPenalty: Record<string, number> = {
    Rendah: 0,
    Sedang: -15,
    Tinggi: -30,
  }
  score += riskPenalty[obj.microplasticRisk] || -15

  // 3. Decomposition time (20 points)
  if (obj.decompositionTime.includes("1000")) {
    score -= 20
  } else if (obj.decompositionTime.includes("500")) {
    score -= 10
  } else if (obj.decompositionTime.includes("450")) {
    score -= 5
  }

  // 4. Confidence penalty (10 points)
  if (confidence < 0.6) {
    score -= 10
  } else if (confidence < 0.7) {
    score -= 5
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score))

  // Determine level
  let level: EcoScore["level"]
  let color: string
  let explanation: string

  if (score < 40) {
    level = "Buruk untuk lingkungan"
    color = "#ef4444" // red
    explanation =
      "Plastik ini sangat berbahaya bagi lingkungan. Waktu dekomposisinya sangat lama dan berisiko tinggi menghasilkan mikroplastik. Sebisa mungkin hindari penggunaan."
  } else if (score < 65) {
    level = "Perlu dikurangi"
    color = "#f59e0b" // yellow/orange
    explanation =
      "Plastik ini memiliki dampak lingkungan yang cukup besar. Meskipun bisa didaur ulang, lebih baik dikurangi penggunaannya dan cari alternatif yang lebih ramah lingkungan."
  } else {
    level = "Lebih ramah"
    color = "#22c55e" // green
    explanation =
      "Plastik ini relatif lebih aman dibanding jenis lain. Namun, tetap perlu didaur ulang dengan benar dan sebaiknya diganti dengan alternatif non-plastik jika memungkinkan."
  }

  return {
    score,
    level,
    color,
    explanation,
    confidence,
  }
}

export function calculateAverageEcoScore(scores: EcoScore[]): EcoScore {
  if (scores.length === 0) {
    return {
      score: 50,
      level: "Perlu dikurangi",
      color: "#f59e0b",
      explanation: "Tidak ada data untuk dihitung",
      confidence: 0,
    }
  }

  const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length
  const avgConfidence = scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length

  let level: EcoScore["level"]
  let color: string
  let explanation: string

  if (avgScore < 40) {
    level = "Buruk untuk lingkungan"
    color = "#ef4444"
    explanation = `Rata-rata sampah plastik yang terdeteksi memiliki dampak buruk terhadap lingkungan.`
  } else if (avgScore < 65) {
    level = "Perlu dikurangi"
    color = "#f59e0b"
    explanation = `Penggunaan plastik jenis ini sebaiknya dikurangi untuk mengurangi dampak lingkungan.`
  } else {
    level = "Lebih ramah"
    color = "#22c55e"
    explanation = `Plastik yang terdeteksi relatif lebih aman, namun tetap perlu pengelolaan yang baik.`
  }

  return {
    score: Math.round(avgScore),
    level,
    color,
    explanation,
    confidence: avgConfidence,
  }
}
