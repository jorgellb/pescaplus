import { NextResponse, type NextRequest } from 'next/server'
import { canalDe, dispositivoDe, esBot, hashVisitante, normalizarRuta, type TipoEvento } from '@/lib/analytics'

/**
 * Entrada de eventos de analítica.
 *
 * La ruta es corta (`/api/e`) a propósito: los bloqueadores de publicidad filtran
 * por nombres como «analytics», «track» o «collect», y con ellos se pierde entre
 * un 15 % y un 30 % de la medición. Al ser propia y sin cookies no hay nada que
 * bloquear salvo el nombre.
 *
 * Reglas de la casa:
 *
 *  - **Nunca falla hacia fuera.** Cualquier error se traga y se responde 204. Una
 *    analítica que devuelve 500 aparece en la consola del visitante y, si el
 *    cliente reintenta, multiplica la carga justo cuando algo va mal.
 *  - **Se responde antes de escribir.** `sendBeacon` no espera respuesta, pero el
 *    navegador sí mantiene la petición viva; cuanto antes se cierre, mejor.
 *  - **Los bots se descartan aquí**, no al consultar. Un bot contado como visita
 *    estropea todas las tasas y ya no hay forma de distinguirlo después.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TIPOS: TipoEvento[] = ['pageview', 'salida', 'vital', 'afiliado', 'herramienta', 'busqueda', 'error']

/** Tope por visitante y minuto. Evita que una pestaña en bucle llene la tabla. */
const TOPE_POR_MINUTO = 60
const contador = new Map<string, { n: number; hasta: number }>()

function pasaElTope(clave: string): boolean {
  const ahora = Date.now()
  const actual = contador.get(clave)
  if (!actual || actual.hasta < ahora) {
    contador.set(clave, { n: 1, hasta: ahora + 60_000 })
    // Limpieza perezosa: sin esto el mapa crece sin fin en un proceso largo.
    if (contador.size > 5000) for (const [k, v] of contador) if (v.hasta < ahora) contador.delete(k)
    return true
  }
  actual.n++
  return actual.n <= TOPE_POR_MINUTO
}

function ipDe(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for') || ''
  return (fwd.split(',')[0] || req.headers.get('x-real-ip') || '').trim()
}

export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get('user-agent') || ''
    if (esBot(ua)) return new NextResponse(null, { status: 204 })

    const cuerpo = (await req.json()) as Record<string, unknown>
    const tipo = String(cuerpo.type || '') as TipoEvento
    if (!TIPOS.includes(tipo)) return new NextResponse(null, { status: 204 })

    const visitor = hashVisitante(ipDe(req), ua)
    if (!pasaElTope(visitor)) return new NextResponse(null, { status: 204 })

    const propioHost = req.headers.get('host') || 'pescaplus.es'
    const url = String(cuerpo.url || '/')
    const { canal, ref } = canalDe(String(cuerpo.ref || ''), url, propioHost)

    const valorBruto = Number(cuerpo.value)
    const datos = {
      type: tipo,
      path: normalizarRuta(url),
      ref,
      canal,
      visitor,
      session: String(cuerpo.session || '').slice(0, 40),
      device: dispositivoDe(ua),
      // Sin `isFinite` un NaN del cliente entraría como null y ensuciaría las medias.
      value: Number.isFinite(valorBruto) ? valorBruto : null,
      name: String(cuerpo.name || '').slice(0, 60),
      meta: (cuerpo.meta ?? undefined) as object | undefined,
    }

    const { prisma } = await import('@/lib/prisma')
    await prisma.event.create({ data: datos })
  } catch {
    /* La analítica jamás debe romper la navegación de nadie. */
  }
  return new NextResponse(null, { status: 204 })
}
