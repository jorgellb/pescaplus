import { SITE_URL } from '@/lib/seo'

/**
 * Image proxy: rewrites third-party product image URLs (AliExpress/AliCDN CDNs)
 * to descriptive, same-origin paths (`/img/<slug>/<token>`) so the origin host
 * never appears in the customer-facing page. `<token>` is a base64url of the
 * source URL (reversible server-side, host-allowlisted to prevent SSRF); `<slug>`
 * is a keyword-rich label for image SEO. Works in the browser and on the server
 * (uses the global btoa/atob available in both).
 */

const ALLOWED = /(^|\.)(aliexpress-media\.com|alicdn\.com|unsplash\.com)$/i

export function isProxyable(src: string): boolean {
  try {
    return ALLOWED.test(new URL(src).hostname)
  } catch {
    return false
  }
}

export function isAllowedHost(url: string): boolean {
  return isProxyable(url)
}

function slugify(value: string): string {
  return (
    (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'imagen'
  )
}

export function encodeToken(url: string): string {
  return btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeToken(token: string): string {
  const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
  return atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
}

/** Same-origin proxied path for a CDN image, or the src unchanged if not proxyable. */
export function proxiedImage(src: string, label = 'imagen'): string {
  if (!src || !isProxyable(src)) return src
  return `/img/${slugify(label)}/${encodeToken(src)}`
}

/** Absolute proxied URL — for JSON-LD / Open Graph, which require absolute URLs. */
export function absoluteProxiedImage(src: string, label = 'imagen'): string {
  const path = proxiedImage(src, label)
  return path.startsWith('/') ? `${SITE_URL}${path}` : path
}

/**
 * Sanitize a product for the storefront: rewrite image/video fields to proxy
 * paths and drop the affiliate URL, so no origin/marketplace reference reaches a
 * client component's props (and thus the serialized RSC payload). The buy button
 * uses /go/[id] server-side, so the client never needs affiliateUrl. Idempotent.
 */
export function proxyProductImages<
  T extends { title: string; imageUrl: string; images: string[]; videoUrl?: string; affiliateUrl?: string },
>(p: T): T {
  return {
    ...p,
    imageUrl: proxiedImage(p.imageUrl, p.title),
    images: (p.images ?? []).map((i) => proxiedImage(i, p.title)),
    ...(p.videoUrl !== undefined ? { videoUrl: p.videoUrl ? proxiedImage(p.videoUrl, p.title) : '' } : {}),
    ...(p.affiliateUrl !== undefined ? { affiliateUrl: '' } : {}),
  }
}
