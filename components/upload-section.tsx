"use client"

import React, { useRef, useState } from "react"
import { analyzeImageHybrid } from "@/lib/heuristic-classifier"

type OverlayResult = {
  type: string
  confidence: number
  decompositionTime: string
  microplasticRisk: string
  ecoAlternative: string
}

type HeuristicResult = {
  plasticType: string
  plasticCode: string
  objectName: string
}

export default function UploadSection() {
  const [image, setImage] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [overlayResult, setOverlayResult] =
    useState<OverlayResult | null>(null)
  const [heuristicResult, setHeuristicResult] =
    useState<HeuristicResult | null>(null)

  const scanInProgressRef = useRef(false)

  /* =========================
     Helper: log system
  ========================= */
  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  /* =========================
     Helper: base64 → ImageData
  ========================= */
  async function base64ToImageData(
    base64: string
  ): Promise<{ imageData: ImageData; imageEl: HTMLImageElement }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject("Canvas context error")
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        )
        resolve({ imageData, imageEl: img })
      }
      img.onerror = reject
      img.src = base64
    })
  }

  /* =========================
     Main Scan Logic (FINAL)
  ========================= */
  const performQuickScan = async () => {
    if (!image || scanInProgressRef.current) return

    scanInProgressRef.current = true
    setIsScanning(true)
    setError(null)

    try {
      addLog("Menyiapkan gambar...")
      const { imageData, imageEl } = await base64ToImageData(image)

      addLog("Menjalankan analisis Hybrid (Heuristic + TM)...")
      const result = await analyzeImageHybrid(imageData, imageEl)

      addLog(
        `Terdeteksi: ${result.material} (${Math.round(
          result.confidence * 100
        )}%)`
      )

      setOverlayResult({
        type: result.material,
        confidence: result.confidence,
        decompositionTime: "± 100–500 tahun",
        microplasticRisk:
          result.material === "PS" || result.material === "PVC"
            ? "Tinggi"
            : "Sedang",
        ecoAlternative: "Gunakan bahan pakai ulang atau biodegradable",
      })

      setHeuristicResult({
        plasticType: result.material,
        plasticCode: "-",
        objectName: result.material,
      })

      sessionStorage.setItem(
        "scanResult",
        JSON.stringify({
          material: result.material,
          confidence: result.confidence,
          ecoScore: result.ecoScore,
          reasoning: result.reasoning,
          provider: "hybrid-local",
          timestamp: new Date().toISOString(),
        })
      )
    } catch (e) {
      console.error(e)
      setError("Gagal melakukan analisis gambar")
      addLog("Terjadi kesalahan saat analisis")
    } finally {
      setIsScanning(false)
      scanInProgressRef.current = false
    }
  }

  /* =========================
     UI
  ========================= */
  return (
    <section className="w-full max-w-xl mx-auto p-4 space-y-4">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = () => setImage(reader.result as string)
          reader.readAsDataURL(file)
        }}
      />

      {image && (
        <img
          src={image}
          alt="preview"
          className="w-full rounded-lg border"
        />
      )}

      <button
        onClick={performQuickScan}
        disabled={isScanning || !image}
        className="w-full py-2 rounded bg-green-600 text-white disabled:opacity-50"
      >
        {isScanning ? "Memindai..." : "Scan Sampah"}
      </button>

      {error && <p className="text-red-500">{error}</p>}

      {overlayResult && (
        <div className="p-3 rounded bg-green-50 text-sm">
          <p><b>Jenis:</b> {overlayResult.type}</p>
          <p>
            <b>Confidence:</b>{" "}
            {Math.round(overlayResult.confidence * 100)}%
          </p>
          <p><b>Terurai:</b> {overlayResult.decompositionTime}</p>
          <p><b>Risiko Mikroplastik:</b> {overlayResult.microplasticRisk}</p>
          <p><b>Alternatif:</b> {overlayResult.ecoAlternative}</p>
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </section>
  )
}
