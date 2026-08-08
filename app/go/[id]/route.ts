import { NextRequest, NextResponse } from 'next/server'
import { resolveProduct } from '@/lib/product-service'
import { recordClick } from '@/lib/clicks-store'
import { dispositivoDe, hashVisitante, normalizarRuta } from '@/lib/analytics'

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

    /*
     * El mismo clic, además, como evento del registro general.
     *
     * Se anota aquí y no en el navegador porque TODA salida hacia la tienda pasa
     * por esta ruta: no hay forma de saltársela, ni con un bloqueador ni
     * copiando el enlace. Y lo que se guarda como `path` es la página de la que
     * VIENE el clic, que es el dato que faltaba: sin él se sabía cuántos clics
     * había, pero no qué contenido los producía — o sea, no se podía saber si
     * una guía vende o solo se lee.
     */
    const referer = request.headers.get('referer') || ''
    let origen = ''
    try {
      origen = referer ? new URL(referer).pathname : ''
    } catch {
      /* referer ilegible: el clic se cuenta igual, sin origen */
    }
    const { prisma } = await import('@/lib/prisma')
    await prisma.event.create({
      data: {
        type: 'afiliado',
        path: normalizarRuta(origen || '/'),
        name: product.id.slice(0, 60),
        visitor: hashVisitante(
          (request.headers.get('x-forwarded-for') || '').split(',')[0].trim(),
          request.headers.get('user-agent') || '',
        ),
        device: dispositivoDe(request.headers.get('user-agent') || ''),
        meta: { titulo: product.title, categoria: String(product.typeFishing) },
      },
    })
  } catch {
    /* never block the redirect on a tracking failure */
  }

  return NextResponse.redirect(product.affiliateUrl, 302)
}
