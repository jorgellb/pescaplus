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
  const page = Number.parseInt(searchParams.get('page') || '1', 10)

  // Keep searches in the fishing domain.
  const query = keyword ? `${keyword} fishing` : fishingKeyword(category)
  const products = await searchAliExpressProducts(query, category, page, 20)

  return NextResponse.json({ success: true, products, query })
}
