import { NextRequest, NextResponse } from 'next/server'
import { decodeToken, isAllowedHost } from '@/lib/img-proxy'

/**
 * Streams a product image from an allowlisted CDN through our own domain, so the
 * origin host never appears client-side. The token is the base64url of the source
 * URL; the host is re-validated here to prevent SSRF. Cached hard (images are
 * content-addressed by URL and effectively immutable).
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
    const upstream = await fetch(url, { headers: { Accept: 'image/*' }, cache: 'force-cache' })
    if (!upstream.ok || !upstream.body) {
      return new NextResponse('Not found', { status: 404 })
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable, s-maxage=31536000, stale-while-revalidate=86400',
      },
    })
  } catch {
    return new NextResponse('Upstream error', { status: 502 })
  }
}
