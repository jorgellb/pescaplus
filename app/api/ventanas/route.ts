import { NextRequest, NextResponse } from 'next/server'
import { getSpot } from '@/lib/fishing-spots'
import { getMarineForecast, bestWindow, groupByDay, FORECAST_REVALIDATE_S } from '@/lib/marine-forecast'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Qué ventanas tienes abiertas en tus zonas, ahora y en los próximos días.
 *
 * El aviso por correo ya existía (lib/alerts-store + el cron), pero exige
 * RESEND_API_KEY y llega cuando llega. Esto responde a la misma pregunta dentro
 * de la app y funciona hoy: entras, y ves de un vistazo dónde y cuándo conviene
 * salir de entre las zonas que tú has guardado.
 *
 * Se limita el número de zonas por consulta: cada una es una previsión completa,
 * y veinte de golpe castigarían al proveedor y a quien espera la respuesta.
 */
const MAX_ZONAS = 8
/** Por debajo de esto no es una ventana, es un rato. */
const UMBRAL = 55

export async function GET(request: NextRequest) {
  const limit = rateLimit(`ventanas:${clientIp(request)}`, 120, 60 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiadas consultas.' }, { status: 429 })

  const slugs = (request.nextUrl.searchParams.get('zonas') ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean).slice(0, MAX_ZONAS)
  if (slugs.length === 0) return NextResponse.json({ success: true, zonas: [] })

  const umbral = Math.min(90, Math.max(30, Number(request.nextUrl.searchParams.get('umbral')) || UMBRAL))

  const zonas = await Promise.all(slugs.map(async (slug) => {
    const spot = getSpot(slug)
    if (!spot) return null
    const fc = await getMarineForecast(spot).catch(() => null)
    if (!fc?.available || fc.hours.length === 0) return { slug, name: spot.name, region: spot.region, ventanas: [] }

    const ahora = Date.now()
    const ventanas = groupByDay(fc.hours)
      .map((g) => {
        // Solo lo que queda por venir: una ventana de esta mañana no sirve.
        const futuras = g.hours.filter((h) => h.time + 3600_000 >= ahora)
        if (futuras.length === 0) return null
        const w = bestWindow(futuras)
        return w && w.avg >= umbral ? { dateISO: g.dateISO, ...w } : null
      })
      .filter((w): w is NonNullable<typeof w> => w !== null)
      .slice(0, 3)

    return { slug, name: spot.name, region: spot.region, ventanas }
  }))

  return NextResponse.json(
    { success: true, umbral, zonas: zonas.filter(Boolean) },
    { headers: { 'Cache-Control': `public, max-age=600, s-maxage=${FORECAST_REVALIDATE_S}` } },
  )
}
