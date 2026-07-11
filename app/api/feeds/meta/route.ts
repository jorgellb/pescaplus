import { NextResponse } from 'next/server'
import { listProducts } from '@/lib/products-store'
import { buildMetaFeed } from '@/lib/feeds'
import { SITE_URL } from '@/lib/seo'

/** Meta (Instagram / Facebook) catalog feed (CSV). Public; cached at the CDN. */
export async function GET() {
  const products = await listProducts()
  const csv = buildMetaFeed(products, SITE_URL)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'inline; filename="pescaplus-meta-feed.csv"',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
