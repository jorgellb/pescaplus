import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { listWaypoints, createWaypoint } from '@/lib/waypoints-store'
import { toGPX, fromGPX } from '@/lib/gpx'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/** Descarga de las marcas propias en GPX (portabilidad RGPD incluida). */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })
  const gpx = toGPX(await listWaypoints(user.id))
  return new NextResponse(gpx, {
    headers: {
      'Content-Type': 'application/gpx+xml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="pescaplus-marcas.gpx"',
    },
  })
}

/** Importa un GPX. Todo lo importado entra como privado. */
export async function POST(request: NextRequest) {
  const limit = rateLimit(`gpx:${clientIp(request)}`, 10, 60 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiadas importaciones seguidas.' }, { status: 429 })
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })

  const xml = await request.text()
  if (!xml || xml.length > 5_000_000) {
    return NextResponse.json({ success: false, error: 'Archivo vacío o demasiado grande.' }, { status: 400 })
  }
  const parsed = fromGPX(xml)
  if (parsed.length === 0) {
    return NextResponse.json({ success: false, error: 'No se han encontrado marcas en el archivo.' }, { status: 400 })
  }
  let imported = 0
  for (const wp of parsed) {
    try { await createWaypoint(user.id, wp); imported += 1 } catch { /* una marca mala no aborta el lote */ }
  }
  return NextResponse.json({ success: true, imported, found: parsed.length })
}
