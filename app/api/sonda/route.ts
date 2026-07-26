import { NextRequest, NextResponse } from 'next/server'
import { getSounding, SOUNDING_NOTE } from '@/lib/soundings'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/**
 * ¿Qué fondo hay en este punto?
 *
 * Va por el servidor y no directo desde el navegador a propósito: así la carga
 * contra EMODnet queda cacheada y limitada desde un solo sitio, en vez de
 * depender de cuántas veces pinche cada visitante.
 */
export async function GET(request: NextRequest) {
  const limit = rateLimit(`sonda:${clientIp(request)}`, 300, 60 * 60_000)
  if (!limit.ok) {
    return NextResponse.json({ success: false, error: 'Demasiadas consultas.' }, { status: 429 })
  }
  // Ojo: sin el parámetro, `Number(null)` es 0 — coordenadas perfectamente
  // válidas en medio del golfo de Guinea. Hay que exigir que venga.
  const rawLat = request.nextUrl.searchParams.get('lat')
  const rawLon = request.nextUrl.searchParams.get('lon')
  const lat = Number(rawLat)
  const lon = Number(rawLon)
  if (rawLat === null || rawLon === null || !Number.isFinite(lat) || !Number.isFinite(lon)
      || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ success: false, error: 'Coordenadas no válidas.' }, { status: 400 })
  }

  const sounding = await getSounding(lat, lon)
  return NextResponse.json(
    { success: true, ...sounding, note: SOUNDING_NOTE },
    // El fondo del mar no cambia entre visitas; que lo guarde también el CDN.
    { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=2592000' } },
  )
}
