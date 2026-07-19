import crypto from 'crypto'

// Helpers for the inbound webhook surface. Pure (no electron import) so they are
// unit-testable.

/**
 * Constant-time string comparison for secrets. A plain `!==` leaks the shared
 * secret one byte at a time via response timing; timingSafeEqual does not.
 * Length is compared first (timingSafeEqual throws on a length mismatch), which
 * only reveals the length, not the contents.
 */
export function safeEqual(a: unknown, b: unknown): boolean {
  const ab = Buffer.from(typeof a === 'string' ? a : '')
  const bb = Buffer.from(typeof b === 'string' ? b : '')
  if (ab.length === 0 || bb.length === 0) return false
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

/**
 * Fixed-window rate limiter. Returns true when the caller is over the limit.
 * `now` is injectable for testing.
 */
export function createRateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>()
  return function isLimited(key: string, now: number = Date.now()): boolean {
    const entry = hits.get(key)
    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
      return false
    }
    entry.count++
    return entry.count > max
  }
}
