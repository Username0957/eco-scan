import { Card, CardContent } from "@/components/ui/card"
import { ScanIcon, RecycleIcon, BookOpenIcon, BarChartIcon, ClockIcon, ShieldAlertIcon } from "@/components/icons"

const features = [
  {
    icon: ScanIcon,
    title: "Deteksi Multi-Objek",
    description: "Identifikasi berbagai jenis sampah plastik sekaligus dalam satu foto",
  },
  {
    icon: ClockIcon,
    title: "Estimasi Waktu Terurai",
    description: "Ketahui berapa lama sampah plastik akan terurai di alam",
  },
  {
    icon: ShieldAlertIcon,
    title: "Risiko Mikroplastik",
    description: "Pahami tingkat bahaya mikroplastik dari setiap jenis plastik",
  },
  {
    icon: RecycleIcon,
    title: "Alternatif Ramah Lingkungan",
    description: "Dapatkan rekomendasi pengganti yang lebih eco-friendly",
  },
  {
    icon: BookOpenIcon,
    title: "Mode Edukasi",
    description: "Pelajari kategori plastik dan dampaknya secara mendalam",
  },
  {
    icon: BarChartIcon,
    title: "Statistik Lingkungan",
    description: "Pantau kontribusi Anda dalam menjaga kelestarian bumi",
  },
]

export function FeatureCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => {
        const Icon = feature.icon
        return (
          <Card key={feature.title} className="border-border/50 bg-card shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
