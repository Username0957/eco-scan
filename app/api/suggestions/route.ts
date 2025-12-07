import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { checkRateLimit } from "@/lib/rate-limit"

const RATE_LIMIT_CONFIG = {
  maxRequests: 20,
  windowMs: 60 * 1000,
}

const SUGGESTION_PROMPT = `Kamu adalah ahli lingkungan dan daur ulang plastik. Berdasarkan jenis plastik yang diberikan, berikan saran DETAIL yang personal dan bermanfaat.

Format respons (JSON):
{
  "detailedAlternatives": [
    {
      "name": "nama alternatif",
      "description": "deskripsi lengkap",
      "benefits": ["benefit 1", "benefit 2"],
      "whereToGet": "tempat mendapatkannya",
      "priceRange": "kisaran harga"
    }
  ],
  "disposalTips": [
    {
      "step": "langkah",
      "description": "deskripsi detail"
    }
  ],
  "environmentalImpact": {
    "problem": "masalah lingkungan dari plastik ini",
    "solution": "solusi yang bisa dilakukan",
    "funFact": "fakta menarik"
  },
  "localInfo": {
    "recyclingLocations": "informasi tempat daur ulang di Indonesia",
    "communityTips": "tips dari komunitas lokal"
  }
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
    const rateLimitResult = checkRateLimit(clientIP + "-suggestions", RATE_LIMIT_CONFIG)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan. Silakan tunggu ${rateLimitResult.retryAfter} detik.`,
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 },
      )
    }

    const { plasticType, plasticCode, objectName, currentAlternative } = await request.json()

    if (!plasticType) {
      return NextResponse.json({ error: "Jenis plastik tidak ditemukan" }, { status: 400 })
    }

    const userQuery = `Berikan saran detail untuk:
- Jenis Plastik: ${plasticType}
- Kode Plastik: ${plasticCode}
- Objek: ${objectName}
- Alternatif saat ini: ${currentAlternative}

Berikan saran yang lebih spesifik, kreatif, dan mudah diterapkan di Indonesia.`

    let text: string | undefined

    try {
      const result = await generateText({
        model: "anthropic/claude-sonnet-4-20250514",
        messages: [{ role: "user", content: `${SUGGESTION_PROMPT}\n\n${userQuery}` }],
        temperature: 0.7,
      })
      text = result.text
    } catch (error) {
      console.error("Vercel AI Gateway suggestion failed:", error)
    }

    if (!text) {
      // Fallback ke saran default yang detail
      return NextResponse.json({
        detailedAlternatives: getDefaultAlternatives(plasticType),
        disposalTips: getDefaultDisposalTips(plasticType),
        environmentalImpact: getDefaultImpact(plasticType),
        localInfo: getDefaultLocalInfo(),
        provider: "local",
      })
    }

    // Parse JSON response
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
        detailedAlternatives: getDefaultAlternatives(plasticType),
        disposalTips: getDefaultDisposalTips(plasticType),
        environmentalImpact: getDefaultImpact(plasticType),
        localInfo: getDefaultLocalInfo(),
      }
    }

    return NextResponse.json({
      ...result,
      provider: "vercel",
    })
  } catch (error) {
    console.error("Suggestions API Error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 })
  }
}

function getDefaultAlternatives(plasticType: string) {
  const alternatives: Record<
    string,
    Array<{ name: string; description: string; benefits: string[]; whereToGet: string; priceRange: string }>
  > = {
    PET: [
      {
        name: "Botol Tumbler Stainless Steel",
        description: "Botol minum berbahan stainless steel food grade yang tahan lama dan tidak mengandung BPA",
        benefits: [
          "Tahan lama hingga 10+ tahun",
          "Tidak ada rasa plastik",
          "Mudah dibersihkan",
          "Menjaga suhu minuman",
        ],
        whereToGet: "Tokopedia, Shopee, atau toko peralatan dapur",
        priceRange: "Rp 50.000 - Rp 300.000",
      },
      {
        name: "Botol Kaca dengan Sleeve",
        description: "Botol kaca dengan pelindung silikon atau kain untuk mencegah pecah",
        benefits: ["100% bebas plastik", "Tidak menyerap bau", "Mudah dicuci", "Estetik"],
        whereToGet: "IKEA, ACE Hardware, atau marketplace",
        priceRange: "Rp 30.000 - Rp 150.000",
      },
    ],
    LDPE: [
      {
        name: "Tas Belanja Kanvas",
        description: "Tas belanja berbahan kanvas tebal yang dapat dilipat dan dicuci",
        benefits: ["Dapat digunakan 1000+ kali", "Mudah dilipat", "Dapat dicuci mesin", "Kuat menahan beban berat"],
        whereToGet: "Miniso, toko kelontong, atau buat sendiri",
        priceRange: "Rp 15.000 - Rp 75.000",
      },
      {
        name: "Tas Jaring (Mesh Bag)",
        description: "Tas jaring untuk belanja sayur dan buah yang breathable",
        benefits: ["Sayur/buah tetap segar", "Sangat ringan", "Mudah dibersihkan", "Hemat tempat"],
        whereToGet: "Pasar tradisional atau online shop eco-friendly",
        priceRange: "Rp 10.000 - Rp 50.000",
      },
    ],
    PS: [
      {
        name: "Wadah Makanan Bambu",
        description: "Wadah makanan dari serat bambu yang biodegradable",
        benefits: ["100% alami", "Biodegradable dalam 6 bulan", "Ringan", "Microwave safe"],
        whereToGet: "Toko peralatan makan eco-friendly",
        priceRange: "Rp 25.000 - Rp 100.000",
      },
      {
        name: "Kotak Makan Stainless Steel",
        description: "Kotak makan dari stainless steel dengan sekat",
        benefits: ["Tahan lama", "Tidak bocor", "Mudah dibersihkan", "Food grade"],
        whereToGet: "Lock&Lock store, department store",
        priceRange: "Rp 75.000 - Rp 250.000",
      },
    ],
  }

  return alternatives[plasticType] || alternatives["PET"]
}

function getDefaultDisposalTips(plasticType: string) {
  const tips: Record<string, Array<{ step: string; description: string }>> = {
    PET: [
      { step: "Kosongkan isi", description: "Pastikan botol sudah benar-benar kosong dari cairan" },
      { step: "Bilas bersih", description: "Bilas dengan air untuk menghilangkan sisa minuman yang bisa menarik hama" },
      { step: "Lepaskan tutup", description: "Pisahkan tutup botol karena biasanya berbeda jenis plastiknya (HDPE)" },
      { step: "Kempiskan", description: "Tekan botol agar kempes untuk menghemat ruang" },
      { step: "Kumpulkan", description: "Kumpulkan di wadah khusus plastik PET sebelum disetor ke bank sampah" },
    ],
    LDPE: [
      { step: "Bersihkan", description: "Bersihkan dari sisa makanan atau kotoran" },
      { step: "Keringkan", description: "Pastikan kantong kering sebelum disimpan" },
      { step: "Lipat rapi", description: "Lipat rapi untuk menghemat tempat" },
      { step: "Kumpulkan", description: "Kumpulkan minimal 1kg sebelum disetor ke bank sampah" },
    ],
  }

  return tips[plasticType] || tips["PET"]
}

function getDefaultImpact(plasticType: string) {
  const impacts: Record<string, { problem: string; solution: string; funFact: string }> = {
    PET: {
      problem:
        "Botol PET membutuhkan 450 tahun untuk terurai dan sering berakhir di lautan, membahayakan kehidupan laut",
      solution:
        "Dengan mendaur ulang 1 botol PET, kita menghemat energi yang cukup untuk menyalakan lampu 100W selama 4 jam",
      funFact: "Indonesia adalah penyumbang sampah plastik ke laut terbesar kedua di dunia setelah China",
    },
    LDPE: {
      problem: "Kantong plastik LDPE adalah pembunuh utama penyu laut yang mengira kantong plastik adalah ubur-ubur",
      solution: "Menggunakan tas belanja reusable dapat mengurangi 500+ kantong plastik per orang per tahun",
      funFact: "Rata-rata kantong plastik hanya digunakan selama 12 menit tapi butuh 500-1000 tahun untuk terurai",
    },
    PS: {
      problem: "Styrofoam tidak dapat didaur ulang dan akan pecah menjadi jutaan partikel mikroplastik",
      solution: "Membawa wadah makanan sendiri saat membeli makanan dapat mengurangi 90% sampah styrofoam personal",
      funFact: "Styrofoam ditemukan di 100% sampel air laut yang diteliti di seluruh dunia",
    },
  }

  return impacts[plasticType] || impacts["PET"]
}

function getDefaultLocalInfo() {
  return {
    recyclingLocations:
      "Cari 'Bank Sampah' terdekat melalui aplikasi atau website dinas lingkungan hidup kotamu. Beberapa supermarket seperti Alfamart dan Indomaret juga menerima botol plastik.",
    communityTips:
      "Bergabunglah dengan komunitas zero waste lokal seperti Indonesia Bebas Sampah atau Gerakan Indonesia Diet Kantong Plastik untuk tips dan motivasi.",
  }
}
