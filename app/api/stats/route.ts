import { NextResponse } from "next/server"
import { getGlobalStats, getRecentScans } from "@/lib/firestore"

export async function GET() {
  try {
    const [globalStats, recentScans] = await Promise.all([getGlobalStats(), getRecentScans(10)])

    return NextResponse.json({
      stats: globalStats,
      recentScans,
    })
  } catch (error) {
    console.error("[v0] Stats API Error:", error)
    return NextResponse.json({ error: "Failed to fetch statistics" }, { status: 500 })
  }
}
