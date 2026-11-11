import { NextRequest, NextResponse } from 'next/server'
import { resolveProduct } from '@/lib/product-service'
import { recordClick } from '@/lib/clicks-store'
import { registrarServidor } from '@/lib/analytics-server'
import { decidirSalida, origenDeLaSalida, paginaPuente, senalesDe } from '@/lib/salida-tienda'

export const dynamic = 'force-dynamic'

/**
 * Salida a la tienda: los botones de compra apuntan aquí (/go/[id]) y no a la
 * tienda directamente, para medir qué vende.
 *
 * Quien pulsa en la web pasa directo: se anota el clic y se redirige. Lo demás
 * —programas que siguen todos los enlaces, precargas, enlaces pegados— recibe
 * un puente que salta solo con JavaScript y no cuenta hasta que salta; los bots
 * declarados, una parada sin script. El porqué y la regla están en
 * `lib/salida-tienda.ts`.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await resolveProduct(id)

  if (!product?.affiliateUrl) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const decision = decidirSalida(senalesDe(request.headers, request.nextUrl))
  if (decision !== 'tienda') {
    return new NextResponse(paginaPuente(product.id, decision === 'puente'), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  }

  try {
    await recordClick({
      productId: product.id,
      productTitle: product.title,
      typeFishing: String(product.typeFishing),
    })

    /*
     * El mismo clic, además, como evento del registro general, con la página de
     * la que VIENE (`path`): sin ella se sabía cuántos clics había pero no qué
     * contenido los producía. Va por `registrarServidor`, que descarta los bots
     * que se identifican como tales.
     */
    await registrarServidor({
      type: 'afiliado',
      path: origenDeLaSalida(request.nextUrl, request.headers.get('referer') || '') || '/',
      name: product.id.slice(0, 60),
      meta: { titulo: product.title, categoria: String(product.typeFishing) },
    })
  } catch {
    /* never block the redirect on a tracking failure */
  }

  return NextResponse.redirect(product.affiliateUrl, 302)
}
