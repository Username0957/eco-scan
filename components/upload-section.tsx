"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UploadIcon, ScanIcon, LoaderIcon, LeafIcon, SparklesIcon } from "@/components/icons"
import { analyzeImageHybrid } from "@/lib/heuristic-classifier"
import {
  mapPlasticCode,
  getDecompositionTime,
  getMicroplasticRisk,
  getEcoAlternative,
  getPlasticDescription,
  getEducationDescription,
  getEducationTips,
} from "@/lib/types"
import { saveScanResult, updateGlobalStats } from "@/lib/firestore"

/* =========================
   TYPES
========================= */
interface OverlayResult {
  type: string
  confidence: number
  decompositionTime: string
  microplasticRisk: string
  ecoAlternative: string
}

type DetectedObject = {
  name: string
  plasticType: string
  plasticCode: string
  decompositionTime: string
  microplasticRisk: "Low" | "Medium" | "High"
  ecoAlternative: string
  description: string
}

type ScanResult = {
  totalObjects: number
  objects: DetectedObject[]
  scanDate: string
  education: {
    title: string
    description: string
    tips: string[]
  }
}

interface HeuristicResult {
  plasticType: string
  plasticCode: string
  objectName: string
}

interface AISuggestions {
  detailedAlternatives?: {
    name: string
    description: string
    benefits: string[]
    whereToGet: string
    priceRange: string
  }[]
  environmentalImpact?: {
    problem: string
    solution: string
    funFact: string
  }
  provider?: string
  disposalTips?: {
    step: string
    description: string
  }[]
}

/* =========================
   COMPONENT
========================= */
export function UploadSection() {
  const router = useRouter()

  const [image, setImage] = React.useState<string | null>(null)
  const [isScanning, setIsScanning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [overlayResult, setOverlayResult] = React.useState<OverlayResult | null>(null)
  const [heuristicResult, setHeuristicResult] = React.useState<HeuristicResult | null>(null)

  const [logs, setLogs] = React.useState<string[]>([])
  const [showLogs, setShowLogs] = React.useState(false)

  const [aiSuggestions, setAISuggestions] = React.useState<AISuggestions | null>(null)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false)
  const [showSuggestions, setShowSuggestions] = React.useState(false)

  const scanInProgressRef = React.useRef(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  /* =========================
     LOGGING
  ========================= */
  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])
  }

  /* =========================
     BASE64 → IMAGEDATA
  ========================= */
  async function base64ToImageData(base64: string) {
    return new Promise<{
      imageData: ImageData
      imageEl: HTMLImageElement
    }>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject("Canvas error")
        ctx.drawImage(img, 0, 0)
        resolve({
          imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
          imageEl: img,
        })
      }
      img.onerror = reject
      img.src = base64
    })
  }

  /* =========================
     SCAN
  ========================= */
  const performQuickScan = async () => {
    if (!image || scanInProgressRef.current) return

    scanInProgressRef.current = true
    setIsScanning(true)
    setError(null)
    setAISuggestions(null)

    try {
      addLog("Preparing image...")
      const { imageData, imageEl } = await base64ToImageData(image)

      addLog("Running hybrid analysis (Heuristic + TM)...")
      const result = await analyzeImageHybrid(imageData, imageEl)

      addLog(`Detected ${result.material} (${Math.round(result.confidence * 100)}%)`)

      setOverlayResult({
        type: result.material,
        confidence: result.confidence,
        decompositionTime: "±100–500 years",
        microplasticRisk: result.material === "PS" || result.material === "PVC" ? "High" : "Medium",
        ecoAlternative: "Use reusable or biodegradable alternatives",
      })

      setHeuristicResult({
        plasticType: result.material,
        plasticCode: "-",
        objectName: result.material,
      })

      const detectedType = result.material

      const objects: DetectedObject[] = [
        {
          name: "Detected Plastic Waste",
          plasticType: detectedType,
          plasticCode: mapPlasticCode(detectedType),
          decompositionTime: getDecompositionTime(detectedType),
          microplasticRisk: getMicroplasticRisk(detectedType) as "Low" | "Medium" | "High",
          ecoAlternative: getEcoAlternative(detectedType),
          description: getPlasticDescription(detectedType),
        },
      ]

      const scanResult: ScanResult = {
        totalObjects: objects.length,
        objects,
        scanDate: new Date().toISOString(),
        education: {
          title: `Why is ${detectedType} plastic dangerous?`,
          description: getEducationDescription(detectedType) || "This plastic has a harmful impact on the environment",
          tips: getEducationTips(detectedType) || ["Use eco-friendly alternatives", "Reduce single-use plastic"],
        },
      }

      sessionStorage.setItem("scanResult", JSON.stringify(scanResult))

      try {
        await saveScanResult(scanResult)
        await updateGlobalStats(scanResult)
        addLog("Data saved to Firestore")
      } catch {
        addLog("Data saved locally (Firestore unavailable)")
      }
    } catch (e) {
      console.error(e)
      setError("Failed to analyze image")
      addLog("Error during analysis")
    } finally {
      setIsScanning(false)
      scanInProgressRef.current = false
    }
  }

  /* =========================
     AI SUGGESTIONS
  ========================= */
  const fetchAISuggestions = async () => {
    if (!heuristicResult) return
    setIsLoadingSuggestions(true)
    setShowSuggestions(true)

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plasticType: heuristicResult.plasticType,
        }),
      })

      if (!res.ok) throw new Error("AI response error")

      const data = await res.json()
      setAISuggestions(data)
      addLog(`AI suggestions loaded (Provider: ${data.provider || "local"})`)
    } catch (error) {
      console.error("[v0] Suggestions fetch error:", error)
      addLog("Failed to fetch AI suggestions")
      setAISuggestions(null)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  /* =========================
     UI
  ========================= */
  return (
    <div className="mx-auto max-w-xl">
      <Card className="border-dashed border-2 p-6">
        {!image ? (
          <label className="flex flex-col items-center gap-4 cursor-pointer">
            <UploadIcon className="h-10 w-10 text-primary" />
            <p className="text-sm text-muted-foreground">Upload a plastic waste image</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const r = new FileReader()
                r.onload = () => setImage(r.result as string)
                r.readAsDataURL(f)
              }}
            />
          </label>
        ) : (
          <>
            <img src={image || "/placeholder.svg"} className="rounded-lg mb-3" alt="preview" />

            <Button onClick={performQuickScan} disabled={isScanning} className="w-full gap-2">
              {isScanning ? (
                <>
                  <LoaderIcon className="animate-spin h-4 w-4" />
                  Scanning...
                </>
              ) : (
                <>
                  <ScanIcon className="h-4 w-4" />
                  Scan Waste
                </>
              )}
            </Button>

            {overlayResult && (
              <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Trash Type Detected:</p>
                <p className="text-sm font-semibold text-foreground">{overlayResult.type}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {overlayResult.confidence ? `Confidence: ${Math.round(overlayResult.confidence * 100)}%` : ""}
                </p>
              </div>
            )}

            {heuristicResult && (
              <Button
                variant="outline"
                className="w-full mt-2 bg-transparent"
                onClick={fetchAISuggestions}
                disabled={isLoadingSuggestions}
              >
                {isLoadingSuggestions ? (
                  <>
                    <LoaderIcon className="animate-spin h-4 w-4 mr-2" />
                    Loading Suggestions...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    AI Suggestions
                  </>
                )}
              </Button>
            )}

            {overlayResult && (
              <Button
                variant="outline"
                className="w-full mt-2 gap-2 bg-transparent"
                onClick={() => router.push("/hasil")}
              >
                <LeafIcon className="h-4 w-4 text-green-600" />
                View Details
              </Button>
            )}

            {showSuggestions && aiSuggestions && (
              <div className="mt-4 p-4 border border-primary/20 rounded-lg bg-primary/5 space-y-4">
                <p className="text-sm font-medium text-foreground">
                  Suggestions ({aiSuggestions.provider === "gemini" ? "AI-Powered" : "Local Data"})
                </p>

                {aiSuggestions.detailedAlternatives && aiSuggestions.detailedAlternatives.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Eco-Friendly Alternatives:</p>
                    {aiSuggestions.detailedAlternatives.map((alt, i) => (
                      <div key={i} className="text-xs bg-background/50 p-2 rounded">
                        <p className="font-medium text-foreground">{alt.name}</p>
                        <p className="text-muted-foreground text-xs">{alt.description}</p>
                        {alt.priceRange && <p className="text-xs text-primary">💰 {alt.priceRange}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {aiSuggestions.environmentalImpact && (
                  <div className="text-xs bg-background/50 p-2 rounded space-y-1">
                    <p className="font-medium text-foreground">Environmental Impact</p>
                    <p className="text-muted-foreground">⚠️ {aiSuggestions.environmentalImpact.problem}</p>
                    <p className="text-green-600">✓ {aiSuggestions.environmentalImpact.solution}</p>
                  </div>
                )}

                {aiSuggestions.disposalTips && aiSuggestions.disposalTips.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Disposal Tips:</p>
                    {aiSuggestions.disposalTips.map((tip, i) => (
                      <div key={i} className="text-xs bg-background/50 p-2 rounded">
                        <p className="font-medium text-foreground">{tip.step}</p>
                        <p className="text-muted-foreground">{tip.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setShowLogs(!showLogs)} className="text-xs mt-2 text-muted-foreground">
              {showLogs ? "Hide logs" : "Show logs"}
            </button>

            {showLogs && (
              <div className="mt-2 text-xs bg-muted p-2 rounded">
                {logs.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            )}

            {error && <div className="text-sm text-destructive mt-2">{error}</div>}
          </>
        )}
      </Card>
    </div>
  )
}
