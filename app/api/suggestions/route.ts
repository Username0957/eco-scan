import { type NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"

const RATE_LIMIT_CONFIG = {
  maxRequests: 20,
  windowMs: 60 * 1000,
}

const SUGGESTION_PROMPT = `Kamu adalah ahli lingkungan dan daur ulang plastik Indonesia. Berdasarkan jenis plastik yang diberikan, berikan saran DETAIL yang personal dan bermanfaat untuk konteks Indonesia.

Format respons (JSON):
{
  "detailedAlternatives": [
    {
      "name": "nama alternatif",
      "description": "deskripsi lengkap",
      "benefits": ["benefit 1", "benefit 2"],
      "whereToGet": "tempat mendapatkannya di Indonesia",
      "priceRange": "kisaran harga dalam Rupiah"
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

    const hasOpenAIKey = !!process.env.OPENAI_API_KEY

    return NextResponse.json({
      detailedAlternatives: getDefaultAlternatives(plasticType),
      disposalTips: getDefaultDisposalTips(plasticType),
      environmentalImpact: getDefaultImpact(plasticType),
      localInfo: getDefaultLocalInfo(),
      provider: "local",
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
    "PET (Polyethylene Terephthalate)": [
      {
        name: "Botol Tumbler Stainless Steel",
        description: "Botol minum berbahan stainless steel food grade yang tahan lama dan tidak mengandung BPA",
        benefits: [
          "Tahan lama hingga 10+ tahun",
          "Tidak ada rasa plastik",
          "Mudah dibersihkan",
          "Menjaga suhu minuman",
        ],
        whereToGet: "Tokopedia, Shopee, IKEA, atau toko peralatan dapur",
        priceRange: "Rp 50.000 - Rp 300.000",
      },
      {
        name: "Botol Kaca dengan Sleeve",
        description: "Botol kaca dengan pelindung silikon atau kain untuk mencegah pecah",
        benefits: ["100% bebas plastik", "Tidak menyerap bau", "Mudah dicuci", "Estetik"],
        whereToGet: "IKEA, ACE Hardware, atau marketplace online",
        priceRange: "Rp 30.000 - Rp 150.000",
      },
    ],
    "LDPE (Low-Density Polyethylene)": [
      {
        name: "Tas Belanja Kanvas",
        description: "Tas belanja berbahan kanvas tebal yang dapat dilipat dan dicuci",
        benefits: ["Dapat digunakan 1000+ kali", "Mudah dilipat", "Dapat dicuci mesin", "Kuat menahan beban berat"],
        whereToGet: "Miniso, Pasar tradisional, atau toko online eco-friendly",
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
    "PP (Polypropylene)": [
      {
        name: "Sedotan Stainless Steel Set",
        description: "Set sedotan stainless steel dengan sikat pembersih dan pouch",
        benefits: ["Dapat digunakan seumur hidup", "Mudah dibersihkan", "Portable", "Berbagai ukuran tersedia"],
        whereToGet: "Tokopedia, Shopee, atau toko eco-friendly",
        priceRange: "Rp 15.000 - Rp 50.000",
      },
      {
        name: "Sedotan Bambu",
        description: "Sedotan dari bambu alami yang biodegradable",
        benefits: ["100% alami", "Biodegradable", "Ringan", "Aesthetic"],
        whereToGet: "Toko kerajinan atau online marketplace",
        priceRange: "Rp 5.000 - Rp 25.000",
      },
    ],
    "PS (Polystyrene)": [
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
    "HDPE (High-Density Polyethylene)": [
      {
        name: "Wadah Kaca dengan Tutup Bambu",
        description: "Wadah penyimpanan kaca dengan tutup dari bambu",
        benefits: ["Tahan lama", "Tidak menyerap bau", "Estetik", "Ramah lingkungan"],
        whereToGet: "IKEA, ACE Hardware, atau toko online",
        priceRange: "Rp 50.000 - Rp 200.000",
      },
    ],
  }

  // Find matching key or return default
  for (const [key, value] of Object.entries(alternatives)) {
    if (plasticType.includes(key) || key.includes(plasticType)) {
      return value
    }
  }

  return alternatives["PET (Polyethylene Terephthalate)"]
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
    PP: [
      { step: "Bersihkan", description: "Cuci bersih dari sisa makanan" },
      { step: "Keringkan", description: "Pastikan benar-benar kering" },
      { step: "Pisahkan", description: "Pisahkan dari jenis plastik lain" },
      { step: "Setor", description: "Setor ke bank sampah atau tempat daur ulang" },
    ],
    PS: [
      { step: "Jangan hancurkan", description: "Jangan remukkan styrofoam karena akan menyebar sebagai mikroplastik" },
      { step: "Simpan utuh", description: "Simpan dalam keadaan utuh jika memungkinkan" },
      { step: "Cari dropbox", description: "Cari dropbox khusus styrofoam (masih jarang di Indonesia)" },
      { step: "Hindari", description: "Untuk ke depannya, hindari penggunaan styrofoam" },
    ],
  }

  // Find matching key
  for (const [key, value] of Object.entries(tips)) {
    if (plasticType.includes(key)) {
      return value
    }
  }

  return tips["PET"]
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
    PP: {
      problem: "Sedotan dan wadah PP sering ditemukan di dalam tubuh hewan laut dan burung",
      solution: "Membawa sedotan dan wadah sendiri dapat mengurangi sampah plastik secara signifikan",
      funFact: "Lebih dari 8 miliar sedotan plastik mencemari pantai di seluruh dunia setiap tahun",
    },
    PS: {
      problem: "Styrofoam tidak dapat didaur ulang dan akan pecah menjadi jutaan partikel mikroplastik",
      solution: "Membawa wadah makanan sendiri saat membeli makanan dapat mengurangi 90% sampah styrofoam personal",
      funFact: "Styrofoam ditemukan di 100% sampel air laut yang diteliti di seluruh dunia",
    },
  }

  // Find matching key
  for (const [key, value] of Object.entries(impacts)) {
    if (plasticType.includes(key)) {
      return value
    }
  }

  return impacts["PET"]
}

function getDefaultLocalInfo() {
  return {
    recyclingLocations:
      "Cari 'Bank Sampah' terdekat melalui aplikasi atau website dinas lingkungan hidup kotamu. Beberapa supermarket seperti Alfamart dan Indomaret juga menerima botol plastik. Di Jakarta, kamu bisa menggunakan aplikasi 'Waste4Change' untuk penjemputan sampah.",
    communityTips:
      "Bergabunglah dengan komunitas zero waste lokal seperti Indonesia Bebas Sampah, Gerakan Indonesia Diet Kantong Plastik, atau Zero Waste Indonesia untuk tips dan motivasi. Ikuti juga akun @waste4change dan @zerowaste.id di Instagram.",
  }
}
