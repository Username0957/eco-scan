type DetectedObject = {
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
    PET: "±450 tahun",
    HDPE: "±500 tahun",
    PVC: "≥1000 tahun",
    LDPE: "±500 tahun",
    PP: "±400 tahun",
    PS: "Tidak dapat terurai",
  }
  return map[type] ?? "Tidak diketahui"
}

export function getMicroplasticRisk(type: string): "Rendah" | "Sedang" | "Tinggi" {
  if (type === "PVC" || type === "PS") return "Tinggi"
  if (type === "PET" || type === "PP") return "Sedang"
  return "Rendah"
}

export function getEcoAlternative(type: string) {
  const map: Record<string, string> = {
    PET: "Tumbler stainless steel",
    HDPE: "Wadah kaca",
    PVC: "Hindari penggunaan",
    LDPE: "Tas belanja kain",
    PP: "Kotak makan reusable",
    PS: "Wadah bambu",
  }
  return map[type] ?? "Gunakan produk reusable"
}

export function getPlasticDescription(type: string) {
  return `Plastik jenis ${type} yang terdeteksi dari hasil pemindaian gambar.`
}

export function getEducationDescription(type: string) {
  return `Plastik ${type} membutuhkan waktu sangat lama untuk terurai dan berpotensi mencemari lingkungan serta laut.`
}

export function getEducationTips(type: string) {
  return [
    "Kurangi penggunaan plastik sekali pakai",
    "Gunakan alternatif ramah lingkungan",
    "Setor ke bank sampah atau fasilitas daur ulang",
  ]
}
