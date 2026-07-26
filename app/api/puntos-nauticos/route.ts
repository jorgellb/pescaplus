import { NextRequest, NextResponse } from 'next/server'
import { poisInBBox } from '@/lib/nautical-pois'
import type { PoiKind } from '@/lib/nautical-poi-types'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Rampas, puertos y pecios dentro de un recuadro del mapa.
 *
 * Devuelve GeoJSON porque va directo a una fuente de MapLibre: convertirlo en
 * el navegador sería trabajo de más en el aparato con menos batería.
 */
export async function GET(request: NextRequest) {
  const limit = rateLimit(`pois:${clientIp(request)}`, 600, 60 * 60_000)
  if (!limit.ok) {
    return NextResponse.json({ success: false, error: 'Demasiadas consultas.' }, { status: 429 })
  }
  const p = request.nextUrl.searchParams
  const nums = ['w', 's', 'e', 'n'].map((k) => ({ k, raw: p.get(k), v: Number(p.get(k)) }))
  if (nums.some(({ raw, v }) => raw === null || !Number.isFinite(v))) {
    return NextResponse.json({ success: false, error: 'Recuadro no válido.' }, { status: 400 })
  }
  const [w, s, e, n] = nums.map(({ v }) => v)

  const kinds = (p.get('kinds') ?? '').split(',').filter(Boolean) as PoiKind[]
  const pois = await poisInBBox(w, s, e, n, kinds)

  return NextResponse.json(
    {
      success: true,
      geojson: {
        type: 'FeatureCollection',
        features: pois.map((poi) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [poi.lon, poi.lat] },
          properties: {
            id: poi.id, kind: poi.kind, name: poi.name,
            details: JSON.stringify(poi.details),
            sourceDate: poi.sourceDate, osmUrl: poi.osmUrl,
          },
        })),
      },
    },
    { headers: { 'Cache-Control': 'public, max-age=600, s-maxage=86400' } },
  )
}
