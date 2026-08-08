import { NextRequest, NextResponse } from 'next/server'
import { resolveProduct } from '@/lib/product-service'
import { recordClick } from '@/lib/clicks-store'
import { registrarServidor } from '@/lib/analytics-server'

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
     * había, pero no qué contenido los producía.
     *
     * Va por `registrarServidor` y no escribiendo el evento a mano, que es como
     * estaba. La diferencia es el filtro de bots: escrito a mano no lo tenía, y
     * en producción se vio el resultado —19 clics de afiliado con 5 páginas
     * vistas, y UN SOLO «visitante» responsable de 15 de ellos, todos desde la
     * portada—. Un rastreador que sigue los enlaces de la home inflaba justo la
     * métrica que se mira para decidir qué vender.
     */
    const referer = request.headers.get('referer') || ''
    let origen = ''
    try {
      origen = referer ? new URL(referer).pathname : ''
    } catch {
      /* referer ilegible: el clic se cuenta igual, sin origen */
    }
    await registrarServidor({
      type: 'afiliado',
      path: origen || '/',
      name: product.id.slice(0, 60),
      meta: { titulo: product.title, categoria: String(product.typeFishing) },
    })
  } catch {
    /* never block the redirect on a tracking failure */
  }

  return NextResponse.redirect(product.affiliateUrl, 302)
}
