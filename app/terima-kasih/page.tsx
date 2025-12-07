import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { HeartIcon, LeafIcon, HomeIcon, BookOpenIcon, BarChartIcon } from "@/components/icons"

export default function ThankYouPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 items-center justify-center py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-lg text-center">
            {/* Animated Icon */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary shadow-lg">
                  <HeartIcon className="h-12 w-12 text-primary-foreground" />
                </div>
                <div className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-secondary shadow-md">
                  <LeafIcon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>

            <h1 className="mb-4 text-3xl font-bold text-foreground">Terima Kasih!</h1>

            <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
              Anda telah berkontribusi dalam menjaga kelestarian bumi. Setiap langkah kecil membuat perbedaan besar
              untuk masa depan planet kita.
            </p>

            {/* Quote Card */}
            <Card className="mb-8 border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <p className="mb-2 font-arabic text-lg text-foreground" dir="rtl">
                  وَلَا تُفْسِدُوْا فِى الْاَرْضِ بَعْدَ اِصْلَاحِهَا
                </p>
                <p className="text-sm italic text-muted-foreground">
                  &quot;Janganlah kamu berbuat kerusakan di bumi setelah diatur dengan baik.&quot;
                </p>
                <p className="mt-1 text-xs font-medium text-primary">— QS. Al-A&apos;raf: 56</p>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/">
                  <HomeIcon className="h-4 w-4" />
                  Kembali ke Beranda
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2 bg-transparent">
                <Link href="/edukasi">
                  <BookOpenIcon className="h-4 w-4" />
                  Mode Edukasi
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2 bg-transparent">
                <Link href="/statistik">
                  <BarChartIcon className="h-4 w-4" />
                  Lihat Statistik
                </Link>
              </Button>
            </div>

            {/* Social Impact Message */}
            <div className="mt-10 rounded-2xl bg-secondary/50 p-6">
              <h3 className="mb-3 font-semibold text-foreground">Dampak Positif Anda</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">1</p>
                  <p className="text-xs text-muted-foreground">Scan Hari Ini</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">∞</p>
                  <p className="text-xs text-muted-foreground">Potensi Dampak</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">100%</p>
                  <p className="text-xs text-muted-foreground">Komitmen</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
