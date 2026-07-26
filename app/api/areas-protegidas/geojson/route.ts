import { NextRequest, NextResponse } from 'next/server'
import { areasInBBox, MIN_RENDER_ZOOM } from '@/lib/protected-areas'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Polígonos protegidos dentro del recuadro visible, en GeoJSON.
 *
 * Se sirve por recuadro y no entero: la capa completa son ~8 MB y mandarla en
 * cada carga de la carta sería absurdo. Por debajo de cierto zoom tampoco se
 * envía nada — a escala de todo el país serían miles de polígonos ilegibles.
 */
export async function GET(request: NextRequest) {
  const limit = rateLimit(`areasgeo:${clientIp(request)}`, 300, 60 * 60_000)
  if (!limit.ok) return NextResponse.json({ error: 'Demasiadas consultas.' }, { status: 429 })

  const sp = request.nextUrl.searchParams
  const bbox = (sp.get('bbox') ?? '').split(',').map(Number)
  const zoom = Number(sp.get('zoom') ?? 0)
  if (bbox.length !== 4 || bbox.some((n) => !Number.isFinite(n))) {
    return NextResponse.json({ error: 'bbox no válido.' }, { status: 400 })
  }
  if (zoom < MIN_RENDER_ZOOM) {
    return NextResponse.json({ type: 'FeatureCollection', features: [], tooFar: true })
  }
  const [w, s, e, n] = bbox
  return NextResponse.json(await areasInBBox(w, s, e, n))
}
