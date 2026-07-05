import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ProductApiResponse } from '@/types'
import { getProduct, updateProduct, deleteProduct } from '@/lib/products-store'
import { isRequestAuthenticated } from '@/lib/admin-auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ProductApiResponse>> {
  try {
    const { id } = await params
    const product = await getProduct(id)
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, product })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching product' },
      { status: 500 },
    )
  }
}

const productPatchSchema = z.object({
  title: z.string().min(2).max(140).optional(),
  description: z.string().max(1200).optional(),
  imageUrl: z.string().max(500).optional(),
  price: z.number().min(0).max(100000).optional(),
  currency: z.string().max(8).optional(),
  affiliateUrl: z.string().max(500).optional(),
  category: z.string().max(60).optional(),
  typeFishing: z.string().min(1).max(40).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviews: z.number().int().min(0).optional(),
  inStock: z.boolean().optional(),
})

/** Update a product (admin only). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const parsed = productPatchSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Datos inválidos' }, { status: 400 })
  }

  try {
    const product = await updateProduct(id, parsed.data)
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, product })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ success: false, error: 'Error updating product' }, { status: 500 })
  }
}

/** Delete a product (admin only). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  try {
    const removed = await deleteProduct(id)
    if (!removed) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ success: false, error: 'Error deleting product' }, { status: 500 })
  }
}
