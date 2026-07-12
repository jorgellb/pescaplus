/**
 * Minimal in-memory fixed-window rate limiter keyed by IP + bucket name.
 *
 * This is a self-contained baseline (no Redis/Upstash needed). On a single
 * server or a warm serverless instance it meaningfully throttles abuse; on a
 * horizontally-scaled deployment each instance keeps its own counters, so for
 * strict global limits swap this for a shared store (e.g. Upstash) later.
 */
type Bucket = { count: number; resetAt: number }

const store = globalThis as unknown as { __rateBuckets?: Map<string, Bucket> }
const buckets = store.__rateBuckets ?? (store.__rateBuckets = new Map<string, Bucket>())

export interface RateResult {
  ok: boolean
  /** Seconds until the window resets (for the Retry-After header). */
  retryAfter: number
  remaining: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now()

  // Opportunistic cleanup so the map can't grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
  }

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0, remaining: limit - 1 }
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)), remaining: 0 }
  }

  bucket.count += 1
  return { ok: true, retryAfter: 0, remaining: limit - bucket.count }
}

/** Best-effort client IP from proxy headers (Vercel/Nginx set x-forwarded-for). */
export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip') || '0.0.0.0'
}

/** Standard 429 response with a Retry-After header. */
export function tooManyRequests(retryAfter: number, message = 'Demasiadas solicitudes. Inténtalo en un momento.') {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter),
    },
  })
}
