import { NextRequest, NextResponse } from 'next/server'
import { resolveProduct } from '@/lib/product-service'
import { recordClick } from '@/lib/clicks-store'

export const dynamic = 'force-dynamic'

/**
 * Affiliate redirect: records the click, then 302s to the product's AliExpress
 * URL. Buy buttons point here (/go/[id]) instead of linking out directly, so we
 * can measure what converts. Falls back to the home page if the product or link
 * is missing.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await resolveProduct(id)

  if (!product?.affiliateUrl) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  try {
    await recordClick({
      productId: product.id,
      productTitle: product.title,
      typeFishing: String(product.typeFishing),
    })
  } catch {
    /* never block the redirect on a tracking failure */
  }

  return NextResponse.redirect(product.affiliateUrl, 302)
}
