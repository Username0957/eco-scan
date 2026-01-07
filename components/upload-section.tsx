"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  UploadIcon,
  ScanIcon,
  LoaderIcon,
  LeafIcon,
  SparklesIcon,
} from "@/components/icons";
import { analyzeImageHybrid } from "@/lib/heuristic-classifier";
import {
  mapPlasticCode,
  getDecompositionTime,
  getMicroplasticRisk,
  getEcoAlternative,
  getPlasticDescription,
  getEducationDescription,
  getEducationTips,
} from "@/lib/types";
import { saveScanResult, updateGlobalStats } from "@/lib/firestore";

/* =========================
   TYPES
========================= */
interface OverlayResult {
  type: string;
  confidence: number;
  decompositionTime: string;
  microplasticRisk: string;
  ecoAlternative: string;
}

type DetectedObject = {
  name: string
  plasticType: string
  plasticCode: string
  decompositionTime: string
  microplasticRisk: "Rendah" | "Sedang" | "Tinggi"
  ecoAlternative: string
  description: string
}

type ScanResult = {
  totalObjects: number;
  objects: DetectedObject[];
  scanDate: string;
  education: {
    title: string;
    description: string;
    tips: string[];
  };
};

interface HeuristicResult {
  plasticType: string;
  plasticCode: string;
  objectName: string;
}

interface AISuggestions {
  detailedAlternatives?: {
    name: string;
    description: string;
    benefits: string[];
    whereToGet: string;
    priceRange: string;
  }[];
  environmentalImpact?: {
    problem: string;
    solution: string;
    funFact: string;
  };
  provider?: string;
}

/* =========================
   COMPONENT
========================= */
export default function UploadSection() {
  const router = useRouter();

  const [image, setImage] = React.useState<string | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [overlayResult, setOverlayResult] =
    React.useState<OverlayResult | null>(null);
  const [heuristicResult, setHeuristicResult] =
    React.useState<HeuristicResult | null>(null);

  const [logs, setLogs] = React.useState<string[]>([]);
  const [showLogs, setShowLogs] = React.useState(false);

  const [aiSuggestions, setAISuggestions] =
    React.useState<AISuggestions | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const scanInProgressRef = React.useRef(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  /* =========================
     LOG
  ========================= */
  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  /* =========================
     BASE64 → IMAGEDATA
  ========================= */
  async function base64ToImageData(base64: string) {
    return new Promise<{
      imageData: ImageData;
      imageEl: HTMLImageElement;
    }>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas error");
        ctx.drawImage(img, 0, 0);
        resolve({
          imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
          imageEl: img,
        });
      };
      img.onerror = reject;
      img.src = base64;
    });
  }

  /* =========================
     SCAN (TIDAK DIUBAH)
  ========================= */
  const performQuickScan = async () => {
    if (!image || scanInProgressRef.current) return;

    scanInProgressRef.current = true;
    setIsScanning(true);
    setError(null);
    setAISuggestions(null);

    try {
      addLog("Menyiapkan gambar...");
      const { imageData, imageEl } = await base64ToImageData(image);

      addLog("Analisis hybrid (Heuristic + TM)...");
      const result = await analyzeImageHybrid(imageData, imageEl);

      addLog(
        `Terdeteksi ${result.material} (${Math.round(
          result.confidence * 100
        )}%)`
      );

      setOverlayResult({
        type: result.material,
        confidence: result.confidence,
        decompositionTime: "±100–500 tahun",
        microplasticRisk:
          result.material === "PS" || result.material === "PVC"
            ? "Tinggi"
            : "Sedang",
        ecoAlternative: "Gunakan alternatif pakai ulang atau biodegradable",
      });

      setHeuristicResult({
        plasticType: result.material,
        plasticCode: "-",
        objectName: result.material,
      });

      const detectedType = result.material;

      const objects: DetectedObject[] = [
        {
          name: "Sampah Plastik Terdeteksi",
          plasticType: detectedType,
          plasticCode: mapPlasticCode(detectedType),
          decompositionTime: getDecompositionTime(detectedType),
          microplasticRisk: getMicroplasticRisk(detectedType) as
            | "Rendah"
            | "Sedang"
            | "Tinggi",
          ecoAlternative: getEcoAlternative(detectedType),
          description: getPlasticDescription(detectedType),
        },
      ];

      const scanResult: ScanResult = {
        totalObjects: objects.length,
        objects,
        scanDate: new Date().toISOString(),
        education: {
          title: `Kenapa plastik ${detectedType} berbahaya?`,
          description:
            getEducationDescription(detectedType) ||
            "Plastik ini berdampak buruk bagi lingkungan",
          tips: getEducationTips(detectedType) || [
            "Gunakan alternatif ramah lingkungan",
            "Kurangi plastik sekali pakai",
          ],
        },
      };

      sessionStorage.setItem("scanResult", JSON.stringify(scanResult));

      try {
        await saveScanResult(scanResult);
        await updateGlobalStats(scanResult);
        addLog("Data tersimpan ke Firestore");
      } catch {
        addLog("Data tersimpan lokal (Firestore gagal)");
      }
    } catch (e) {
      console.error(e);
      setError("Gagal menganalisis gambar");
      addLog("Error saat analisis");
    } finally {
      setIsScanning(false);
      scanInProgressRef.current = false;
    }
  };

  /* =========================
     AI SUGGESTIONS (SAFE)
  ========================= */
  const fetchAISuggestions = async () => {
    if (!heuristicResult) return;
    setIsLoadingSuggestions(true);
    setShowSuggestions(true);

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(heuristicResult),
      });

      if (!res.ok) throw new Error("AI response error");

      const data = await res.json();
      setAISuggestions(data);
    } catch {
      setAISuggestions(null);
      addLog("AI gagal, menggunakan data lokal");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="mx-auto max-w-xl">
      <Card className="border-dashed border-2 p-6">
        {!image ? (
          <label className="flex flex-col items-center gap-4 cursor-pointer">
            <UploadIcon className="h-10 w-10 text-primary" />
            <p className="text-sm text-muted-foreground">
              Upload gambar sampah plastik
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = () => setImage(r.result as string);
                r.readAsDataURL(f);
              }}
            />
          </label>
        ) : (
          <>
            <img src={image} className="rounded-lg mb-3" alt="preview" />

            <Button
              onClick={performQuickScan}
              disabled={isScanning}
              className="w-full gap-2"
            >
              {isScanning ? (
                <>
                  <LoaderIcon className="animate-spin h-4 w-4" />
                  Memindai...
                </>
              ) : (
                <>
                  <ScanIcon className="h-4 w-4" />
                  Scan Sampah
                </>
              )}
            </Button>

            {heuristicResult && (
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={fetchAISuggestions}
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                Saran AI
              </Button>
            )}

            {overlayResult && (
              <Button
                variant="outline"
                className="w-full mt-2 gap-2"
                onClick={() => router.push("/hasil")}
              >
                <LeafIcon className="h-4 w-4 text-green-600" />
                Lihat Detail
              </Button>
            )}

            <button
              onClick={() => setShowLogs(!showLogs)}
              className="text-xs mt-2 text-muted-foreground"
            >
              {showLogs ? "Sembunyikan log" : "Tampilkan log"}
            </button>

            {showLogs && (
              <div className="mt-2 text-xs bg-muted p-2 rounded">
                {logs.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            )}

            {error && (
              <div className="text-sm text-destructive mt-2">{error}</div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
