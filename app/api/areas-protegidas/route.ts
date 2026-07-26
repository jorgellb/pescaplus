import { NextRequest, NextResponse } from 'next/server'
import { checkPoint, PESCAREC_NOTE, PESCAREC_URL } from '@/lib/protected-areas'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/** ¿Cae este punto dentro de un espacio protegido? Tres respuestas posibles. */
export async function GET(request: NextRequest) {
  const limit = rateLimit(`areas:${clientIp(request)}`, 300, 60 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiadas consultas.' }, { status: 429 })
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
  const check = await checkPoint(lat, lon)
  return NextResponse.json({
    success: true,
    ...check,
    pescarec: check.coverage === 'inside' ? { note: PESCAREC_NOTE, url: PESCAREC_URL } : null,
  })
}
