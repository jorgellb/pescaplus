import { isDatabaseConfigured } from '@/lib/products-store'

/**
 * Marine protected areas, and the question that matters: is this point inside
 * one?
 *
 * THE RULE THAT GOVERNS THIS FILE: an empty table means "we haven't verified
 * this", never "you're clear to fish". Those are different answers and only one
 * of them is honest. A false negative here can walk somebody into a fine, so
 * `checkPoint` returns a three-state answer — inside / outside / unverified —
 * and the UI must never collapse the last two into a green light.
 *
 * Geometries are imported from official sources with their date recorded. They
 * are never interpolated, simplified by eye, or invented to fill a gap.
 */
export type Coverage = 'inside' | 'outside' | 'unverified'

export interface ProtectedAreaHit {
  id: string
  name: string
  type: string
  authority: string
  /** null significa "no consta en la fuente" — se muestra como consultar. */
  recreationalFishing: boolean | null
  requiresPermit: boolean | null
  rulesUrl: string
  sourceName: string
  sourceDate: string
}

export interface PointCheck {
  coverage: Coverage
  areas: ProtectedAreaHit[]
  /** Cuántas áreas hay cargadas en total: si es 0, no sabemos nada de nadie. */
  loaded: number
}

/**
 * PescaREC es obligatoria desde el 20/03/2026 (RD 214/2026) para declaraciones
 * en reservas marinas de interés pesquero y pesca de recreo. No la replicamos:
 * se informa y se enlaza.
 */
export const PESCAREC_URL = 'https://www.mapa.gob.es/es/pesca/temas/proteccion-recursos-pesqueros/'
export const PESCAREC_NOTE =
  'En reservas marinas de interés pesquero es obligatorio usar la app oficial PescaREC para las declaraciones y comunicaciones.'

/** How many areas we have loaded — the honest measure of our coverage. */
export async function countAreas(): Promise<number> {
  if (!isDatabaseConfigured()) return 0
  try {
    const { prisma } = await import('@/lib/prisma')
    return await prisma.protectedArea.count()
  } catch (error) {
    console.warn('Protected areas count failed:', error)
    return 0
  }
}

/**
 * Is this point inside a protected area?
 *
 * The point is built inside the query rather than stored: waypoints keep plain
 * lat/lon, and PostGIS only needs the geometry on the polygon side.
 */
export async function checkPoint(lat: number, lon: number): Promise<PointCheck> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { coverage: 'unverified', areas: [], loaded: 0 }
  }
  const loaded = await countAreas()
  // Sin datos cargados no podemos afirmar nada, ni siquiera lo contrario.
  if (loaded === 0) return { coverage: 'unverified', areas: [], loaded: 0 }

  try {
    const { prisma } = await import('@/lib/prisma')
    const rows = await prisma.$queryRaw<ProtectedAreaHit[]>`
      SELECT id, name, type, authority,
             "recreationalFishing", "requiresPermit",
             "rulesUrl", "sourceName", "sourceDate"
      FROM "ProtectedArea"
      WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(${lon}::float8, ${lat}::float8), 4326))
      LIMIT 20
    `
    return { coverage: rows.length > 0 ? 'inside' : 'outside', areas: rows, loaded }
  } catch (error) {
    console.error('Protected area check failed:', error)
    // Si la consulta falla, tampoco sabemos: nunca devolvemos "outside".
    return { coverage: 'unverified', areas: [], loaded }
  }
}

export interface AreaImport {
  name: string
  type?: string
  authority?: string
  recreationalFishing?: boolean | null
  requiresPermit?: boolean | null
  rulesUrl?: string
  sourceName: string
  sourceDate: string
  /** Geometría GeoJSON (Polygon o MultiPolygon) en EPSG:4326. */
  geometry: unknown
}

const TYPES = new Set(['reserva-integral', 'reserva-marina', 'zona-regulada', 'otro'])

/**
 * Import verified geometries. `sourceName` and `sourceDate` are REQUIRED: an
 * area we can't say where it came from or when it was checked has no business
 * driving a legal warning.
 */
export async function importAreas(areas: AreaImport[]): Promise<{ imported: number; errors: string[] }> {
  if (!isDatabaseConfigured()) return { imported: 0, errors: ['Sin base de datos.'] }
  const { prisma } = await import('@/lib/prisma')
  const errors: string[] = []
  let imported = 0

  for (const a of areas) {
    if (!a.name?.trim()) { errors.push('Área sin nombre.'); continue }
    if (!a.sourceName?.trim() || !a.sourceDate?.trim()) {
      errors.push(`"${a.name}": falta la fuente o su fecha.`)
      continue
    }
    const gj = JSON.stringify(a.geometry)
    const type = TYPES.has(a.type ?? '') ? a.type : 'reserva-marina'
    try {
      // ST_Multi normaliza Polygon → MultiPolygon; ST_IsValid descarta basura.
      await prisma.$executeRaw`
        INSERT INTO "ProtectedArea"
          (id, name, type, authority, "recreationalFishing", "requiresPermit", "rulesUrl", "sourceName", "sourceDate", geom, "createdAt")
        SELECT gen_random_uuid()::text, ${a.name.trim()}, ${type}, ${a.authority ?? ''},
               ${a.recreationalFishing ?? null}, ${a.requiresPermit ?? null},
               ${a.rulesUrl ?? ''}, ${a.sourceName.trim()}, ${a.sourceDate.trim()},
               ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${gj}), 4326)), NOW()
        WHERE ST_IsValid(ST_GeomFromGeoJSON(${gj}))
      `
      imported += 1
    } catch (error) {
      errors.push(`"${a.name}": geometría no válida.`)
      console.error('Protected area import failed:', a.name, error)
    }
  }
  return { imported, errors }
}

/** Wipe the layer — used before a full reimport so nothing stale survives. */
export async function clearAreas(): Promise<number> {
  if (!isDatabaseConfigured()) return 0
  const { prisma } = await import('@/lib/prisma')
  const n = await prisma.protectedArea.count()
  await prisma.$executeRaw`DELETE FROM "ProtectedArea"`
  return n
}
