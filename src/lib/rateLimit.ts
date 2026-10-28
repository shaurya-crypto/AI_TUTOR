interface RateLimitRecord {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitRecord>()
const failedAttemptsStore = new Map<string, RateLimitRecord>()

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
    for (const [key, record] of failedAttemptsStore.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 30 * 60 * 1000)
      if (record.timestamps.length === 0) {
        failedAttemptsStore.delete(key)
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
 * Brute-force lockout protection: checks if an identifier has exceeded max failed attempts
 */
export function isLockedOut({
  key,
  maxAttempts = 5,
  windowMs = 10 * 60 * 1000,
}: {
  key: string
  maxAttempts?: number
  windowMs?: number
}): { locked: boolean; resetMs: number; count: number } {
  const now = Date.now()
  const record = failedAttemptsStore.get(key)
  if (!record || record.timestamps.length === 0) {
    return { locked: false, resetMs: 0, count: 0 }
  }

  const windowStart = now - windowMs
  const validTimestamps = record.timestamps.filter((ts) => ts > windowStart)

  if (validTimestamps.length >= maxAttempts) {
    const oldest = validTimestamps[0]
    const resetMs = Math.max(0, oldest + windowMs - now)
    return { locked: true, resetMs, count: validTimestamps.length }
  }

  return { locked: false, resetMs: 0, count: validTimestamps.length }
}

/**
 * Records a failed verification attempt
 */
export function recordFailedAttempt({
  key,
  windowMs = 10 * 60 * 1000,
}: {
  key: string
  windowMs?: number
}): number {
  const now = Date.now()
  const record = failedAttemptsStore.get(key) || { timestamps: [] }
  const windowStart = now - windowMs
  const validTimestamps = record.timestamps.filter((ts) => ts > windowStart)
  validTimestamps.push(now)
  failedAttemptsStore.set(key, { timestamps: validTimestamps })
  return validTimestamps.length
}

/**
 * Clears failed attempts upon successful authentication
 */
export function clearFailedAttempts(key: string): void {
  failedAttemptsStore.delete(key)
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
