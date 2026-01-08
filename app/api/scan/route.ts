import { type NextRequest, NextResponse } from "next/server"
import { updateGlobalStats, saveScanResult } from "@/lib/firestore"
import { checkRateLimit, hashImage, getCachedResult, setCachedResult } from "@/lib/rate-limit"
import type { ScanResult } from "@/lib/types"

const RATE_LIMIT_CONFIG = {
  maxRequests: 15,
  windowMs: 60 * 1000,
}

const VISION_ANALYSIS_PROMPT = `You are a non-organic waste classification system. Analyze this image and identify all plastic/non-organic waste objects.

For each object, provide: name, plastic type, code (1-7), decomposition time, microplastic risk, eco-friendly alternative, and environmental impact.

Response in JSON format:
{
  "objects": [{"name": "", "plasticType": "", "plasticCode": "", "decompositionTime": "", "microplasticRisk": "Low/Medium/High", "ecoAlternative": "", "description": ""}],
  "education": {"title": "", "description": "", "tips": []}
}`

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  if (forwarded) return forwarded.split(",")[0].trim()
  if (realIP) return realIP
  return "unknown"
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: `Too many requests. Please wait ${rateLimitResult.retryAfter} seconds.`,
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        },
      )
    }

    const { visualDescription, estimatedObjects, confidence, thumbnailBase64, userId, useAI } = await request.json()

    if (!visualDescription && !thumbnailBase64) {
      return NextResponse.json({ error: "Image data not found" }, { status: 400 })
    }

    // Check cache
    const descHash = hashImage(visualDescription || thumbnailBase64)
    const cachedResult = getCachedResult(descHash)
    if (cachedResult) {
      return NextResponse.json(
        { ...(cachedResult as object), cached: true },
        {
          headers: { "X-RateLimit-Remaining": String(rateLimitResult.remaining) },
        },
      )
    }

    console.log("[v0] Using heuristic classification")
    const basicResult = generateHeuristicResponse(estimatedObjects || ["plastic waste"])
    basicResult.provider = "heuristic"
    basicResult.analysisMode = "local"

    try {
      await Promise.all([saveScanResult(basicResult, userId), updateGlobalStats(basicResult)])
    } catch (firestoreError) {
      console.error("[v0] Firestore error:", firestoreError)
    }

    setCachedResult(descHash, basicResult)

    return NextResponse.json(basicResult, {
      headers: { "X-RateLimit-Remaining": String(rateLimitResult.remaining) },
    })
  } catch (error) {
    console.error("[v0] Scan API Error:", error)
    return NextResponse.json({ error: "Error processing request" }, { status: 500 })
  }
}

function generateHeuristicResponse(estimatedObjects: string[]): ScanResult {
  const plasticDatabase: Record<
    string,
    {
      plasticType: string
      plasticCode: string
      decompositionTime: string
      microplasticRisk: "Low" | "Medium" | "High"
      ecoAlternative: string
      description: string
    }
  > = {
    "clear plastic bottle": {
      plasticType: "PET (Polyethylene Terephthalate)",
      plasticCode: "1",
      decompositionTime: "450 years",
      microplasticRisk: "High",
      ecoAlternative: "Glass or stainless steel bottle",
      description:
        "PET can be recycled but often ends up in oceans. Commonly used for mineral water and soft drink bottles.",
    },
    "water bottle": {
      plasticType: "PET (Polyethylene Terephthalate)",
      plasticCode: "1",
      decompositionTime: "450 years",
      microplasticRisk: "High",
      ecoAlternative: "Reusable water bottle or tumbler",
      description:
        "One of the largest sources of plastic waste in the world. More than 1 million plastic bottles are sold every minute globally.",
    },
    "plastic bottle": {
      plasticType: "PET (Polyethylene Terephthalate)",
      plasticCode: "1",
      decompositionTime: "450 years",
      microplasticRisk: "High",
      ecoAlternative: "Stainless steel or glass bottle",
      description: "PET bottles can be recycled into textile fibers, but the process requires significant energy.",
    },
    "plastic bag": {
      plasticType: "LDPE (Low-Density Polyethylene)",
      plasticCode: "4",
      decompositionTime: "500-1000 years",
      microplasticRisk: "High",
      ecoAlternative: "Cloth or reusable shopping bag",
      description: "Highly harmful to marine life. Turtles often mistake plastic bags for jellyfish.",
    },
    "shopping bag": {
      plasticType: "LDPE (Low-Density Polyethylene)",
      plasticCode: "4",
      decompositionTime: "500-1000 years",
      microplasticRisk: "High",
      ecoAlternative: "Reusable fabric or mesh bag",
      description: "Average plastic bag is used for only 12 minutes but takes hundreds of years to decompose.",
    },
    "white plastic container": {
      plasticType: "PP (Polypropylene)",
      plasticCode: "5",
      decompositionTime: "20-30 years",
      microplasticRisk: "Medium",
      ecoAlternative: "Glass or stainless steel container",
      description: "Relatively safe for hot food, but still needs proper recycling.",
    },
    "bottle cap": {
      plasticType: "HDPE (High-Density Polyethylene)",
      plasticCode: "2",
      decompositionTime: "450 years",
      microplasticRisk: "Low",
      ecoAlternative: "Bamboo or metal bottle cap",
      description: "Can be recycled well. Separate from bottle when recycling.",
    },
    straw: {
      plasticType: "PP (Polypropylene)",
      plasticCode: "5",
      decompositionTime: "200 years",
      microplasticRisk: "High",
      ecoAlternative: "Bamboo, stainless steel, or paper straw",
      description:
        "Commonly found in marine animal stomachs and bird digestive systems. Over 8 billion straws pollute world beaches annually.",
    },
    "plastic cup": {
      plasticType: "PP (Polypropylene)",
      plasticCode: "5",
      decompositionTime: "450 years",
      microplasticRisk: "Medium",
      ecoAlternative: "Reusable glass or metal tumbler",
      description: "Widely used for takeaway beverages. Bring your own tumbler to reduce waste.",
    },
    "foam cup": {
      plasticType: "PP (Polypropylene)",
      plasticCode: "5",
      decompositionTime: "450 years",
      microplasticRisk: "Medium",
      ecoAlternative: "Reusable tumbler or paper cup",
      description: "Single-use foam cups contribute significantly to urban waste.",
    },
    styrofoam: {
      plasticType: "PS (Polystyrene)",
      plasticCode: "6",
      decompositionTime: "500-1000 years",
      microplasticRisk: "High",
      ecoAlternative: "Paper or bamboo container",
      description:
        "Highly dangerous as it easily breaks into millions of microplastic particles that contaminate soil and water.",
    },
    "water dispenser": {
      plasticType: "PC (Polycarbonate)",
      plasticCode: "7",
      decompositionTime: "500+ years",
      microplasticRisk: "Medium",
      ecoAlternative: "Water dispenser with glass or recycling system",
      description: "Can be reused multiple times. Ensure the dispenser is in good condition without scratches.",
    },
    "plastic wrap": {
      plasticType: "LDPE (Low-Density Polyethylene)",
      plasticCode: "4",
      decompositionTime: "450 years",
      microplasticRisk: "Medium",
      ecoAlternative: "Beeswax wrap or silicone lid",
      description: "Difficult to recycle because it is thin and often contaminated with food.",
    },
    "food packaging": {
      plasticType: "Other (Multilayer)",
      plasticCode: "7",
      decompositionTime: "100-500 years",
      microplasticRisk: "High",
      ecoAlternative: "Paper packaging or bring your own container",
      description: "Multilayer packaging is very difficult to recycle due to its composite structure.",
    },
  }

  const objects = estimatedObjects.map((obj) => {
    const lowerObj = obj.toLowerCase()
    for (const [key, data] of Object.entries(plasticDatabase)) {
      if (lowerObj.includes(key) || key.includes(lowerObj)) {
        return { name: obj, ...data }
      }
    }
    // Enhanced default response
    return {
      name: obj,
      plasticType: "Mixed Plastic",
      plasticCode: "7",
      decompositionTime: "100-500 years",
      microplasticRisk: "Medium" as const,
      ecoAlternative: "Choose eco-friendly alternatives that can be reused",
      description: "Plastic type not clearly identified. It is best to reduce use and recycle if possible.",
    }
  })

  return {
    objects,
    education: {
      title: "Plastic Waste Management Tips",
      description:
        "Analysis based on heuristic visual detection. System identifies plastic types based on visual characteristics of objects.",
      tips: [
        "Separate waste by plastic code (1-7)",
        "Rinse plastic containers before recycling",
        "Reduce single-use plastic consumption",
        "Choose products with recyclable packaging",
        "Bring your own bags and containers when shopping",
      ],
    },
    totalObjects: objects.length,
    scanDate: new Date().toISOString(),
    userId: "anonymous",
    provider: "heuristic",
    analysisMode: "local",
  }
}
