import { NextRequest, NextResponse } from 'next/server'
import { getSounding } from '@/lib/soundings'
import { getSeabedDetail } from '@/lib/seabed'
import { checkPoint } from '@/lib/protected-areas'
import { nearestSpot } from '@/lib/fishing-spots'
import { speciesForZone } from '@/lib/species-zones'
import { solunarDay } from '@/lib/solunar'
import { todayMadridISO } from '@/lib/solunar-format'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/**
 * «Aquí y ahora»: todo lo que se sabe del punto exacto donde estás.
 *
 * Fusiona en UNA sola petición lo que hasta ahora eran cuatro (sonda, fondo,
 * espacios protegidos y solunar). No es por elegancia: esto se usa de pie en una
 * roca o en un barco, con una barra de cobertura, y cuatro viajes de ida y
 * vuelta por 3G son cuatro oportunidades de que se caiga uno y la pantalla
 * quede a medias.
 *
 * Las tres consultas externas van en paralelo y CADA UNA cae por su cuenta: sin
 * sonda pero con fondo, se enseña el fondo. Al aire libre, media respuesta vale
 * mucho más que un error.
 */
export const dynamic = 'force-dynamic'

/** Periodo solunar activo y cuánto queda, o el siguiente si no hay ninguno. */
function periodoAhora(lat: number, lon: number, ahora: number) {
  const hoy = solunarDay(lat, lon, todayMadridISO())
  const activo = hoy.periods.find((p) => ahora >= p.start && ahora <= p.end)
  if (activo) {
    return {
      estado: 'dentro' as const,
      kind: activo.kind,
      restanMin: Math.max(0, Math.round((activo.end - ahora) / 60000)),
      desde: activo.start,
      hasta: activo.end,
      rating: hoy.rating,
    }
  }
  const siguiente = hoy.periods.filter((p) => p.start > ahora).sort((a, b) => a.start - b.start)[0]
  return siguiente
    ? {
        estado: 'fuera' as const,
        kind: siguiente.kind,
        faltanMin: Math.max(0, Math.round((siguiente.start - ahora) / 60000)),
        desde: siguiente.start,
        hasta: siguiente.end,
        rating: hoy.rating,
      }
    : { estado: 'sin-datos' as const, rating: hoy.rating }
}

export async function GET(request: NextRequest) {
  const limit = rateLimit(`aqui:${clientIp(request)}`, 60, 10 * 60_000)
  if (!limit.ok) {
    return NextResponse.json({ success: false, error: 'Demasiadas consultas seguidas.' }, { status: 429 })
  }

  const lat = Number(request.nextUrl.searchParams.get('lat'))
  const lon = Number(request.nextUrl.searchParams.get('lon'))
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ success: false, error: 'Posición no válida.' }, { status: 400 })
  }

  // Cada fuente cae por su cuenta: media pantalla es infinitamente mejor que un
  // error cuando estás en el agua.
  const [sonda, fondo, protegido] = await Promise.all([
    getSounding(lat, lon).catch(() => null),
    getSeabedDetail(lat, lon).catch(() => null),
    checkPoint(lat, lon).catch(() => null),
  ])

  const spot = nearestSpot(lat, lon)
  const mes = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', month: 'numeric' }).format(new Date()))

  // Distancia real hasta esa zona: si estás a 60 km, el nombre de la zona es
  // una referencia y no "donde estás", y conviene que se note.
  const r = Math.PI / 180
  const a = Math.sin(((spot.lat - lat) * r) / 2) ** 2 +
    Math.cos(lat * r) * Math.cos(spot.lat * r) * Math.sin(((spot.lon - lon) * r) / 2) ** 2
  const km = Math.round(2 * 6371 * Math.asin(Math.sqrt(a)))

  // Especies de la zona más cercana que están EN TEMPORADA este mes. Sin filtrar
  // por mes la lista sale igual en enero que en agosto y deja de significar nada.
  const especies = speciesForZone(spot)
    .filter((s) => s.id !== 'general' && s.bestMonths.includes(mes))
    .slice(0, 8)
    .map((s) => ({ id: s.id, name: s.name, minSizeNote: s.minSizeNote }))

  return NextResponse.json({
    success: true,
    sonda,
    fondo,
    protegido,
    solunar: periodoAhora(lat, lon, Date.now()),
    spot: { slug: spot.slug, name: spot.name, region: spot.region, km },
    especies,
  })
}
