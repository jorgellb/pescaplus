import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Product, ProductsApiResponse } from '@/types'
import { listProducts, createProduct, activeBackend } from '@/lib/products-store'
import { isFishingTypeId } from '@/lib/fishing'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { getSettings } from '@/lib/settings-store'

/**
 * Public storefront listing. Reads from the curated store (catalog + products
 * imported/optimized by the AI agent). AliExpress is NOT queried here — it is an
 * import source used only in the admin backend, so the storefront always shows
 * our own SEO-optimized fichas rather than raw marketplace results.
 */
export async function GET(request: NextRequest): Promise<NextResponse<ProductsApiResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const typeParam = searchParams.get('typeFishing') ?? undefined
    const search = searchParams.get('search')?.trim() || undefined
    const scopedType = typeParam && isFishingTypeId(typeParam) ? typeParam : undefined

    const products: Product[] = await listProducts({
      search,
      typeFishing: scopedType ?? typeParam,
    })
    const source: ProductsApiResponse['source'] =
      activeBackend() === 'database' ? 'database' : 'catalog'

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
  title: z.string().min(2).max(200),
  description: z.string().min(0).max(4000),
  seoTitle: z.string().max(120).optional(),
  seoDescription: z.string().max(200).optional(),
  imageUrl: z.string().max(1200).optional().default(''),
  images: z.array(z.string().max(1200)).max(12).optional(),
  imageAlts: z.array(z.string().max(300)).max(12).optional(),
  videoUrl: z.string().max(1200).optional(),
  price: z.number().min(0).max(100000),
  currency: z.string().max(8).optional(),
  affiliateUrl: z.string().max(2200).optional().default(''),
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
    revalidatePath(`/categories/${product.typeFishing}`)
    revalidatePath('/')
    return NextResponse.json({ success: true, product }, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { success: false, error: 'Error creating product' },
      { status: 500 },
    )
  }
}
