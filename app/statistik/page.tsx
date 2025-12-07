"use client"

import * as React from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartIcon, RecycleIcon, EarthIcon, TrendingUpIcon, LoaderIcon } from "@/components/icons"
import type { GlobalStats } from "@/lib/types"

const PLASTIC_LABELS: Record<string, string> = {
  "PET-1": "PET (1)",
  "PET-2": "HDPE (2)",
  "PET-3": "PVC (3)",
  "PET-4": "LDPE (4)",
  "PET-5": "PP (5)",
  "PET-6": "PS (6)",
  "PET-7": "Other (7)",
}

const PLASTIC_COLORS: Record<string, string> = {
  "PET-1": "bg-blue-500",
  "PET-2": "bg-green-500",
  "PET-3": "bg-yellow-500",
  "PET-4": "bg-orange-500",
  "PET-5": "bg-red-500",
  "PET-6": "bg-purple-500",
  "PET-7": "bg-gray-500",
}

export default function StatisticsPage() {
  const [stats, setStats] = React.useState<GlobalStats | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/stats")
        if (!response.ok) throw new Error("Gagal mengambil data")
        const data = await response.json()
        setStats(data.stats)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan")
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const totalPlasticCount = React.useMemo(() => {
    if (!stats?.plasticCategoryCounts) return 0
    return Object.values(stats.plasticCategoryCounts).reduce((a, b) => a + b, 0)
  }, [stats])

  const sortedCategories = React.useMemo(() => {
    if (!stats?.plasticCategoryCounts) return []
    return Object.entries(stats.plasticCategoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
  }, [stats])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Memuat statistik...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Card className="mx-4 max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-destructive">{error}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Pastikan koneksi Firestore sudah dikonfigurasi dengan benar.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <ChartIcon className="h-7 w-7 text-primary" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-foreground md:text-4xl">Statistik Global</h1>
            <p className="text-muted-foreground">Data analisis sampah dari seluruh pengguna EcoScan</p>
          </div>

          {/* Summary Cards */}
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <RecycleIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Scan</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.totalScans?.toLocaleString() || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/50">
                  <EarthIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Objek Terdeteksi</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.totalObjectsDetected?.toLocaleString() || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                  <TrendingUpIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rata-rata per Scan</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.totalScans ? (stats.totalObjectsDetected / stats.totalScans).toFixed(1) : "0"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Plastic Distribution Chart */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Distribusi Jenis Plastik</CardTitle>
              <CardDescription>Persentase jenis plastik yang terdeteksi dari semua scan</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedCategories.length > 0 ? (
                <div className="space-y-4">
                  {sortedCategories.map(([category, count]) => {
                    const percentage = totalPlasticCount > 0 ? (count / totalPlasticCount) * 100 : 0
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{PLASTIC_LABELS[category] || category}</span>
                          <span className="text-muted-foreground">
                            {count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${PLASTIC_COLORS[category] || "bg-primary"}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <RecycleIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Belum ada data statistik</p>
                  <p className="mt-1 text-sm text-muted-foreground">Mulai scan sampah untuk mengumpulkan data</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Last Update Info */}
          {stats?.lastUpdate && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Terakhir diperbarui: {new Date(stats.lastUpdate).toLocaleString("id-ID")}
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
