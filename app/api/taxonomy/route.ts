import { NextResponse } from 'next/server'
import { getTaxonomy } from '@/lib/taxonomy-store'

/**
 * Public, cacheable taxonomy (category names + subcategories). Used by the client
 * navbar so category renames from the admin show up in navigation. No sensitive
 * data — just labels.
 */
export async function GET() {
  const taxonomy = await getTaxonomy()
  return NextResponse.json(
    { success: true, taxonomy },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  )
}
