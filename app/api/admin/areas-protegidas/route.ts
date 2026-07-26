import { NextRequest, NextResponse } from 'next/server'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { importAreas, clearAreas, countAreas, type AreaImport } from '@/lib/protected-areas'

/**
 * Carga de la capa normativa. Solo administración: estas geometrías deciden si
 * a un pescador se le avisa o no de que está en una reserva.
 *
 * Espera un GeoJSON FeatureCollection donde cada feature lleva en `properties`
 * el nombre, la fuente y su fecha. Reemplaza la capa entera para que no queden
 * áreas viejas mezcladas con las nuevas.
 */
export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  const features = Array.isArray(body?.features) ? body.features : null
  if (!features) {
    return NextResponse.json({ success: false, error: 'Se espera un GeoJSON FeatureCollection.' }, { status: 400 })
  }

  const areas: AreaImport[] = features.map((f: Record<string, unknown>) => {
    const p = (f.properties ?? {}) as Record<string, unknown>
    return {
      name: String(p.name ?? p.nombre ?? ''),
      type: p.type ? String(p.type) : undefined,
      authority: p.authority ? String(p.authority) : String(p.organismo ?? ''),
      recreationalFishing: typeof p.recreationalFishing === 'boolean' ? p.recreationalFishing : null,
      requiresPermit: typeof p.requiresPermit === 'boolean' ? p.requiresPermit : null,
      rulesUrl: String(p.rulesUrl ?? p.normativa ?? ''),
      sourceName: String(p.sourceName ?? body.sourceName ?? ''),
      sourceDate: String(p.sourceDate ?? body.sourceDate ?? ''),
      geometry: f.geometry,
    }
  })

  const removed = body.replace === false ? 0 : await clearAreas()
  const { imported, errors } = await importAreas(areas)
  return NextResponse.json({ success: true, removed, imported, errors, total: await countAreas() })
}

/** Estado de la capa: cuántas áreas hay cargadas. */
export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 401 })
  }
  return NextResponse.json({ success: true, total: await countAreas() })
}
