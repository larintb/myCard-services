// Simple in-memory rate limiter
// Note: resets on server restart. For production, use Redis or Upstash.

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

interface RateLimitOptions {
  limit: number       // max requests
  windowMs: number    // time window in milliseconds
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + options.windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: options.limit - 1, resetAt }
  }

  if (entry.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: options.limit - entry.count, resetAt: entry.resetAt }
}

// Extract IP from Next.js request
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
