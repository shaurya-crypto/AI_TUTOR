interface RateLimitRecord {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Periodically clean up records older than 30 minutes
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 30 * 60 * 1000)
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)

  if (typeof timer.unref === 'function') {
    timer.unref()
  }
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetMs: number
}

/**
 * Sliding window rate limiter
 */
export function checkRateLimit({
  key,
  maxRequests,
  windowMs,
}: {
  key: string
  maxRequests: number
  windowMs: number
}): RateLimitResult {
  const now = Date.now()
  const record = rateLimitStore.get(key) || { timestamps: [] }

  const windowStart = now - windowMs
  const validTimestamps = record.timestamps.filter((ts) => ts > windowStart)

  if (validTimestamps.length >= maxRequests) {
    const oldest = validTimestamps[0]
    const resetMs = Math.max(0, oldest + windowMs - now)
    return {
      success: false,
      remaining: 0,
      resetMs,
    }
  }

  validTimestamps.push(now)
  rateLimitStore.set(key, { timestamps: validTimestamps })

  return {
    success: true,
    remaining: Math.max(0, maxRequests - validTimestamps.length),
    resetMs: windowMs,
  }
}

/**
 * Extracts client IP from incoming Request headers
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return '127.0.0.1'
}
