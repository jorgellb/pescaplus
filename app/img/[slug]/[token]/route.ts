import { NextRequest, NextResponse } from 'next/server'
import { decodeToken, isAllowedHost } from '@/lib/img-proxy'

const IMMUTABLE = 'public, max-age=31536000, immutable, s-maxage=31536000, stale-while-revalidate=86400'

/**
 * The AliExpress CDN serves a lighter WebP when the image path gets a size
 * suffix, so we request that (much smaller = faster) and fall back to the
 * original if it isn't available.
 */
function lighterVariant(url: string): string | null {
  return /aliexpress-media\.com\/.+\.(jpe?g|png)$/i.test(url) ? `${url}_640x640.jpg` : null
}

async function fetchImage(url: string) {
  return fetch(url, { headers: { Accept: 'image/webp,image/*' }, cache: 'force-cache' })
}

/**
 * Streams a product image from an allowlisted CDN through our own domain, so the
 * origin host never appears client-side. The token is the base64url of the source
 * URL; the host is re-validated here to prevent SSRF. Cached hard (images are
 * content-addressed and effectively immutable).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  let url: string
  try {
    url = decodeToken(token)
  } catch {
    return new NextResponse('Bad token', { status: 400 })
  }
  if (!/^https:\/\//i.test(url) || !isAllowedHost(url)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const light = lighterVariant(url)
    let upstream = light ? await fetchImage(light) : null
    if (!upstream || !upstream.ok || !upstream.body) {
      upstream = await fetchImage(url) // fallback to the original
    }
    if (!upstream.ok || !upstream.body) {
      return new NextResponse('Not found', { status: 404 })
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
        'Cache-Control': IMMUTABLE,
      },
    })
  } catch {
    return new NextResponse('Upstream error', { status: 502 })
  }
}
