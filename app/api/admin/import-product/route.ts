import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { generateSeoListing } from '@/lib/nvidia-ai'
import { createProduct, updateProduct, listProducts } from '@/lib/products-store'

const schema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(300),
  price: z.number().min(0).max(100000),
  currency: z.string().max(8).optional(),
  imageUrl: z.string().max(1200).optional().default(''),
  images: z.array(z.string().max(1200)).max(12).optional().default([]),
  videoUrl: z.string().max(1200).optional().default(''),
  affiliateUrl: z.string().max(2200).optional().default(''),
  typeFishing: z.string().min(1).max(40),
  rating: z.number().min(0).max(5).optional().default(0),
  reviews: z.number().int().min(0).optional().default(0),
})

/**
 * Import an AliExpress product: the NVIDIA agent rewrites the title/description
 * for SEO (original copy, not the marketplace text), and we persist it with its
 * gallery images and video. Re-importing the same AliExpress id updates in place.
 */
export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Producto inválido' }, { status: 400 })
  }

  const p = parsed.data
  const currency = p.currency || 'EUR'

  const seo = await generateSeoListing({
    originalTitle: p.title,
    typeFishing: p.typeFishing,
    price: p.price,
    currency,
  })

  const input = {
    title: seo.title,
    description: seo.description,
    seoDescription: seo.seoDescription,
    aiOptimized: seo.generatedBy === 'nvidia',
    imageUrl: p.imageUrl || p.images[0] || '',
    images: p.images,
    videoUrl: p.videoUrl,
    price: p.price,
    currency,
    affiliateUrl: p.affiliateUrl,
    category: 'fishing',
    typeFishing: p.typeFishing,
    rating: p.rating,
    reviews: p.reviews,
    sku: p.id,
  }

  try {
    // De-duplicate by AliExpress id: update if we've imported this before.
    const existing = (await listProducts()).find((x) => x.sku === p.id)
    const product = existing
      ? await updateProduct(existing.id, input)
      : await createProduct(input)

    if (product) {
      revalidatePath(`/categories/${product.typeFishing}`)
      revalidatePath(`/products/${product.id}`)
      revalidatePath('/')
    }

    return NextResponse.json({
      success: true,
      product,
      generatedBy: seo.generatedBy,
      updated: Boolean(existing),
    })
  } catch (error) {
    console.error('Error importing product:', error)
    return NextResponse.json({ success: false, error: 'Error al importar' }, { status: 500 })
  }
}
