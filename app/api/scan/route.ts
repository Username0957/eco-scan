import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { updateGlobalStats, saveScanResult } from "@/lib/firestore"
import { checkRateLimit, hashImage, getCachedResult, setCachedResult } from "@/lib/rate-limit"
import type { ScanResult } from "@/lib/types"

const RATE_LIMIT_CONFIG = {
  maxRequests: 15,
  windowMs: 60 * 1000,
}

const VISION_ANALYSIS_PROMPT = `Kamu adalah sistem klasifikasi sampah non-organik. Analisis gambar ini dan identifikasi semua objek sampah plastik/non-organik.

Untuk setiap objek, berikan: nama, jenis plastik, kode (1-7), waktu terurai, risiko mikroplastik, alternatif ramah lingkungan, dan dampak lingkungan.

Respons dalam format JSON:
{
  "objects": [{"name": "", "plasticType": "", "plasticCode": "", "decompositionTime": "", "microplasticRisk": "Rendah/Sedang/Tinggi", "ecoAlternative": "", "description": ""}],
  "education": {"title": "", "description": "", "tips": []}
}`

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

    const { visualDescription, estimatedObjects, confidence, thumbnailBase64, userId, useAI } = await request.json()

    if (!visualDescription && !thumbnailBase64) {
      return NextResponse.json({ error: "Data gambar tidak ditemukan" }, { status: 400 })
    }

    // Check cache
    const descHash = hashImage(visualDescription || thumbnailBase64)
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
    let usedMode: "ai" | "local" = "local"

    const hasOpenAIKey = !!process.env.OPENAI_API_KEY

    if (useAI && hasOpenAIKey && thumbnailBase64) {
      try {
        console.log("[v0] Trying OpenAI vision analysis...")
        const result = await generateText({
          model: openai("gpt-4o"),
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
        text = result.text
        usedMode = "ai"
        console.log("[v0] OpenAI vision analysis success")
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error("[v0] OpenAI analysis failed:", errorMessage)
        // Fall through to heuristic
      }
    }

    if (!text) {
      console.log("[v0] Using heuristic classification")
      const basicResult = generateHeuristicResponse(estimatedObjects || ["sampah plastik"])
      basicResult.provider = "heuristic"
      basicResult.analysisMode = "local"

      try {
        await Promise.all([saveScanResult(basicResult, userId), updateGlobalStats(basicResult)])
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError)
      }

      setCachedResult(descHash, basicResult)

      return NextResponse.json(basicResult, {
        headers: { "X-RateLimit-Remaining": String(rateLimitResult.remaining) },
      })
    }

    // Parse JSON from AI response
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
      provider: "openai",
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

function generateHeuristicResponse(estimatedObjects: string[]): ScanResult {
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
      plasticType: "PET (Polyethylene Terephthalate)",
      plasticCode: "1",
      decompositionTime: "450 tahun",
      microplasticRisk: "Tinggi",
      ecoAlternative: "Botol kaca atau stainless steel",
      description:
        "PET dapat didaur ulang namun sering berakhir di lautan. Biasa digunakan untuk botol air mineral dan minuman ringan.",
    },
    "botol air mineral": {
      plasticType: "PET (Polyethylene Terephthalate)",
      plasticCode: "1",
      decompositionTime: "450 tahun",
      microplasticRisk: "Tinggi",
      ecoAlternative: "Tumbler atau botol minum reusable",
      description:
        "Salah satu penyumbang sampah plastik terbesar di Indonesia. Lebih dari 1 juta botol plastik terjual setiap menit di dunia.",
    },
    "botol plastik": {
      plasticType: "PET (Polyethylene Terephthalate)",
      plasticCode: "1",
      decompositionTime: "450 tahun",
      microplasticRisk: "Tinggi",
      ecoAlternative: "Botol stainless steel atau kaca",
      description: "Botol PET dapat didaur ulang menjadi serat tekstil, namun proses ini membutuhkan energi besar.",
    },
    "kantong plastik": {
      plasticType: "LDPE (Low-Density Polyethylene)",
      plasticCode: "4",
      decompositionTime: "500-1000 tahun",
      microplasticRisk: "Tinggi",
      ecoAlternative: "Tas kain atau tas belanja reusable",
      description: "Sangat berbahaya bagi kehidupan laut. Penyu sering mengira kantong plastik sebagai ubur-ubur.",
    },
    kresek: {
      plasticType: "LDPE (Low-Density Polyethylene)",
      plasticCode: "4",
      decompositionTime: "500-1000 tahun",
      microplasticRisk: "Tinggi",
      ecoAlternative: "Tas belanja kain atau jaring",
      description: "Rata-rata kantong plastik hanya digunakan 12 menit tapi butuh ratusan tahun untuk terurai.",
    },
    "wadah plastik putih": {
      plasticType: "PP (Polypropylene)",
      plasticCode: "5",
      decompositionTime: "20-30 tahun",
      microplasticRisk: "Sedang",
      ecoAlternative: "Wadah kaca atau stainless steel",
      description: "Relatif aman untuk makanan panas, tapi tetap perlu didaur ulang dengan benar.",
    },
    "tutup botol": {
      plasticType: "HDPE (High-Density Polyethylene)",
      plasticCode: "2",
      decompositionTime: "450 tahun",
      microplasticRisk: "Rendah",
      ecoAlternative: "Tutup botol berbahan bambu atau logam",
      description: "Dapat didaur ulang dengan baik. Pisahkan dari botol saat mendaur ulang.",
    },
    sedotan: {
      plasticType: "PP (Polypropylene)",
      plasticCode: "5",
      decompositionTime: "200 tahun",
      microplasticRisk: "Tinggi",
      ecoAlternative: "Sedotan bambu, stainless steel, atau kertas",
      description:
        "Sering ditemukan di perut hewan laut dan burung. Lebih dari 8 miliar sedotan mencemari pantai dunia.",
    },
    "gelas plastik": {
      plasticType: "PP (Polypropylene)",
      plasticCode: "5",
      decompositionTime: "450 tahun",
      microplasticRisk: "Sedang",
      ecoAlternative: "Gelas kaca atau tumbler reusable",
      description: "Banyak digunakan untuk minuman takeaway. Bawa tumbler sendiri untuk mengurangi sampah.",
    },
    "cup plastik": {
      plasticType: "PP (Polypropylene)",
      plasticCode: "5",
      decompositionTime: "450 tahun",
      microplasticRisk: "Sedang",
      ecoAlternative: "Tumbler atau gelas reusable",
      description: "Cup plastik sekali pakai berkontribusi besar pada sampah perkotaan.",
    },
    styrofoam: {
      plasticType: "PS (Polystyrene)",
      plasticCode: "6",
      decompositionTime: "500-1000 tahun",
      microplasticRisk: "Tinggi",
      ecoAlternative: "Wadah kertas atau daun pisang",
      description:
        "Sangat berbahaya karena mudah pecah menjadi jutaan partikel mikroplastik yang mencemari tanah dan air.",
    },
    "galon air": {
      plasticType: "PC (Polycarbonate)",
      plasticCode: "7",
      decompositionTime: "500+ tahun",
      microplasticRisk: "Sedang",
      ecoAlternative: "Galon kaca atau sistem refill",
      description: "Dapat digunakan ulang berkali-kali. Pastikan galon dalam kondisi baik dan tidak tergores.",
    },
    "plastik wrap": {
      plasticType: "LDPE (Low-Density Polyethylene)",
      plasticCode: "4",
      decompositionTime: "450 tahun",
      microplasticRisk: "Sedang",
      ecoAlternative: "Beeswax wrap atau tutup silikon",
      description: "Sulit didaur ulang karena tipis dan sering terkontaminasi makanan.",
    },
    "kemasan snack": {
      plasticType: "Other (Multilayer)",
      plasticCode: "7",
      decompositionTime: "500+ tahun",
      microplasticRisk: "Tinggi",
      ecoAlternative: "Snack dalam kemasan kertas atau bawa wadah sendiri",
      description: "Kemasan multilayer sangat sulit didaur ulang karena terdiri dari berbagai lapisan material.",
    },
  }

  const objects = estimatedObjects.map((obj) => {
    const lowerObj = obj.toLowerCase()
    for (const [key, data] of Object.entries(plasticDatabase)) {
      if (lowerObj.includes(key) || key.includes(lowerObj)) {
        return { name: obj, ...data }
      }
    }
    // Enhanced default response
    return {
      name: obj,
      plasticType: "Plastik Campuran",
      plasticCode: "7",
      decompositionTime: "100-500 tahun",
      microplasticRisk: "Sedang" as const,
      ecoAlternative: "Pilih alternatif ramah lingkungan yang dapat digunakan ulang",
      description:
        "Jenis plastik tidak teridentifikasi dengan pasti. Sebaiknya kurangi penggunaan dan daur ulang jika memungkinkan.",
    }
  })

  return {
    objects,
    education: {
      title: "Tips Pengelolaan Sampah Plastik",
      description:
        "Hasil analisis berdasarkan deteksi visual heuristic. Sistem mengidentifikasi jenis plastik berdasarkan karakteristik visual objek.",
      tips: [
        "Pisahkan sampah berdasarkan kode plastiknya (1-7)",
        "Cuci bersih wadah plastik sebelum didaur ulang",
        "Kurangi penggunaan plastik sekali pakai",
        "Pilih produk dengan kemasan yang dapat didaur ulang",
        "Bawa tas belanja dan wadah sendiri saat berbelanja",
      ],
    },
    totalObjects: objects.length,
    scanDate: new Date().toISOString(),
    userId: "anonymous",
    provider: "heuristic",
    analysisMode: "local",
  }
}
