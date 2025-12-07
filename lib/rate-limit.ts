// Simple in-memory rate limiter
// In production, use Redis (Upstash) for distributed rate limiting

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now()
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        rateLimitMap.delete(key)
      }
    }
  },
  5 * 60 * 1000,
)

export interface RateLimitConfig {
  maxRequests: number // Maximum requests allowed
  windowMs: number // Time window in milliseconds
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
  retryAfter?: number // seconds until reset
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 5, windowMs: 60 * 1000 },
): RateLimitResult {
  const now = Date.now()
  const key = `rate_limit:${identifier}`

  let entry = rateLimitMap.get(key)

  // If no entry or window has expired, create new entry
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    }
  }

  // Increment count
  entry.count++
  rateLimitMap.set(key, entry)

  const remaining = Math.max(0, config.maxRequests - entry.count)
  const retryAfter = Math.ceil((entry.resetTime - now) / 1000)

  if (entry.count > config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    }
  }

  return {
    success: true,
    remaining,
    resetTime: entry.resetTime,
  }
}

// Simple hash function to create a cache key from image data
export function hashImage(imageData: string): string {
  let hash = 0
  const str = imageData.slice(0, 1000) + imageData.slice(-1000) // Use start and end of image
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash.toString(36)
}

// Simple in-memory cache for scan results
const resultCache = new Map<string, { result: unknown; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export function getCachedResult(imageHash: string): unknown | null {
  const cached = resultCache.get(imageHash)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result
  }
  if (cached) {
    resultCache.delete(imageHash)
  }
  return null
}

export function setCachedResult(imageHash: string, result: unknown): void {
  // Limit cache size to 100 entries
  if (resultCache.size >= 100) {
    const firstKey = resultCache.keys().next().value
    if (firstKey) resultCache.delete(firstKey)
  }
  resultCache.set(imageHash, { result, timestamp: Date.now() })
}
