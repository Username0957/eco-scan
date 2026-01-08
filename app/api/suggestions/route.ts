import { type NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"

const SUGGESTION_PROMPT = `You are an environmental and plastic recycling expert. Based on the plastic type provided, give DETAILED personal and useful advice in English context.

Response format (JSON):
{
  "detailedAlternatives": [
    {
      "name": "alternative name",
      "description": "detailed description",
      "benefits": ["benefit 1", "benefit 2"],
      "whereToGet": "where to get it",
      "priceRange": "price range in USD"
    }
  ],
  "disposalTips": [
    {
      "step": "step",
      "description": "detailed description"
    }
  ],
  "environmentalImpact": {
    "problem": "environmental problem from this plastic",
    "solution": "solution that can be done",
    "funFact": "interesting fact"
  },
  "localInfo": {
    "recyclingLocations": "information about recycling facilities",
    "communityTips": "tips from local communities"
  }
}`

const RATE_LIMIT_CONFIG = {
  maxRequests: 20,
  windowMs: 60 * 1000,
}

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
    const rateLimit = checkRateLimit(clientIP + "-suggestions", RATE_LIMIT_CONFIG)

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 },
      )
    }

    const { plasticType } = await request.json()

    if (!plasticType) {
      return NextResponse.json({ error: "Plastic type not found" }, { status: 400 })
    }

    /* Try Gemini AI */
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        const aiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" +
            process.env.GOOGLE_GENERATIVE_AI_API_KEY,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `
⚠️ IMPORTANT:
- DO NOT write opening sentences
- DO NOT write closing text
- DO NOT write text outside of JSON
- MUST reply with 1 valid JSON object

${SUGGESTION_PROMPT}

Plastic type: ${plasticType}
`,
                    },
                  ],
                },
              ],
            }),
          },
        )

        if (!aiResponse.ok) {
          throw new Error("Gemini HTTP error")
        }

        const aiData = await aiResponse.json()
        const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text

        if (!rawText) {
          throw new Error("Gemini empty response")
        }

        /* Strict JSON extraction */
        const start = rawText.indexOf("{")
        const end = rawText.lastIndexOf("}")

        if (start === -1 || end === -1 || end <= start) {
          throw new Error("No JSON found in Gemini response")
        }

        const jsonString = rawText.slice(start, end + 1)
        const parsed = JSON.parse(jsonString)

        return NextResponse.json({
          ...parsed,
          provider: "gemini",
        })
      } catch (error) {
        console.warn(
          "[v0] Gemini failed, fallback to default alternatives:",
          error instanceof Error ? error.message : String(error),
        )
        // Continue to fallback below
      }
    }

    /* Final fallback */
    const fallbackData = {
      detailedAlternatives: getDefaultAlternatives(plasticType),
      disposalTips: getDefaultDisposalTips(plasticType),
      environmentalImpact: getDefaultEnvironmentalImpact(plasticType),
      localInfo: getDefaultLocalInfo(plasticType),
      provider: "local",
    }
    console.log("[v0] Using local fallback for plastic type:", plasticType)
    return NextResponse.json(fallbackData)
  } catch (error) {
    console.error("[v0] Suggestions API Error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

function getDefaultAlternatives(plasticType: string) {
  const alternatives: Record<
    string,
    Array<{ name: string; description: string; benefits: string[]; whereToGet: string; priceRange: string }>
  > = {
    "PET (Polyethylene Terephthalate)": [
      {
        name: "Stainless Steel Tumbler",
        description: "Food-grade stainless steel water bottle that is durable and BPA-free",
        benefits: ["Lasts 10+ years", "No plastic taste", "Easy to clean", "Keeps drink temperature stable"],
        whereToGet: "Amazon, Target, Costco, or kitchenware stores",
        priceRange: "$15 - $50",
      },
      {
        name: "Glass Bottle with Sleeve",
        description: "Glass bottle with silicone or fabric protective cover to prevent breakage",
        benefits: ["100% plastic-free", "No odor absorption", "Easy to wash", "Aesthetic"],
        whereToGet: "IKEA, Amazon, or eco-friendly stores",
        priceRange: "$10 - $40",
      },
    ],
    "LDPE (Low-Density Polyethylene)": [
      {
        name: "Canvas Shopping Bag",
        description: "Thick canvas bag that can be folded and washed repeatedly",
        benefits: ["Can be used 1000+ times", "Easy to fold", "Machine washable", "Holds heavy items well"],
        whereToGet: "Target, Whole Foods, local markets, or online eco-shops",
        priceRange: "$5 - $25",
      },
      {
        name: "Mesh Shopping Bag",
        description: "Mesh bag for fresh produce that allows items to breathe",
        benefits: ["Produce stays fresh", "Very lightweight", "Easy to clean", "Space-saving"],
        whereToGet: "Local markets or eco-friendly online shops",
        priceRange: "$3 - $15",
      },
    ],
    "PP (Polypropylene)": [
      {
        name: "Stainless Steel Straws Set",
        description: "Set of stainless steel straws with cleaning brush and carrying pouch",
        benefits: ["Lifetime use", "Easy to clean", "Portable", "Various sizes available"],
        whereToGet: "Amazon, Target, Costco",
        priceRange: "$5 - $20",
      },
      {
        name: "Bamboo Straws",
        description: "Straws made from natural bamboo that are biodegradable",
        benefits: ["100% natural", "Biodegradable", "Lightweight", "Aesthetic"],
        whereToGet: "Craft stores or online marketplaces",
        priceRange: "$2 - $10",
      },
    ],
    "PS (Polystyrene)": [
      {
        name: "Bamboo Fiber Food Container",
        description: "Food container made from biodegradable bamboo fiber",
        benefits: ["100% natural", "Biodegradable in 6 months", "Lightweight", "Microwave safe"],
        whereToGet: "Eco-friendly kitchenware stores",
        priceRange: "$8 - $35",
      },
      {
        name: "Stainless Steel Lunch Box",
        description: "Stainless steel lunch box with compartments",
        benefits: ["Durable", "Leak-proof", "Easy to clean", "Food-grade"],
        whereToGet: "Amazon, Target, department stores",
        priceRange: "$25 - $80",
      },
    ],
    "HDPE (High-Density Polyethylene)": [
      {
        name: "Glass Container with Bamboo Lid",
        description: "Glass storage container with bamboo lid",
        benefits: ["Durable", "Does not absorb odors", "Aesthetic", "Eco-friendly"],
        whereToGet: "IKEA, Amazon, or online stores",
        priceRange: "$15 - $60",
      },
    ],
  }

  // Find matching key or return default
  for (const [key, value] of Object.entries(alternatives)) {
    if (plasticType.includes(key) || key.includes(plasticType)) {
      return value
    }
  }

  return alternatives["PET (Polyethylene Terephthalate)"]
}

function getDefaultDisposalTips(plasticType: string) {
  const tips: Record<string, Array<{ step: string; description: string }>> = {
    "PET (Polyethylene Terephthalate)": [
      { step: "1. Rinse", description: "Rinse the plastic bottle thoroughly with water" },
      { step: "2. Remove label", description: "Remove the plastic label if possible" },
      { step: "3. Crush", description: "Crush the bottle to save space" },
      { step: "4. Sort", description: "Place in the correct recycling bin" },
    ],
    "LDPE (Low-Density Polyethylene)": [
      { step: "1. Clean", description: "Clean plastic bags and films thoroughly" },
      { step: "2. Dry", description: "Make sure they are completely dry" },
      { step: "3. Bundle", description: "Bundle similar items together" },
      { step: "4. Recycle", description: "Check local recycling centers for film collection" },
    ],
    "PP (Polypropylene)": [
      { step: "1. Clean", description: "Remove food residue from containers" },
      { step: "2. Dry", description: "Let containers dry completely" },
      { step: "3. Stack", description: "Stack containers neatly" },
      { step: "4. Place", description: "Place in your recycling bin" },
    ],
    "PS (Polystyrene)": [
      { step: "1. Separate", description: "Keep foam items separate from other plastic" },
      { step: "2. Avoid compression", description: "Do not compress foam as it breaks apart" },
      { step: "3. Find special location", description: "Many recycling centers have specific drop-offs for foam" },
      { step: "4. Ask locally", description: "Contact your local waste management for options" },
    ],
    "HDPE (High-Density Polyethylene)": [
      { step: "1. Clean", description: "Rinse containers thoroughly" },
      { step: "2. Cap", description: "Keep caps on containers" },
      { step: "3. Place", description: "Put in recycling bin" },
      { step: "4. Monitor", description: "Check for any hazardous materials" },
    ],
  }

  for (const [key, value] of Object.entries(tips)) {
    if (plasticType.includes(key) || key.includes(plasticType)) {
      return value
    }
  }

  return tips["PET (Polyethylene Terephthalate)"]
}

function getDefaultEnvironmentalImpact(plasticType: string) {
  const impacts: Record<string, { problem: string; solution: string; funFact: string }> = {
    "PET (Polyethylene Terephthalate)": {
      problem: "PET bottles take 400+ years to decompose, harming marine life",
      solution: "Use refillable containers and support plastic-free packaging initiatives",
      funFact: "One PET bottle can be recycled into 5 new bottles",
    },
    "LDPE (Low-Density Polyethylene)": {
      problem: "Plastic bags often end up in oceans, killing sea turtles and birds",
      solution: "Switch to reusable cloth bags and support legislation banning single-use bags",
      funFact: "A plastic bag is used for 12 minutes but takes 20 years to decompose",
    },
    "PP (Polypropylene)": {
      problem: "Breaks down into microplastics that contaminate food chains",
      solution: "Buy from package-free stores and reduce plastic consumption",
      funFact: "PP is one of the most recycled plastics, with a 25-30% recycling rate",
    },
    "PS (Polystyrene)": {
      problem: "Foam products easily fragment into microplastics that persist for decades",
      solution: "Avoid takeout containers and ask restaurants for compostable alternatives",
      funFact: "Styrofoam takes over 500 years to decompose",
    },
    "HDPE (High-Density Polyethylene)": {
      problem: "Milk jugs and plastic bags harm wildlife through entanglement",
      solution: "Use glass milk containers and avoid plastic bags",
      funFact: "HDPE is recycled into lumber, playground equipment, and park benches",
    },
  }

  for (const [key, value] of Object.entries(impacts)) {
    if (plasticType.includes(key) || key.includes(plasticType)) {
      return value
    }
  }

  return impacts["PET (Polyethylene Terephthalate)"]
}

function getDefaultLocalInfo(plasticType: string) {
  return {
    recyclingLocations: "Visit Earth911.com or your local waste management authority for recycling centers near you",
    communityTips: "Join local environmental groups to organize community cleanup events and plastic-free initiatives",
  }
}
