import { NextRequest, NextResponse } from 'next/server'
import { getSeabedDetail, SEABED_NOTE, SEABED_RESOLUTION } from '@/lib/seabed'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/** ¿Qué fondo hay en este punto: roca, arena, fango? */
export async function GET(request: NextRequest) {
  const limit = rateLimit(`fondo:${clientIp(request)}`, 300, 60 * 60_000)
  if (!limit.ok) {
    return NextResponse.json({ success: false, error: 'Demasiadas consultas.' }, { status: 429 })
  }
  const rawLat = request.nextUrl.searchParams.get('lat')
  const rawLon = request.nextUrl.searchParams.get('lon')
  const lat = Number(rawLat)
  const lon = Number(rawLon)
  if (rawLat === null || rawLon === null || !Number.isFinite(lat) || !Number.isFinite(lon)
      || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ success: false, error: 'Coordenadas no válidas.' }, { status: 400 })
  }

  const seabed = await getSeabedDetail(lat, lon)
  return NextResponse.json(
    { success: true, ...seabed, note: SEABED_NOTE, resolution: SEABED_RESOLUTION },
    // El sustrato del fondo no cambia de un día para otro.
    { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=2592000' } },
  )
}
