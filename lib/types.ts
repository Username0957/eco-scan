export interface DetectedObject {
  name: string
  plasticType: string
  plasticCode: string
  decompositionTime: string
  microplasticRisk: "Rendah" | "Sedang" | "Tinggi"
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
  analysisMode?: "text" | "vision" | "local" | "heuristic";
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
