import { headers } from 'next/headers'
import { canalDe, dispositivoDe, esBot, hashVisitante, normalizarRuta, type TipoEvento } from '@/lib/analytics'

/**
 * Registrar un evento desde el servidor.
 *
 * Se usa cuando el dato ya lo tiene el servidor y mandarlo por el navegador solo
 * añadiría formas de perderlo. Dos casos claros:
 *
 *  - **Las búsquedas**: `/search` es un componente de servidor y ahí están el
 *    término y el número de resultados. Medirlo en el cliente obligaría a
 *    reenviar ambos y lo tumbaría cualquier bloqueador.
 *  - **Los clics de afiliado**: pasan por `/go/[id]`, que es una redirección sin
 *    HTML donde no hay JavaScript que valga.
 *
 * Nunca lanza: una medición fallida no puede tumbar la página que la produce.
 */
export async function registrarServidor(evento: {
  type: TipoEvento
  /** Ruta de la página donde ocurre; se normaliza aquí. */
  path: string
  name?: string
  value?: number
  meta?: object
}): Promise<void> {
  try {
    const h = await headers()
    const ua = h.get('user-agent') || ''
    // Los bots buscan y se van; contarlos inventaría demanda que no existe.
    if (esBot(ua)) return

    const host = h.get('host') || 'pescaplus.es'
    const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim()
    const { canal, ref } = canalDe(h.get('referer') || '', evento.path, host)

    const { prisma } = await import('@/lib/prisma')
    await prisma.event.create({
      data: {
        type: evento.type,
        path: normalizarRuta(evento.path),
        ref,
        canal,
        visitor: hashVisitante(ip, ua),
        device: dispositivoDe(ua),
        name: (evento.name ?? '').slice(0, 60),
        value: Number.isFinite(evento.value) ? (evento.value as number) : null,
        meta: evento.meta,
      },
    })
  } catch {
    /* la medición jamás rompe la página */
  }
}
