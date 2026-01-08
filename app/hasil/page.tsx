"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BottleIcon,
  ClockIcon,
  ShieldAlertIcon,
  RecycleIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  SparklesIcon,
  BookOpenIcon,
} from "@/components/icons"
import { cn } from "@/lib/utils"
import type { ScanResult, DetectedObject } from "@/lib/types"
import Link from "next/link"

function getRiskColor(risk: string) {
  switch (risk) {
    case "Low":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "Medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "High":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function ObjectCard({ object, index }: { object: DetectedObject; index: number }) {
  return (
    <Card className="overflow-hidden border-border/50 shadow-sm">
      <CardHeader className="bg-secondary/50 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BottleIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{object.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {object.plasticType} (#{object.plasticCode})
              </p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono">
            #{index + 1}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
            <ClockIcon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Decomposition Time</p>
              <p className="font-semibold text-foreground">{object.decompositionTime}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
            <ShieldAlertIcon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Microplastic Risk</p>
              <Badge className={cn("mt-1", getRiskColor(object.microplasticRisk))}>{object.microplasticRisk}</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <RecycleIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-primary">Eco-Friendly Alternative</p>
            <p className="text-sm text-foreground">{object.ecoAlternative}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{object.description}</p>
      </CardContent>
    </Card>
  )
}

export default function ResultsPage() {
  const router = useRouter()
  const [result, setResult] = React.useState<ScanResult | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const storedResult = sessionStorage.getItem("scanResult")
    if (storedResult) {
      setResult(JSON.parse(storedResult))
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <SparklesIcon className="mx-auto h-12 w-12 animate-pulse text-primary" />
            <p className="mt-4 text-muted-foreground">Loading results...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto">
              <BottleIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="mb-2 text-xl font-semibold">No Results</h1>
            <p className="mb-6 text-muted-foreground">Please scan a waste image first</p>
            <Button onClick={() => router.push("/")} className="gap-2">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const hasObjects = result.objects && result.objects.length > 0

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <CheckCircleIcon className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Analysis Results</h1>
              </div>
              <p className="text-muted-foreground">
                {hasObjects ? `${result.totalObjects} object(s) detected` : "No plastic objects detected"}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/")} className="gap-2">
                <ArrowLeftIcon className="h-4 w-4" />
                Scan Again
              </Button>
              <Button onClick={() => router.push("/terima-kasih")} className="gap-2">
                <CheckCircleIcon className="h-4 w-4" />
                Done
              </Button>
            </div>
          </div>

          {/* Results Grid */}
          {hasObjects && (
            <div className="mb-8 grid gap-4 md:grid-cols-2">
              {result.objects.map((object, index) => (
                <ObjectCard key={index} object={object} index={index} />
              ))}
            </div>
          )}

          {/* Education Section */}
          {result.education && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                    <BookOpenIcon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle>{result.education.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">{result.education.description}</p>

                {result.education.tips && result.education.tips.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Tips:</p>
                    <ul className="space-y-2">
                      {result.education.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircleIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2">
                  <Link href="/edukasi">
                    <Button variant="outline" className="gap-2 bg-transparent">
                      <BookOpenIcon className="h-4 w-4" />
                      Learn More
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
