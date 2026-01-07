import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RecycleIcon, AlertTriangleIcon, CheckCircleIcon, InfoIcon } from "@/components/icons"

const plasticCategories = [
  {
    code: "1",
    name: "PET (Polyethylene Terephthalate)",
    examples: "Botol air mineral, botol minuman bersoda, wadah makanan",
    recyclable: true,
    risk: "Sedang",
    decomposition: "450+ tahun",
    tips: "Jangan gunakan ulang untuk makanan panas. Dapat didaur ulang menjadi serat tekstil.",
  },
  {
    code: "2",
    name: "HDPE (High-Density Polyethylene)",
    examples: "Botol susu, botol deterjen, kantong belanja",
    recyclable: true,
    risk: "Rendah",
    decomposition: "100+ tahun",
    tips: "Relatif aman untuk makanan. Pilihan plastik yang lebih baik untuk penggunaan sehari-hari.",
  },
  {
    code: "3",
    name: "PVC (Polyvinyl Chloride)",
    examples: "Pipa, mainan, kemasan blister",
    recyclable: false,
    risk: "Tinggi",
    decomposition: "450+ tahun",
    tips: "Hindari untuk makanan. Mengandung klorin dan dapat melepaskan dioksin berbahaya.",
  },
  {
    code: "4",
    name: "LDPE (Low-Density Polyethylene)",
    examples: "Kantong plastik, plastik wrap, botol squeeze",
    recyclable: true,
    risk: "Rendah",
    decomposition: "500+ tahun",
    tips: "Relatif aman tetapi sulit didaur ulang. Gunakan kembali sebisa mungkin.",
  },
  {
    code: "5",
    name: "PP (Polypropylene)",
    examples: "Wadah yogurt, sedotan, tutup botol",
    recyclable: true,
    risk: "Rendah",
    decomposition: "20-30 tahun",
    tips: "Pilihan terbaik untuk wadah makanan. Tahan panas dan aman untuk microwave.",
  },
  {
    code: "6",
    name: "PS (Polystyrene)",
    examples: "Styrofoam, gelas plastik sekali pakai, wadah makanan take-away",
    recyclable: false,
    risk: "Tinggi",
    decomposition: "500+ tahun",
    tips: "Sangat berbahaya! Hindari untuk makanan panas. Mudah terurai menjadi mikroplastik.",
  },
  {
    code: "7",
    name: "Other (Lainnya)",
    examples: "Galon air, botol bayi, CD/DVD",
    recyclable: false,
    risk: "Sedang-Tinggi",
    decomposition: "Bervariasi",
    tips: "Berhati-hati dengan BPA. Pilih yang berlabel BPA-Free jika harus menggunakan.",
  },
]

const generalTips = [
  {
    title: "Reduce (Kurangi)",
    description: "Kurangi penggunaan plastik sekali pakai. Bawa tas belanja dan botol minum sendiri.",
    icon: AlertTriangleIcon,
  },
  {
    title: "Reuse (Gunakan Kembali)",
    description: "Gunakan kembali wadah plastik untuk keperluan lain sebelum membuangnya.",
    icon: CheckCircleIcon,
  },
  {
    title: "Recycle (Daur Ulang)",
    description: "Pisahkan sampah plastik dan serahkan ke bank sampah atau tempat daur ulang.",
    icon:  RecycleIcon,
  },
]

function getRiskBadgeColor(risk: string) {
  switch (risk) {
    case "Rendah":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "Sedang":
    case "Sedang-Tinggi":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "Tinggi":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export default function EducationPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
                <InfoIcon className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <h1 className="mb-3 text-3xl font-bold text-foreground">Mode Edukasi</h1>
            <p className="text-muted-foreground leading-relaxed">
              Pelajari berbagai jenis plastik, tingkat bahayanya, dan cara mengelolanya dengan bijak untuk menjaga
              kelestarian lingkungan.
            </p>
          </div>

          {/* 3R Tips */}
          <div className="mb-12 grid gap-4 md:grid-cols-3">
            {generalTips.map((tip) => {
              const Icon = tip.icon
              return (
                <Card key={tip.title} className="border-primary/20 bg-primary/5">
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                      <Icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="mb-2 font-semibold text-foreground">{tip.title}</h3>
                    <p className="text-sm text-muted-foreground">{tip.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Plastic Categories */}
          <div className="mb-8">
            <h2 className="mb-6 text-xl font-bold text-foreground">Kategori Plastik</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plasticCategories.map((category) => (
                <Card key={category.code} className="overflow-hidden border-border/50">
                  <CardHeader className="bg-secondary/50 pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-mono text-lg font-bold text-primary">
                          {category.code}
                        </div>
                        <CardTitle className="text-base leading-tight">{category.name}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Contoh:</p>
                      <p className="text-sm text-foreground">{category.examples}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge className={getRiskBadgeColor(category.risk)}>Risiko: {category.risk}</Badge>
                      <Badge variant={category.recyclable ? "default" : "secondary"}>
                        {category.recyclable ? "Dapat Didaur Ulang" : "Sulit Didaur Ulang"}
                      </Badge>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Waktu Terurai:</p>
                      <p className="text-sm font-semibold text-foreground">{category.decomposition}</p>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">{category.tips}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Microplastic Section */}
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive">
                  <AlertTriangleIcon className="h-5 w-5 text-destructive-foreground" />
                </div>
                <CardTitle>Bahaya Mikroplastik</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Mikroplastik adalah partikel plastik berukuran kurang dari 5mm yang terbentuk dari degradasi sampah
                plastik. Partikel ini telah ditemukan di air minum, makanan laut, dan bahkan di udara yang kita hirup.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-card p-4">
                  <h4 className="mb-2 font-medium text-foreground">Dampak pada Kesehatan:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Gangguan sistem endokrin</li>
                    <li>• Peradangan kronis</li>
                    <li>• Potensi karsinogenik</li>
                    <li>• Akumulasi di organ tubuh</li>
                  </ul>
                </div>

                <div className="rounded-lg bg-card p-4">
                  <h4 className="mb-2 font-medium text-foreground">Cara Mengurangi Paparan:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Hindari wadah plastik untuk makanan panas</li>
                    <li>• Gunakan filter air</li>
                    <li>• Pilih produk tanpa plastik</li>
                    <li>• Kurangi konsumsi makanan kemasan</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
