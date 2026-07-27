import { isDatabaseConfigured } from '@/lib/products-store'
import { POI_KINDS, type PoiKind, type NauticalPoi } from '@/lib/nautical-poi-types'

/**
 * Puntos náuticos: rampas de varada, puertos y pecios.
 *
 * Vienen de OpenStreetMap y se preimportan (scripts/import-nautical-pois.mjs).
 * No se consulta Overpass en vivo: es un servicio público que se satura, y una
 * carta que depende de que un tercero conteste al mover el mapa no sirve.
 *
 * Lo que se cuenta de cada punto sale de los tags de OSM tal cual. Si un dato
 * no consta —y en OSM falta a menudo— se calla, no se estima. Un calado
 * inventado en una rampa es alguien rompiendo el barco.
 */
export type { PoiKind, NauticalPoi } from '@/lib/nautical-poi-types'
export { POI_KINDS, MIN_POI_ZOOM } from '@/lib/nautical-poi-types'

const KINDS = new Set(POI_KINDS.map((k) => k.id))

function rowTo(row: {
  id: string; kind: string; name: string; lat: number; lon: number
  details: unknown; sourceDate: string; osmType: string; osmId: string
}): NauticalPoi {
  return {
    id: row.id,
    kind: (KINDS.has(row.kind as PoiKind) ? row.kind : 'puerto') as PoiKind,
    name: row.name || '',
    lat: row.lat,
    lon: row.lon,
    details: (row.details && typeof row.details === 'object' ? row.details : {}) as Record<string, string>,
    sourceDate: row.sourceDate || '',
    osmUrl: `https://www.openstreetmap.org/${row.osmType}/${row.osmId}`,
  }
}

/** Tope POR TIPO, no total: ver el porqué en `poisInBBox`. */
const TOPE_POR_TIPO = 250

/**
 * Los puntos que caen dentro de un recuadro del mapa.
 *
 * El tope se aplica a cada tipo por separado, y no al conjunto, a propósito. Con
 * un único `take` sobre toda la consulta, en una costa densa las 500 primeras
 * filas pueden ser todas rampas y dejar fuera los pecios enteros —que son los
 * menos y los que más interesan a quien pesca—. Truncar es inevitable; truncar
 * siempre lo mismo, no.
 */
export async function poisInBBox(
  w: number, s: number, e: number, n: number,
  kinds?: PoiKind[],
): Promise<NauticalPoi[]> {
  if (!isDatabaseConfigured()) return []
  if (![w, s, e, n].every(Number.isFinite)) return []
  const pedidos = (kinds ?? []).filter((k) => KINDS.has(k))
  const buscados = pedidos.length > 0 ? pedidos : POI_KINDS.map((k) => k.id)
  try {
    const { prisma } = await import('@/lib/prisma')
    const porTipo = await Promise.all(buscados.map((kind) =>
      prisma.nauticalPoi.findMany({
        where: { kind, lat: { gte: s, lte: n }, lon: { gte: w, lte: e } },
        take: TOPE_POR_TIPO,
      }),
    ))
    return porTipo.flat().map(rowTo)
  } catch (error) {
    console.warn('Puntos náuticos: lectura fallida:', error)
    return []
  }
}

/** Cuántos hay de cada tipo — la medida honesta de la cobertura. */
export async function countPois(): Promise<Record<string, number>> {
  if (!isDatabaseConfigured()) return {}
  try {
    const { prisma } = await import('@/lib/prisma')
    const rows = await prisma.nauticalPoi.groupBy({ by: ['kind'], _count: { _all: true } })
    return Object.fromEntries(rows.map((r) => [r.kind, r._count._all]))
  } catch (error) {
    console.warn('Puntos náuticos: recuento fallido:', error)
    return {}
  }
}

/**
 * Los tags de OSM, en cristiano. Solo se traduce lo que se entiende; un valor
 * desconocido se enseña tal cual antes que esconderlo o adivinarlo.
 */
const ETIQUETAS: Record<string, string> = {
  operator: 'Gestiona',
  access: 'Acceso',
  fee: 'De pago',
  surface: 'Firme',
  material: 'Material',
  depth: 'Profundidad',
  maxdraft: 'Calado máximo',
  website: 'Web',
  phone: 'Teléfono',
  'seamark:wreck:category': 'Tipo de pecio',
  'seamark:wreck:depth': 'Profundidad del pecio',
  'seamark:harbour:category': 'Tipo de puerto',
}

const VALORES: Record<string, string> = {
  yes: 'sí', no: 'no', private: 'privado', public: 'público',
  customers: 'solo clientes', permissive: 'tolerado', destination: 'solo acceso local',
  concrete: 'hormigón', asphalt: 'asfalto', gravel: 'grava', sand: 'arena',
  marina: 'puerto deportivo', fishing: 'puerto pesquero',
  dangerous: 'peligroso', 'non-dangerous': 'no peligroso',
}

export function describePoi(poi: NauticalPoi): { label: string; value: string }[] {
  return Object.entries(poi.details)
    .filter(([k]) => k in ETIQUETAS)
    .map(([k, v]) => ({ label: ETIQUETAS[k], value: VALORES[v] ?? v }))
}
