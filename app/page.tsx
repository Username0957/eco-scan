import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import  UploadSection  from "@/components/upload-section"
import { FeatureCards } from "@/components/feature-cards"
import { LeafIcon, EarthIcon, RecycleIcon } from "@/components/icons"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-secondary/50 to-background py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
                  <LeafIcon className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>

              <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl text-balance">
                Kenali Sampahmu,
                <br />
                Selamatkan Bumi
              </h1>

              <p className="mb-8 text-lg text-muted-foreground leading-relaxed text-pretty">
                Plastigram membantu Anda mengidentifikasi jenis sampah plastik, memahami bahaya mikroplastik, dan menemukan
                alternatif ramah lingkungan dengan teknologi canggih.
              </p>

              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <EarthIcon className="h-5 w-5 text-primary" />
                  <span>Analisis</span>
                </div>
                <div className="flex items-center gap-2">
                  <RecycleIcon className="h-5 w-5 text-primary" />
                  <span>Multi-Objek</span>
                </div>
                <div className="flex items-center gap-2">
                  <LeafIcon className="h-5 w-5 text-primary" />
                  <span>Edukasi Lengkap</span>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </section>

        {/* Upload Section */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <UploadSection />
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-secondary/30 py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">Fitur Unggulan</h2>
              <p className="text-muted-foreground">
                Teknologi canggih untuk membantu Anda memahami dan mengelola sampah dengan lebih baik
              </p>
            </div>
            <FeatureCards />
          </div>
        </section>

        {/* Inspiration Quote */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
              <p className="mb-4 font-arabic text-xl leading-relaxed text-foreground" dir="rtl">
                وَلَا تُفْسِدُوْا فِى الْاَرْضِ بَعْدَ اِصْلَاحِهَا وَادْعُوْهُ خَوْفًا وَّطَمَعًاۗ اِنَّ رَحْمَتَ اللّٰهِ قَرِيْبٌ مِّنَ الْمُحْسِنِيْنَ
              </p>
              <p className="text-sm italic text-muted-foreground">
                &quot;Janganlah kamu berbuat kerusakan di bumi setelah diatur dengan baik. Berdoalah kepada-Nya dengan
                rasa takut dan penuh harap. Sesungguhnya rahmat Allah sangat dekat dengan orang-orang yang berbuat
                baik.&quot;
              </p>
              <p className="mt-2 text-xs font-medium text-primary">— QS. Al-A&apos;raf: 56</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
