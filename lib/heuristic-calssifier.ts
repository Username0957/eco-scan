// Heuristic Classifier - Klasifikasi plastik tanpa AI cloud
// Berdasarkan prototype Plastigram dengan logika yang lebih lengkap

import type { DetectedObject } from "./types"

export interface HeuristicResult {
  type: string
  plasticCode: string
  confidence: number
  method: "filename" | "color" | "combined"
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

// Keyword signatures untuk deteksi dari nama file
const FILENAME_SIGNATURES: { keywords: string[]; type: keyof typeof PLASTIC_DATABASE }[] = [
  { keywords: ["botol", "aqua", "sprite", "coca", "fanta", "mineral", "pet", "bottle"], type: "PET" },
  { keywords: ["galon", "jerigen", "hdpe", "susu", "deterjen"], type: "HDPE" },
  { keywords: ["pipa", "pvc", "vinyl", "selang"], type: "PVC" },
  { keywords: ["kresek", "kantong", "plastik", "wrap", "ldpe", "bag"], type: "LDPE" },
  { keywords: ["sedotan", "straw", "tutup", "pp", "cup", "gelas"], type: "PP" },
  { keywords: ["styro", "foam", "gabus", "ps", "styrofoam", "busa"], type: "PS" },
]

// Color signatures untuk deteksi dari warna dominan
interface ColorSignature {
  ranges: { r: [number, number]; g: [number, number]; b: [number, number] }
  type: keyof typeof PLASTIC_DATABASE
  confidence: number
}

const COLOR_SIGNATURES: ColorSignature[] = [
  // Putih/Transparan -> biasanya PET atau PS
  { ranges: { r: [200, 255], g: [200, 255], b: [200, 255] }, type: "PS", confidence: 0.6 },
  // Transparan kebiruan -> PET
  { ranges: { r: [150, 220], g: [180, 240], b: [200, 255] }, type: "PET", confidence: 0.65 },
  // Hitam -> LDPE atau OTHER
  { ranges: { r: [0, 60], g: [0, 60], b: [0, 60] }, type: "LDPE", confidence: 0.5 },
  // Hijau -> PET (botol sprite)
  { ranges: { r: [0, 100], g: [150, 255], b: [0, 100] }, type: "PET", confidence: 0.7 },
  // Biru -> PET atau HDPE
  { ranges: { r: [0, 100], g: [100, 200], b: [150, 255] }, type: "PET", confidence: 0.65 },
  // Merah -> PP (tutup)
  { ranges: { r: [180, 255], g: [0, 80], b: [0, 80] }, type: "PP", confidence: 0.6 },
  // Kuning/Oranye -> LDPE atau PP
  { ranges: { r: [200, 255], g: [150, 220], b: [0, 80] }, type: "LDPE", confidence: 0.55 },
]

export function classifyByFilename(filename: string): HeuristicResult | null {
  const name = filename.toLowerCase()

  for (const sig of FILENAME_SIGNATURES) {
    for (const keyword of sig.keywords) {
      if (name.includes(keyword)) {
        return {
          type: sig.type,
          plasticCode: PLASTIC_DATABASE[sig.type].plasticCode,
          confidence: 0.75 + Math.random() * 0.15, // 75-90%
          method: "filename",
        }
      }
    }
  }

  return null
}

export function classifyByColor(dominantColor: { r: number; g: number; b: number }): HeuristicResult {
  for (const sig of COLOR_SIGNATURES) {
    if (
      dominantColor.r >= sig.ranges.r[0] &&
      dominantColor.r <= sig.ranges.r[1] &&
      dominantColor.g >= sig.ranges.g[0] &&
      dominantColor.g <= sig.ranges.g[1] &&
      dominantColor.b >= sig.ranges.b[0] &&
      dominantColor.b <= sig.ranges.b[1]
    ) {
      return {
        type: sig.type,
        plasticCode: PLASTIC_DATABASE[sig.type].plasticCode,
        confidence: sig.confidence + Math.random() * 0.1,
        method: "color",
      }
    }
  }

  // Default fallback
  return {
    type: "LDPE",
    plasticCode: "4",
    confidence: 0.4 + Math.random() * 0.1,
    method: "color",
  }
}

export async function getDominantColor(dataUrl: string): Promise<{ r: number; g: number; b: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = 40
      canvas.height = 40
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve({ r: 200, g: 200, b: 200 })
        return
      }
      ctx.drawImage(img, 0, 0, 40, 40)
      const data = ctx.getImageData(0, 0, 40, 40).data
      let r = 0,
        g = 0,
        b = 0,
        count = 0
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
        count++
      }
      resolve({
        r: Math.round(r / count),
        g: Math.round(g / count),
        b: Math.round(b / count),
      })
    }
    img.onerror = () => resolve({ r: 200, g: 200, b: 200 })
    img.src = dataUrl
  })
}

export async function classifyImageHeuristic(
  dataUrl: string,
  filename?: string,
): Promise<{ result: HeuristicResult; objects: DetectedObject[] }> {
  // 1. Coba deteksi dari nama file dulu
  if (filename) {
    const filenameResult = classifyByFilename(filename)
    if (filenameResult && filenameResult.confidence > 0.7) {
      const plasticInfo = PLASTIC_DATABASE[filenameResult.type]
      return {
        result: filenameResult,
        objects: [
          {
            name: getObjectName(filenameResult.type, filename),
            ...plasticInfo,
          },
        ],
      }
    }
  }

  // 2. Fallback ke deteksi warna
  const dominantColor = await getDominantColor(dataUrl)
  const colorResult = classifyByColor(dominantColor)

  // 3. Kombinasikan jika ada filename result dengan confidence lebih rendah
  if (filename) {
    const filenameResult = classifyByFilename(filename)
    if (filenameResult) {
      // Rata-rata confidence
      colorResult.confidence = (colorResult.confidence + filenameResult.confidence) / 2
      colorResult.method = "combined"
      // Gunakan type dari filename jika ada
      colorResult.type = filenameResult.type
      colorResult.plasticCode = filenameResult.plasticCode
    }
  }

  const plasticInfo = PLASTIC_DATABASE[colorResult.type]
  return {
    result: colorResult,
    objects: [
      {
        name: getObjectName(colorResult.type, filename),
        ...plasticInfo,
      },
    ],
  }
}

function getObjectName(type: string, filename?: string): string {
  const nameMap: Record<string, string> = {
    PET: "Botol Plastik PET",
    HDPE: "Wadah Plastik HDPE",
    PVC: "Pipa/Produk PVC",
    LDPE: "Kantong Plastik",
    PP: "Produk Polypropylene",
    PS: "Styrofoam",
    OTHER: "Plastik Campuran",
  }

  // Coba ekstrak nama dari filename
  if (filename) {
    const name = filename.toLowerCase()
    if (name.includes("botol")) return "Botol Plastik"
    if (name.includes("sedotan")) return "Sedotan Plastik"
    if (name.includes("kantong") || name.includes("kresek")) return "Kantong Plastik"
    if (name.includes("gelas") || name.includes("cup")) return "Gelas Plastik"
    if (name.includes("tutup")) return "Tutup Botol"
    if (name.includes("styro") || name.includes("foam")) return "Styrofoam"
  }

  return nameMap[type] || "Plastik Tidak Dikenal"
}

export function getPlasticDatabase() {
  return PLASTIC_DATABASE
}
