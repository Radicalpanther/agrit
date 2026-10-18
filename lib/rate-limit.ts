interface RateLimitRecord {
  count: number
  resetAt: number
}

// In-memory sliding window rate limiter
const ipStore = new Map<string, RateLimitRecord>()

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [ip, record] of ipStore.entries()) {
      if (now > record.resetAt) {
        ipStore.delete(ip)
      }
    }
  }, 5 * 60 * 1000)
}

/**
 * Checks whether an IP has exceeded the allowed request limit.
 * @param ip Client IP address string
 * @param limit Max requests allowed in window (default: 20)
 * @param windowMs Time window in milliseconds (default: 60,000ms / 1 min)
 */
export function checkRateLimit(
  ip: string,
  limit = 20,
  windowMs = 60 * 1000,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const record = ipStore.get(ip)

  if (!record || now > record.resetAt) {
    const resetAt = now + windowMs
    ipStore.set(ip, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }

  record.count += 1
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return '127.0.0.1'
}
