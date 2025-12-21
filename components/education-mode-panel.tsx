// Education Mode Panel Component
// Shows educational content when toggle is ON

"use client"

import * as React from "react"
import { InfoIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import type { DetectedObject } from "@/lib/types"

interface EducationModePanelProps {
  object: DetectedObject
  isOpen?: boolean
}

export function EducationModePanel({ object, isOpen = false }: EducationModePanelProps) {
  const [expanded, setExpanded] = React.useState(isOpen)

  const educationContent = {
    whyHarmful: getWhyHarmful(object.plasticCode, object.microplasticRisk),
    decompositionExplained: getDecompositionExplanation(object.decompositionTime),
    microplasticRiskExplained: getMicroplasticExplanation(object.microplasticRisk),
    alternatives: getAlternatives(object.plasticCode),
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-primary/10"
      >
        <div className="flex items-center gap-2">
          <InfoIcon className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">Mode Edukasi</span>
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            Pelajari Lebih Lanjut
          </span>
        </div>
        {expanded ? (
          <ChevronUpIcon className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-primary/20 p-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Mengapa Plastik Ini Berbahaya?</h4>
            <p className="text-sm text-muted-foreground">{educationContent.whyHarmful}</p>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Waktu Dekomposisi</h4>
            <p className="text-sm text-muted-foreground">{educationContent.decompositionExplained}</p>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Risiko Mikroplastik</h4>
            <p className="text-sm text-muted-foreground">{educationContent.microplasticRiskExplained}</p>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Alternatif Ramah Lingkungan</h4>
            <ul className="space-y-2">
              {educationContent.alternatives.map((alt, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 text-primary">✓</span>
                  <span>{alt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function getWhyHarmful(code: string, risk: string): string {
  const explanations: Record<string, string> = {
    "1": "PET mudah terurai menjadi mikroplastik saat terkena panas dan sinar UV. Mikroplastik ini dapat masuk ke rantai makanan dan air yang kita minum.",
    "2": "HDPE lebih stabil namun tetap menghasilkan mikroplastik seiring waktu. Proses produksinya juga menghasilkan emisi karbon yang tinggi.",
    "3": "PVC sangat berbahaya karena mengandung klorin. Saat dibakar, menghasilkan dioksin yang sangat beracun dan karsinogenik.",
    "4": "LDPE sulit didaur ulang dan sering berakhir di lautan. Bentuknya yang tipis mudah pecah menjadi mikroplastik.",
    "5": "PP relatif lebih aman namun tetap mencemari lingkungan. Sedotan dan tutup botol PP sering tertelan hewan laut.",
    "6": "Styrofoam (PS) sangat ringan sehingga mudah terbang dan mencemari lingkungan. Sangat mudah pecah menjadi mikroplastik yang berbahaya.",
    "7": "Plastik campuran sangat sulit didaur ulang karena terdiri dari berbagai jenis plastik. Biasanya berakhir di TPA atau dibakar.",
  }
  return (
    explanations[code] || "Plastik ini memiliki dampak negatif terhadap lingkungan jika tidak dikelola dengan baik."
  )
}

function getDecompositionExplanation(time: string): string {
  if (time.includes("1000")) {
    return `${time} adalah waktu yang sangat lama - lebih dari 40 generasi manusia! Bayangkan, plastik yang Anda buang hari ini akan tetap ada hingga cicit-cicit Anda dewasa.`
  } else if (time.includes("500")) {
    return `${time} berarti plastik ini akan bertahan lebih lama dari usia rata-rata manusia. Plastik yang Anda buang hari ini akan outlive anak cucu Anda.`
  } else if (time.includes("450")) {
    return `${time} - hampir setengah milenium! Ini berarti plastik dari zaman Columbus masih ada hingga sekarang jika mereka menggunakannya.`
  }
  return `Waktu dekomposisi ${time} menunjukkan plastik ini akan bertahan sangat lama di lingkungan.`
}

function getMicroplasticExplanation(risk: string): string {
  const explanations: Record<string, string> = {
    Tinggi:
      "Risiko tinggi berarti plastik ini sangat mudah pecah menjadi partikel kecil (mikroplastik) yang tidak terlihat mata. Mikroplastik ini sudah ditemukan dalam air minum, makanan laut, bahkan di dalam tubuh manusia.",
    Sedang:
      "Plastik ini dapat menghasilkan mikroplastik seiring waktu, terutama saat terkena sinar matahari dan gesekan. Mikroplastik dapat membawa bahan kimia berbahaya dan dimakan oleh hewan.",
    Rendah:
      "Meskipun risikonya lebih rendah, plastik ini tetap dapat menghasilkan mikroplastik dalam jangka panjang. Lebih baik didaur ulang atau diganti dengan alternatif non-plastik.",
  }
  return explanations[risk] || "Risiko mikroplastik perlu diperhatikan untuk menjaga kesehatan lingkungan."
}

function getAlternatives(code: string): string[] {
  const alternatives: Record<string, string[]> = {
    "1": [
      "Botol stainless steel yang dapat digunakan berulang kali",
      "Botol kaca dengan pelindung silikon",
      "Tumbler dengan insulasi untuk menjaga suhu",
    ],
    "2": [
      "Wadah kaca dengan tutup kayu atau bambu",
      "Kontainer stainless steel food-grade",
      "Wadah keramik untuk penyimpanan makanan",
    ],
    "3": [
      "Pipa logam atau tembaga (lebih tahan lama)",
      "Material alternatif seperti PVC-free flooring",
      "Konsultasi dengan ahli untuk material yang lebih aman",
    ],
    "4": [
      "Tas kain katun atau kanvas yang kuat",
      "Tas belanja dari bahan daur ulang",
      "Beeswax wrap sebagai pengganti plastik wrap",
    ],
    "5": ["Sedotan stainless steel atau bambu", "Wadah kaca untuk makanan panas", "Tutup botol dari logam atau kayu"],
    "6": [
      "Wadah makanan dari daun pisang atau bambu",
      "Kotak makan dari stainless steel",
      "Kemasan kertas atau kardus untuk takeaway",
    ],
    "7": [
      "Hindari produk dengan kode 7",
      "Pilih produk dengan kode 2 atau 5 jika harus plastik",
      "Prioritaskan produk tanpa kemasan",
    ],
  }
  return (
    alternatives[code] || [
      "Gunakan alternatif non-plastik sebisa mungkin",
      "Daur ulang dengan benar jika harus menggunakan plastik",
    ]
  )
}
