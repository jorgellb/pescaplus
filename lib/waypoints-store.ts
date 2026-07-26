import { isDatabaseConfigured } from '@/lib/products-store'
import { WAYPOINT_TYPES, type Waypoint, type WaypointType, type WaypointInput, type Visibility } from '@/lib/waypoint-types'

/**
 * Personal chart marks.
 *
 * Two rules govern this file and neither is negotiable:
 *
 *  1. A waypoint is PRIVATE unless its owner says otherwise. `visibility`
 *     defaults to 'private' in the schema and in every code path here.
 *  2. Ownership is checked on every read and every write, inside the query.
 *     No function takes an id without also taking the owner. The plan this
 *     comes from enforces isolation with Postgres RLS, which works when each
 *     user gets their own DB role (Supabase). We connect with a single role
 *     through Prisma, so the guarantee has to live here — which means it must
 *     be impossible to call these functions without an owner. Hence the
 *     signatures below, and hence the isolation tests.
 */
export type { WaypointType, Visibility, Waypoint, WaypointInput } from '@/lib/waypoint-types'
export { WAYPOINT_TYPES } from '@/lib/waypoint-types'

const WRITE_FAIL = 'No se ha podido guardar la marca. Inténtalo de nuevo en unos minutos.'
const TYPES = new Set(WAYPOINT_TYPES.map((t) => t.id))

interface Stored extends Waypoint {}
const g = globalThis as unknown as { __pescaplusWaypoints?: Stored[] }
function mem(): Stored[] { return (g.__pescaplusWaypoints ??= []) }

function rowTo(row: any): Waypoint {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    type: TYPES.has(row.type) ? row.type : 'otro',
    lat: row.lat,
    lon: row.lon,
    depthM: row.depthM ?? null,
    notes: row.notes ?? '',
    // Cualquier valor desconocido cae del lado seguro.
    visibility: row.visibility === 'public' ? 'public' : 'private',
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.getTime() : row.updatedAt,
  }
}

export function validateWaypoint(input: WaypointInput): string | null {
  if (!input.name?.trim()) return 'Ponle un nombre a la marca.'
  if (!Number.isFinite(input.lat) || input.lat < -90 || input.lat > 90) return 'Latitud fuera de rango.'
  if (!Number.isFinite(input.lon) || input.lon < -180 || input.lon > 180) return 'Longitud fuera de rango.'
  if (input.depthM != null && (!Number.isFinite(input.depthM) || input.depthM < 0 || input.depthM > 11000)) {
    return 'Sonda no válida.'
  }
  return null
}

function clean(input: WaypointInput) {
  return {
    name: input.name.trim().slice(0, 80),
    type: (TYPES.has(input.type as WaypointType) ? input.type : 'caladero') as WaypointType,
    // 6 decimales ≈ 11 cm: más que suficiente y evita ruido inútil.
    lat: Math.round(input.lat * 1e6) / 1e6,
    lon: Math.round(input.lon * 1e6) / 1e6,
    depthM: input.depthM != null && Number.isFinite(input.depthM) ? Math.round(input.depthM * 10) / 10 : null,
    notes: (input.notes ?? '').trim().slice(0, 500),
    // Publicar es un acto deliberado: cualquier otra cosa es privado.
    visibility: (input.visibility === 'public' ? 'public' : 'private') as Visibility,
  }
}

export async function createWaypoint(userId: string, input: WaypointInput): Promise<Waypoint> {
  if (!userId) throw new Error('Sesión no válida.')
  const err = validateWaypoint(input)
  if (err) throw new Error(err)
  const data = clean(input)

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      return rowTo(await prisma.waypoint.create({ data: { ...data, userId } }))
    } catch (error) {
      console.error('Waypoint write failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const now = Date.now()
  const wp: Stored = { id: `wp-${now}-${Math.random().toString(36).slice(2, 8)}`, userId, ...data, createdAt: now, updatedAt: now }
  mem().unshift(wp)
  return { ...wp }
}

/** Every waypoint of one owner. There is no "list all waypoints" function. */
export async function listWaypoints(userId: string): Promise<Waypoint[]> {
  if (!userId) return []
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.waypoint.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 2000 })
      return rows.map(rowTo)
    } catch (error) {
      console.warn('Waypoints read failed:', error)
      return []
    }
  }
  return mem().filter((w) => w.userId === userId).map((w) => ({ ...w }))
}

/** One waypoint, only if it belongs to this user. Returns null otherwise. */
export async function getWaypoint(id: string, userId: string): Promise<Waypoint | null> {
  if (!id || !userId) return null
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      // El dueño va en el WHERE, no en una comprobación posterior.
      const row = await prisma.waypoint.findFirst({ where: { id, userId } })
      return row ? rowTo(row) : null
    } catch (error) {
      console.warn('Waypoint read failed:', error)
      return null
    }
  }
  const w = mem().find((x) => x.id === id && x.userId === userId)
  return w ? { ...w } : null
}

export async function updateWaypoint(id: string, userId: string, input: Partial<WaypointInput>): Promise<Waypoint | null> {
  const current = await getWaypoint(id, userId)
  if (!current) return null // no existe, o no es suyo: misma respuesta
  const merged: WaypointInput = {
    name: input.name ?? current.name,
    type: input.type ?? current.type,
    lat: input.lat ?? current.lat,
    lon: input.lon ?? current.lon,
    depthM: input.depthM !== undefined ? input.depthM : current.depthM,
    notes: input.notes ?? current.notes,
    visibility: input.visibility ?? current.visibility,
  }
  const err = validateWaypoint(merged)
  if (err) throw new Error(err)
  const data = clean(merged)

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const res = await prisma.waypoint.updateMany({ where: { id, userId }, data })
      if (res.count === 0) return null
      return getWaypoint(id, userId)
    } catch (error) {
      console.error('Waypoint update failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const w = mem().find((x) => x.id === id && x.userId === userId)
  if (!w) return null
  Object.assign(w, data, { updatedAt: Date.now() })
  return { ...w }
}

export async function deleteWaypoint(id: string, userId: string): Promise<boolean> {
  if (!id || !userId) return false
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const res = await prisma.waypoint.deleteMany({ where: { id, userId } })
      return res.count > 0
    } catch (error) {
      console.error('Waypoint delete failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const before = mem().length
  g.__pescaplusWaypoints = mem().filter((w) => !(w.id === id && w.userId === userId))
  return mem().length < before
}

/** Delete every waypoint of a user — used by the account deletion path (RGPD). */
export async function deleteAllWaypoints(userId: string): Promise<number> {
  if (!userId) return 0
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    const res = await prisma.waypoint.deleteMany({ where: { userId } })
    return res.count
  }
  const before = mem().length
  g.__pescaplusWaypoints = mem().filter((w) => w.userId !== userId)
  return before - mem().length
}
