// Eco Score Badge Component
// Visual representation of environmental impact score

"use client"
import { LeafIcon } from "lucide-react"
import type { EcoScore } from "@/lib/eco-score"

interface EcoScoreBadgeProps {
  ecoScore: EcoScore
  size?: "sm" | "md" | "lg"
  showExplanation?: boolean
}

export function EcoScoreBadge({ ecoScore, size = "md", showExplanation = false }: EcoScoreBadgeProps) {
  const sizeClasses = {
    sm: "w-16 h-16 text-xs",
    md: "w-24 h-24 text-sm",
    lg: "w-32 h-32 text-base",
  }

  const circumference = size === "sm" ? 50 * 2 * Math.PI : size === "md" ? 45 * 2 * Math.PI : 60 * 2 * Math.PI
  const offset = circumference - (ecoScore.score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg className={sizeClasses[size]} viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={size === "sm" ? "50" : size === "md" ? "45" : "55"}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
            opacity="0.2"
          />
          {/* Score circle */}
          <circle
            cx="60"
            cy="60"
            r={size === "sm" ? "50" : size === "md" ? "45" : "55"}
            fill="none"
            stroke={ecoScore.color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <LeafIcon className="h-6 w-6 mb-1" style={{ color: ecoScore.color }} />
          <span className="text-2xl font-bold" style={{ color: ecoScore.color }}>
            {ecoScore.score}
          </span>
        </div>
      </div>

      <div className="text-center">
        <div
          className="rounded-full px-3 py-1 text-xs font-medium"
          style={{
            backgroundColor: `${ecoScore.color}20`,
            color: ecoScore.color,
          }}
        >
          {ecoScore.level}
        </div>
        {ecoScore.confidence < 0.6 && (
          <p className="mt-2 text-xs text-muted-foreground">⚠️ Akurasi rendah - hasil mungkin tidak akurat</p>
        )}
      </div>

      {showExplanation && (
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-sm text-muted-foreground">{ecoScore.explanation}</p>
        </div>
      )}
    </div>
  )
}
