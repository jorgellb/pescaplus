import { NextRequest, NextResponse } from 'next/server'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { isAliExpressConfigured, searchAliExpressProducts } from '@/lib/aliexpress'
import { fishingKeyword } from '@/lib/fishing'

/** Search AliExpress live products for the admin importer (admin only). */
export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  if (!isAliExpressConfigured()) {
    return NextResponse.json(
      { success: false, error: 'AliExpress no está configurado (define ALIEXPRESS_APP_KEY/SECRET)' },
      { status: 503 },
    )
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || 'spinning'
  const keyword = searchParams.get('keyword')?.trim()
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  // AliExpress caps page_size at 50; use a large page for more results per fetch.
  const pageSize = Math.min(50, Math.max(10, Number.parseInt(searchParams.get('pageSize') || '40', 10) || 40))

  // Keep searches in the fishing domain.
  const query = keyword ? `${keyword} fishing` : fishingKeyword(category)
  const products = await searchAliExpressProducts(query, category, page, pageSize)

  return NextResponse.json({ success: true, products, query, page, pageSize })
}
