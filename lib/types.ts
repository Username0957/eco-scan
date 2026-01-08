type DetectedObject = {
  name: string
  plasticType: string
  plasticCode: string
  decompositionTime: string
  microplasticRisk: "Low" | "Medium" | "High"
  ecoAlternative: string
  description: string
}

export interface EducationInfo {
  title: string
  description: string
  tips: string[]
}

export interface ScanResult {
  id?: string
  objects: DetectedObject[]
  education: EducationInfo
  totalObjects: number
  scanDate: string
  userId?: string
  provider?: "openai" | "gemini" | "local" | "heuristic"
  analysisMode?: "text" | "vision" | "local" | "heuristic"
}

export interface GlobalStats {
  totalScans: number
  totalObjectsDetected: number
  plasticCategoryCounts: Record<string, number>
  lastUpdate: string
}

export interface UserStats {
  userId: string
  scanCount: number
  lastScan: string
  lastCategories: string[]
}

export interface FirestoreScanDocument {
  objects: DetectedObject[]
  education: EducationInfo
  totalObjects: number
  scanDate: string
  userId: string
  createdAt: Date
}

export interface FirestoreGlobalStats {
  totalScans: number
  totalObjectsDetected: number
  plasticCategoryCounts: Record<string, number>
  lastUpdate: Date
}

// heuristic/types.ts
export interface VisualFeatures {
  brightness: number
  saturation: number
  contrast: number
  edgeDensity: number
  transparencyScore: number
}

export interface TMSignal {
  material: "PET" | "HDPE" | "LDPE" | "PP" | "PS" | "NON_PLASTIC" | "PVC"
  confidence: number
}

export interface HeuristicInput {
  visual: VisualFeatures
  tm: TMSignal | null
}

export interface ClassificationResult {
  material: string
  confidence: number
  reasoning: string[]
}

export function mapPlasticCode(type: string) {
  const map: Record<string, string> = {
    PET: "1",
    HDPE: "2",
    PVC: "3",
    LDPE: "4",
    PP: "5",
    PS: "6",
  }
  return map[type] ?? "-"
}

export function getDecompositionTime(type: string) {
  const map: Record<string, string> = {
    PET: "±450 years",
    HDPE: "±500 years",
    PVC: "≥1000 years",
    LDPE: "±500 years",
    PP: "±400 years",
    PS: "Cannot decompose",
  }
  return map[type] ?? "Unknown"
}

export function getMicroplasticRisk(type: string): "Low" | "Medium" | "High" {
  if (type === "PVC" || type === "PS") return "High"
  if (type === "PET" || type === "PP") return "Medium"
  return "Low"
}

export function getEcoAlternative(type: string) {
  const map: Record<string, string> = {
    PET: "Stainless steel tumbler",
    HDPE: "Glass container",
    PVC: "Avoid use",
    LDPE: "Cloth shopping bag",
    PP: "Reusable food container",
    PS: "Bamboo container",
  }
  return map[type] ?? "Use reusable products"
}

export function getPlasticDescription(type: string) {
  return `Plastic type ${type} detected from image scan.`
}

export function getEducationDescription(type: string) {
  return `Plastic ${type} requires an extremely long time to decompose and has potential to contaminate the environment and oceans.`
}

export function getEducationTips(type: string) {
  return [
    "Reduce single-use plastic consumption",
    "Use eco-friendly alternatives",
    "Send to recycling centers or waste banks",
  ]
}
