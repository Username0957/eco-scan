"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UploadIcon, ScanIcon, XIcon, LoaderIcon, LeafIcon, SparklesIcon } from "@/components/icons"
import { cn } from "@/lib/utils"
import { classifyImageHeuristic } from "@/lib/heuristic-classifier"

interface OverlayResult {
  type: string
  confidence: number
  decompositionTime: string
  microplasticRisk: string
  ecoAlternative: string
}

interface AISuggestions {
  detailedAlternatives?: Array<{
    name: string
    description: string
    benefits: string[]
    whereToGet: string
    priceRange: string
  }>
  disposalTips?: Array<{
    step: string
    description: string
  }>
  environmentalImpact?: {
    problem: string
    solution: string
    funFact: string
  }
  localInfo?: {
    recyclingLocations: string
    communityTips: string
  }
  provider?: string
}

export function UploadSection() {
  const router = useRouter()
  const [image, setImage] = React.useState<string | null>(null)
  const [filename, setFilename] = React.useState<string>("")
  const [isDragging, setIsDragging] = React.useState(false)
  const [isScanning, setIsScanning] = React.useState(false)
  const [isCompressing, setIsCompressing] = React.useState(false)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [analysisStatus, setAnalysisStatus] = React.useState<string>("")
  const [overlayResult, setOverlayResult] = React.useState<OverlayResult | null>(null)
  const [logs, setLogs] = React.useState<string[]>(["Ready."])
  const [showLogs, setShowLogs] = React.useState(false)
  const [aiSuggestions, setAISuggestions] = React.useState<AISuggestions | null>(null)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false)
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [heuristicResult, setHeuristicResult] = React.useState<{
    plasticType: string
    plasticCode: string
    objectName: string
  } | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const scanInProgressRef = React.useRef(false)

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString()
    setLogs((prev) => [`${time} - ${message}`, ...prev.slice(0, 19)])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleFile = async (file: File) => {
    setError(null)
    setOverlayResult(null)
    setAISuggestions(null)
    setShowSuggestions(false)
    setHeuristicResult(null)

    if (!file.type.startsWith("image/")) {
      setError("Mohon upload file gambar (JPG, PNG, dll)")
      addLog("Error: Format file tidak didukung")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Ukuran file maksimal 10MB")
      addLog("Error: File terlalu besar")
      return
    }

    setIsCompressing(true)
    setFilename(file.name)
    addLog(`Gambar dimuat: ${file.name}`)

    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string

      if (file.size > 512 * 1024) {
        try {
          addLog("Mengompres gambar...")
          const compressed = await compressImage(base64, 512)
          setImage(compressed)
          addLog("Kompresi selesai")
        } catch {
          setImage(base64)
        }
      } else {
        setImage(base64)
      }

      setIsCompressing(false)
    }
    reader.onerror = () => {
      setError("Gagal membaca file gambar")
      addLog("Error: Gagal membaca file")
      setIsCompressing(false)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImage(null)
    setFilename("")
    setError(null)
    setAnalysisStatus("")
    setOverlayResult(null)
    setAISuggestions(null)
    setShowSuggestions(false)
    setHeuristicResult(null)
    addLog("Gambar dihapus")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const fetchAISuggestions = async () => {
    if (!heuristicResult) return

    setIsLoadingSuggestions(true)
    setShowSuggestions(true)
    addLog("Meminta saran detail dari AI...")

    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plasticType: heuristicResult.plasticType,
          plasticCode: heuristicResult.plasticCode,
          objectName: heuristicResult.objectName,
          currentAlternative: overlayResult?.ecoAlternative,
        }),
      })

      if (!response.ok) {
        throw new Error("Gagal mendapatkan saran")
      }

      const suggestions = await response.json()
      setAISuggestions(suggestions)
      addLog(`Saran AI diterima (provider: ${suggestions.provider || "local"})`)

      const existingResult = sessionStorage.getItem("scanResult")
      if (existingResult) {
        const parsed = JSON.parse(existingResult)
        parsed.aiSuggestions = suggestions
        sessionStorage.setItem("scanResult", JSON.stringify(parsed))
      }
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : "Unknown error"}`)
      setError("Gagal mendapatkan saran AI")
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  const performQuickScan = async () => {
    if (!image || scanInProgressRef.current) return

    scanInProgressRef.current = true
    setIsScanning(true)
    setError(null)
    setAISuggestions(null)
    setShowSuggestions(false)
    addLog("Memulai Quick Scan (Heuristic)...")

    try {
      const { result, objects } = await classifyImageHeuristic(image, filename)

      addLog(`Deteksi: ${result.type} (confidence ${Math.round(result.confidence * 100)}%)`)
      addLog(`Metode: ${result.method}`)

      setOverlayResult({
        type: result.type,
        confidence: result.confidence,
        decompositionTime: objects[0].decompositionTime,
        microplasticRisk: objects[0].microplasticRisk,
        ecoAlternative: objects[0].ecoAlternative,
      })

      setHeuristicResult({
        plasticType: result.type,
        plasticCode: result.plasticCode,
        objectName: objects[0].name,
      })

      sessionStorage.setItem(
        "scanResult",
        JSON.stringify({
          objects,
          totalObjects: 1,
          timestamp: new Date().toISOString(),
          analysisMethod: "heuristic",
          provider: "local",
        }),
      )
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : "Unknown error"}`)
      setError("Gagal melakukan analisis")
    } finally {
      setIsScanning(false)
      scanInProgressRef.current = false
    }
  }

  const handleScan = useDebounce(() => {
    performQuickScan()
  }, 2000)

  const goToResults = () => {
    router.push("/hasil")
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card className="overflow-hidden border-2 border-dashed border-border bg-card shadow-sm">
        <div
          className={cn("relative p-6 transition-colors", isDragging && "bg-primary/5")}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {image ? (
            <div className="space-y-4">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                <img src={image || "/placeholder.svg"} alt="Uploaded waste" className="h-full w-full object-contain" />
                <button
                  onClick={handleRemoveImage}
                  className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-sm transition-transform hover:scale-110"
                  aria-label="Hapus gambar"
                >
                  <XIcon className="h-4 w-4" />
                </button>

                {overlayResult && (
                  <div className="absolute left-3 top-3 w-64 rounded-xl bg-white/95 p-3 shadow-lg dark:bg-card/95">
                    <h3 className="mb-1 text-sm font-semibold text-foreground">
                      Jenis: {overlayResult.type}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({Math.round(overlayResult.confidence * 100)}%)
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Estimasi terurai: <strong className="text-foreground">{overlayResult.decompositionTime}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Risiko mikroplastik:{" "}
                      <strong
                        className={cn(
                          overlayResult.microplasticRisk === "Tinggi" && "text-destructive",
                          overlayResult.microplasticRisk === "Sedang" && "text-yellow-600",
                          overlayResult.microplasticRisk === "Rendah" && "text-primary",
                        )}
                      >
                        {overlayResult.microplasticRisk}
                      </strong>
                    </p>
                    <div className="mt-2 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {overlayResult.ecoAlternative}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mode:</span>
                    <span className="font-medium">Heuristic</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Akurasi:</span>
                    <span className="font-medium">~70-85%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider:</span>
                    <span className="font-medium">Lokal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium text-primary">Ready</span>
                  </div>
                </div>
              </div>

              {analysisStatus && (
                <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
                  <p>{analysisStatus}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleScan}
                  disabled={isScanning || isCompressing || isAnalyzing}
                  className="flex-1 gap-2"
                  size="lg"
                >
                  {isCompressing ? (
                    <>
                      <LoaderIcon className="h-5 w-5 animate-spin" />
                      Mengompres...
                    </>
                  ) : isAnalyzing ? (
                    <>
                      <LoaderIcon className="h-5 w-5 animate-spin" />
                      Menganalisis...
                    </>
                  ) : isScanning ? (
                    <>
                      <LoaderIcon className="h-5 w-5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <ScanIcon className="h-5 w-5" />
                      Quick Scan
                    </>
                  )}
                </Button>

                {overlayResult && (
                  <Button onClick={goToResults} variant="outline" size="lg" className="gap-2 bg-transparent">
                    <LeafIcon className="h-5 w-5" />
                    Lihat Detail
                  </Button>
                )}
              </div>

              {overlayResult && heuristicResult && (
                <Button
                  onClick={fetchAISuggestions}
                  disabled={isLoadingSuggestions}
                  variant="outline"
                  className="w-full gap-2 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                >
                  {isLoadingSuggestions ? (
                    <>
                      <LoaderIcon className="h-4 w-4 animate-spin" />
                      Memuat saran AI...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4" />
                      Dapatkan Saran Detail dari AI
                    </>
                  )}
                </Button>
              )}

              {showSuggestions && aiSuggestions && (
                <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-semibold text-foreground">
                      <SparklesIcon className="h-5 w-5 text-primary" />
                      Saran AI
                      {aiSuggestions.provider && (
                        <span className="text-xs font-normal text-muted-foreground">({aiSuggestions.provider})</span>
                      )}
                    </h3>
                    <button
                      onClick={() => setShowSuggestions(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {aiSuggestions.detailedAlternatives && aiSuggestions.detailedAlternatives.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-foreground">Alternatif Ramah Lingkungan:</h4>
                      <div className="space-y-3">
                        {aiSuggestions.detailedAlternatives.map((alt, idx) => (
                          <div key={idx} className="rounded-lg bg-background p-3">
                            <p className="font-medium text-foreground">{alt.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{alt.description}</p>
                            {alt.benefits && alt.benefits.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {alt.benefits.map((benefit, bidx) => (
                                  <li key={bidx} className="flex items-start gap-1 text-xs text-muted-foreground">
                                    <span className="text-primary">✓</span> {benefit}
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              {alt.whereToGet && (
                                <span className="rounded-full bg-muted px-2 py-0.5">{alt.whereToGet}</span>
                              )}
                              {alt.priceRange && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                                  {alt.priceRange}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiSuggestions.environmentalImpact && (
                    <div className="rounded-lg bg-background p-3">
                      <h4 className="mb-2 text-sm font-medium text-foreground">Dampak Lingkungan:</h4>
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-destructive">Masalah:</strong>{" "}
                        {aiSuggestions.environmentalImpact.problem}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <strong className="text-primary">Solusi:</strong> {aiSuggestions.environmentalImpact.solution}
                      </p>
                      {aiSuggestions.environmentalImpact.funFact && (
                        <p className="mt-2 text-xs italic text-muted-foreground">
                          💡 {aiSuggestions.environmentalImpact.funFact}
                        </p>
                      )}
                    </div>
                  )}

                  {aiSuggestions.localInfo && (
                    <div className="rounded-lg bg-background p-3">
                      <h4 className="mb-2 text-sm font-medium text-foreground">Info Lokal Indonesia:</h4>
                      <p className="text-xs text-muted-foreground">{aiSuggestions.localInfo.recyclingLocations}</p>
                      {aiSuggestions.localInfo.communityTips && (
                        <p className="mt-2 text-xs text-muted-foreground">{aiSuggestions.localInfo.communityTips}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <p>{error}</p>
                </div>
              )}

              <button
                onClick={() => setShowLogs(!showLogs)}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                {showLogs ? "Sembunyikan Log" : "Tampilkan Log"}
              </button>

              {showLogs && (
                <div className="max-h-32 overflow-y-auto rounded-lg bg-muted/50 p-2 font-mono text-xs text-muted-foreground">
                  {logs.map((log, idx) => (
                    <p key={idx}>{log}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-primary/10 p-4">
                <UploadIcon className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">Drag & drop gambar di sini</p>
                <p className="text-sm text-muted-foreground">atau klik untuk memilih file</p>
                <p className="mt-2 text-xs text-muted-foreground">Format: JPG, PNG, WEBP (Maks. 10MB)</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
            </label>
          )}
        </div>
      </Card>
    </div>
  )
}

// Debounce hook
function useDebounce<T extends (...args: unknown[]) => void>(callback: T, delay: number): T {
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const lastCallRef = React.useRef<number>(0)

  return React.useCallback(
    ((...args: unknown[]) => {
      const now = Date.now()

      if (now - lastCallRef.current < delay) {
        return
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      lastCallRef.current = now
      callback(...args)
    }) as T,
    [callback, delay],
  )
}

// Compress image
async function compressImage(base64: string, maxSizeKB: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      let { width, height } = img

      const maxDimension = 1200
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension
          width = maxDimension
        } else {
          width = (width / height) * maxDimension
          height = maxDimension
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Cannot get canvas context"))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      let quality = 0.8
      let result = canvas.toDataURL("image/jpeg", quality)

      while (result.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) {
        quality -= 0.1
        result = canvas.toDataURL("image/jpeg", quality)
      }

      resolve(result)
    }
    img.onerror = reject
    img.src = base64
  })
}
