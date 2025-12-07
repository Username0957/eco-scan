import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { updateGlobalStats, saveScanResult } from "@/lib/firestore"
import { checkRateLimit, hashImage, getCachedResult, setCachedResult } from "@/lib/rate-limit"
import type { ScanResult } from "@/lib/types"

const RATE_LIMIT_CONFIG = {
  maxRequests: 10,
  windowMs: 60 * 1000,
}

const TEXT_ANALYSIS_PROMPT = `Kamu adalah sistem klasifikasi sampah non-organik yang canggih. Berdasarkan deskripsi visual gambar yang diberikan, identifikasi objek sampah plastik/non-organik yang kemungkinan ada.

Untuk setiap objek yang terdeteksi, berikan informasi berikut:
1. Nama objek (contoh: botol plastik, sedotan, kantong plastik)
2. Jenis plastik (contoh: PET, HDPE, PVC, LDPE, PP, PS, Other)
3. Kode plastik (1-7)
4. Estimasi waktu terurai di alam
5. Tingkat risiko mikroplastik (Rendah/Sedang/Tinggi)
6. Rekomendasi alternatif ramah lingkungan
7. Deskripsi singkat tentang dampak lingkungan

PENTING: Respons HARUS dalam format JSON yang valid seperti berikut:
{
  "objects": [
    {
      "name": "nama objek",
      "plasticType": "jenis plastik",
      "plasticCode": "kode (1-7)",
      "decompositionTime": "waktu terurai",
      "microplasticRisk": "Rendah/Sedang/Tinggi",
      "ecoAlternative": "alternatif ramah lingkungan",
      "description": "deskripsi dampak lingkungan"
    }
  ],
  "education": {
    "title": "judul edukasi",
    "description": "deskripsi edukasi",
    "tips": ["tip 1", "tip 2", "tip 3"]
  }
}`

const VISION_ANALYSIS_PROMPT = `Kamu adalah sistem klasifikasi sampah non-organik. Analisis gambar ini dan identifikasi semua objek sampah plastik/non-organik.

Untuk setiap objek, berikan: nama, jenis plastik, kode (1-7), waktu terurai, risiko mikroplastik, alternatif ramah lingkungan, dan dampak lingkungan.

Respons dalam format JSON:
{
  "objects": [{"name": "", "plasticType": "", "plasticCode": "", "decompositionTime": "", "microplasticRisk": "", "ecoAlternative": "", "description": ""}],
  "education": {"title": "", "description": "", "tips": []}
}`

async function callTextAI(visualDescription: string) {
  return await generateText({
    model: "anthropic/claude-sonnet-4-20250514",
    messages: [
      {
        role: "user",
        content: `${TEXT_ANALYSIS_PROMPT}\n\nDeskripsi Visual:\n${visualDescription}`,
      },
    ],
    temperature: 0.3,
  })
}

async function callVisionAI(thumbnailBase64: string) {
  return await generateText({
    model: "anthropic/claude-sonnet-4-20250514",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: VISION_ANALYSIS_PROMPT },
          { type: "image", image: thumbnailBase64 },
        ],
      },
    ],
    temperature: 0.3,
  })
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  if (forwarded) return forwarded.split(",")[0].trim()
  if (realIP) return realIP
  return "unknown"
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan. Silakan tunggu ${rateLimitResult.retryAfter} detik.`,
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        },
      )
    }

    const { visualDescription, estimatedObjects, confidence, thumbnailBase64, userId } = await request.json()

    if (!visualDescription) {
      return NextResponse.json({ error: "Deskripsi visual tidak ditemukan" }, { status: 400 })
    }

    // Check cache based on visual description hash
    const descHash = hashImage(visualDescription)
    const cachedResult = getCachedResult(descHash)
    if (cachedResult) {
      return NextResponse.json(
        { ...(cachedResult as object), cached: true },
        {
          headers: { "X-RateLimit-Remaining": String(rateLimitResult.remaining) },
        },
      )
    }

    let text: string | undefined
    let usedMode: "text" | "vision" = "text"

    try {
      console.log("[v0] Trying Vercel AI Gateway text analysis...")
      const result = await callTextAI(visualDescription)
      text = result.text
      usedMode = "text"
      console.log("[v0] Vercel AI Gateway text analysis success")
    } catch (error) {
      console.error("[v0] Text analysis failed:", error)
    }

    // If text analysis failed and confidence is low, try vision with thumbnail
    if (!text && confidence < 0.6 && thumbnailBase64) {
      try {
        console.log("[v0] Trying Vercel AI Gateway vision analysis...")
        const result = await callVisionAI(thumbnailBase64)
        text = result.text
        usedMode = "vision"
        console.log("[v0] Vercel AI Gateway vision analysis success")
      } catch (error) {
        console.error("[v0] Vision analysis failed:", error)
      }
    }

    // Fallback to local/heuristic response if AI fails
    if (!text && estimatedObjects && estimatedObjects.length > 0) {
      const basicResult = generateBasicResponse(estimatedObjects)
      return NextResponse.json(basicResult, {
        headers: { "X-RateLimit-Remaining": String(rateLimitResult.remaining) },
      })
    }

    if (!text) {
      return NextResponse.json({ error: "Tidak dapat menganalisis gambar. Silakan coba lagi nanti." }, { status: 503 })
    }

    // Parse JSON from response
    let result
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON found")
      }
    } catch {
      result = {
        objects: [],
        education: {
          title: "Hasil Analisis",
          description: text.substring(0, 500),
          tips: [
            "Pisahkan sampah berdasarkan jenisnya",
            "Cuci bersih wadah plastik sebelum didaur ulang",
            "Kurangi plastik sekali pakai",
          ],
        },
      }
    }

    const scanResult: ScanResult = {
      ...result,
      totalObjects: result.objects?.length || 0,
      scanDate: new Date().toISOString(),
      userId: userId || "anonymous",
      provider: "vercel",
      analysisMode: usedMode,
    }

    setCachedResult(descHash, scanResult)

    try {
      await Promise.all([saveScanResult(scanResult, userId), updateGlobalStats(scanResult)])
    } catch (firestoreError) {
      console.error("Firestore error:", firestoreError)
    }

    return NextResponse.json(scanResult, {
      headers: { "X-RateLimit-Remaining": String(rateLimitResult.remaining) },
    })
  } catch (error) {
    console.error("Scan API Error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan saat memproses permintaan" }, { status: 500 })
  }
}

function generateBasicResponse(estimatedObjects: string[]): ScanResult {
  const plasticDatabase: Record<
    string,
    {
      plasticType: string
      plasticCode: string
      decompositionTime: string
      microplasticRisk: "Rendah" | "Sedang" | "Tinggi"
      ecoAlternative: string
      description: string
    }
  > = {
    "botol plastik transparan": {
      plasticType: "PET",
      plasticCode: "1",
      decompositionTime: "450 tahun",
      microplasticRisk: "Sedang",
      ecoAlternative: "Botol kaca atau stainless steel",
      description: "PET dapat didaur ulang namun sering berakhir di lautan",
    },
    "botol air mineral": {
      plasticType: "PET",
      plasticCode: "1",
      decompositionTime: "450 tahun",
      microplasticRisk: "Sedang",
      ecoAlternative: "Tumbler atau botol minum reusable",
      description: "Salah satu penyumbang sampah plastik terbesar",
    },
    "kantong plastik": {
      plasticType: "LDPE",
      plasticCode: "4",
      decompositionTime: "500-1000 tahun",
      microplasticRisk: "Tinggi",
      ecoAlternative: "Tas kain atau tas belanja reusable",
      description: "Sangat berbahaya bagi kehidupan laut",
    },
    "wadah plastik putih": {
      plasticType: "PP",
      plasticCode: "5",
      decompositionTime: "20-30 tahun",
      microplasticRisk: "Rendah",
      ecoAlternative: "Wadah kaca atau stainless steel",
      description: "Relatif aman tapi tetap perlu didaur ulang",
    },
    "tutup botol": {
      plasticType: "HDPE",
      plasticCode: "2",
      decompositionTime: "450 tahun",
      microplasticRisk: "Rendah",
      ecoAlternative: "Tutup botol berbahan bambu",
      description: "Dapat didaur ulang dengan baik",
    },
    sedotan: {
      plasticType: "PP",
      plasticCode: "5",
      decompositionTime: "200 tahun",
      microplasticRisk: "Tinggi",
      ecoAlternative: "Sedotan bambu atau stainless steel",
      description: "Sering ditemukan di perut hewan laut",
    },
    "galon air": {
      plasticType: "PC",
      plasticCode: "7",
      decompositionTime: "500+ tahun",
      microplasticRisk: "Sedang",
      ecoAlternative: "Galon kaca atau sistem refill",
      description: "Dapat digunakan ulang berkali-kali",
    },
  }

  const objects = estimatedObjects.map((obj) => {
    const lowerObj = obj.toLowerCase()
    for (const [key, data] of Object.entries(plasticDatabase)) {
      if (lowerObj.includes(key) || key.includes(lowerObj)) {
        return { name: obj, ...data }
      }
    }
    return {
      name: obj,
      plasticType: "Unknown",
      plasticCode: "7",
      decompositionTime: "100-500 tahun",
      microplasticRisk: "Sedang" as const,
      ecoAlternative: "Pilih alternatif ramah lingkungan",
      description: "Jenis plastik tidak teridentifikasi dengan pasti",
    }
  })

  return {
    objects,
    education: {
      title: "Tips Pengelolaan Sampah Plastik",
      description:
        "Hasil analisis berdasarkan deteksi visual lokal. Untuk hasil lebih akurat, coba lagi nanti saat layanan AI tersedia.",
      tips: [
        "Pisahkan sampah berdasarkan kode plastiknya (1-7)",
        "Cuci bersih wadah plastik sebelum didaur ulang",
        "Kurangi penggunaan plastik sekali pakai",
        "Pilih produk dengan kemasan yang dapat didaur ulang",
      ],
    },
    totalObjects: objects.length,
    scanDate: new Date().toISOString(),
    userId: "anonymous",
    provider: "local",
    analysisMode: "local",
  }
}
