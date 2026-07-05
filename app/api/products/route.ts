import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Product, ProductsApiResponse } from '@/types'
import { listProducts, createProduct } from '@/lib/products-store'
import { fishingKeyword, isFishingTypeId } from '@/lib/fishing'
import { isAliExpressConfigured, searchAliExpressProducts } from '@/lib/aliexpress'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { getSettings } from '@/lib/settings-store'

/**
 * Product listing. Reads from the mutable store (so admin edits show up here),
 * always available thanks to the in-memory fallback. When AliExpress credentials
 * are present, live results replace the store list as a best-effort enhancement.
 */
export async function GET(request: NextRequest): Promise<NextResponse<ProductsApiResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const typeParam = searchParams.get('typeFishing') ?? undefined
    const search = searchParams.get('search')?.trim() || undefined
    const scopedType = typeParam && isFishingTypeId(typeParam) ? typeParam : undefined

    let products: Product[] = await listProducts({ search, typeFishing: scopedType ?? typeParam })
    let source: ProductsApiResponse['source'] = 'catalog'

    if (isAliExpressConfigured()) {
      const keyword = search ?? fishingKeyword(typeParam ?? '')
      const live = await searchAliExpressProducts(keyword, typeParam ?? 'general')
      if (live.length > 0) {
        products = live
        source = 'aliexpress'
      }
    }

    return NextResponse.json({ success: true, products, source })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching products' },
      { status: 500 },
    )
  }
}

const productInputSchema = z.object({
  title: z.string().min(2).max(140),
  description: z.string().min(0).max(1200),
  imageUrl: z.string().max(500).optional().default(''),
  price: z.number().min(0).max(100000),
  currency: z.string().max(8).optional(),
  affiliateUrl: z.string().max(500).optional().default(''),
  category: z.string().max(60).optional(),
  typeFishing: z.string().min(1).max(40),
  rating: z.number().min(0).max(5).optional(),
  reviews: z.number().int().min(0).optional(),
  inStock: z.boolean().optional(),
  aliexpressId: z.string().max(120).optional(),
})

/** Create a product (admin only). */
export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const parsed = productInputSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Datos de producto inválidos' },
      { status: 400 },
    )
  }

  try {
    const settings = getSettings()
    const product = await createProduct({
      ...parsed.data,
      currency: parsed.data.currency || settings.defaultCurrency,
    })
    return NextResponse.json({ success: true, product }, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { success: false, error: 'Error creating product' },
      { status: 500 },
    )
  }
}
