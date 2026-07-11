import { NextResponse } from 'next/server'
import { listProducts } from '@/lib/products-store'
import { buildGoogleFeed } from '@/lib/feeds'
import { SITE_URL } from '@/lib/seo'

/** Google Merchant Center product feed (RSS 2.0 XML). Public; cached at the CDN. */
export async function GET() {
  const products = await listProducts()
  const xml = buildGoogleFeed(products, SITE_URL)
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
