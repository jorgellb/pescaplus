import { isDatabaseConfigured } from '@/lib/products-store'
import {
  decimate, trackDistance, trackDuration,
  type Track, type TrackPoint, type Visibility,
} from '@/lib/track-types'

/**
 * Rutas grabadas con el GPS.
 *
 * Las mismas dos reglas que gobiernan lib/waypoints-store.ts, y por un motivo
 * más fuerte todavía: una derrota completa dice dónde pesca alguien, a qué hora
 * sale, por dónde entra y cuánto tarda. Es más revelador que una marca suelta.
 *
 *  1. Una ruta es PRIVADA salvo que su dueño diga lo contrario.
 *  2. El dueño va DENTRO de la consulta, en todas. Ninguna función acepta un id
 *     sin aceptar también el dueño, para que sea imposible llamarlas mal.
 */
export type { Track, TrackPoint, Visibility } from '@/lib/track-types'

const WRITE_FAIL = 'No se ha podido guardar la ruta. Inténtalo de nuevo en unos minutos.'

interface Stored extends Track {}
const g = globalThis as unknown as { __pescaplusTracks?: Stored[] }
function mem(): Stored[] { return (g.__pescaplusTracks ??= []) }

function rowTo(row: any): Track {
  const points = Array.isArray(row.points) ? (row.points as TrackPoint[]) : []
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    notes: row.notes ?? '',
    points,
    distanceM: row.distanceM ?? 0,
    durationS: row.durationS ?? 0,
    startedAt: row.startedAt instanceof Date ? row.startedAt.getTime() : row.startedAt,
    // Cualquier valor desconocido cae del lado seguro.
    visibility: row.visibility === 'public' ? 'public' : 'private',
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.getTime() : row.updatedAt,
  }
}

export interface TrackInput {
  name: string
  notes?: string
  points: TrackPoint[]
  visibility?: string
}

export function validateTrack(input: TrackInput): string | null {
  if (!input.name?.trim()) return 'Ponle un nombre a la ruta.'
  if (!Array.isArray(input.points) || input.points.length < 2) {
    return 'La ruta no tiene puntos suficientes para guardarse.'
  }
  const malo = input.points.find(
    (p) => !Number.isFinite(p.lat) || !Number.isFinite(p.lon)
      || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180 || !Number.isFinite(p.t),
  )
  if (malo) return 'La ruta contiene posiciones no válidas.'
  return null
}

function clean(input: TrackInput) {
  // Se diezma aquí, no en el navegador: el servidor es el que decide cuánto
  // ocupa una fila suya.
  const points = decimate(
    input.points
      .map((p) => ({
        lat: Math.round(p.lat * 1e6) / 1e6,
        lon: Math.round(p.lon * 1e6) / 1e6,
        t: Math.round(p.t),
        ...(p.acc != null && Number.isFinite(p.acc) ? { acc: Math.round(p.acc) } : {}),
        ...(p.spd != null && Number.isFinite(p.spd) ? { spd: Math.round(p.spd * 10) / 10 } : {}),
        ...(p.depthM != null && Number.isFinite(p.depthM) && p.depthM > 0
          ? { depthM: Math.round(p.depthM * 100) / 100 } : {}),
      }))
      .sort((a, b) => a.t - b.t),
  )
  return {
    name: input.name.trim().slice(0, 90),
    notes: (input.notes ?? '').trim().slice(0, 1000),
    points,
    distanceM: Math.round(trackDistance(points)),
    durationS: trackDuration(points),
    startedAt: new Date(points[0].t),
    // Publicar es un acto deliberado: cualquier otra cosa es privado.
    visibility: (input.visibility === 'public' ? 'public' : 'private') as Visibility,
  }
}

export async function createTrack(userId: string, input: TrackInput): Promise<Track> {
  if (!userId) throw new Error('Sesión no válida.')
  const err = validateTrack(input)
  if (err) throw new Error(err)
  const data = clean(input)

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      // Prisma tipa las columnas JSON como `InputJsonValue`, que no acepta una
      // interfaz propia aunque su forma sea válida. La conversión es solo para
      // el compilador: lo que viaja ya está validado y limpio.
      const points = data.points as unknown as object[]
      return rowTo(await prisma.track.create({ data: { ...data, points, userId } }))
    } catch (error) {
      console.error('Track write failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const now = Date.now()
  const t: Stored = {
    id: `tr-${now}-${Math.random().toString(36).slice(2, 8)}`,
    userId, ...data, startedAt: data.startedAt.getTime(), createdAt: now, updatedAt: now,
  }
  mem().unshift(t)
  return { ...t }
}

/**
 * Las rutas de un dueño. Por defecto SIN sus puntos: un listado de veinte rutas
 * con diez mil posiciones cada una son megas de JSON para pintar cuatro líneas
 * de resumen.
 */
export async function listTracks(userId: string, withPoints = false): Promise<Track[]> {
  if (!userId) return []
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.track.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 500,
      })
      return rows.map(rowTo).map((t) => (withPoints ? t : { ...t, points: [] }))
    } catch (error) {
      console.warn('Tracks read failed:', error)
      return []
    }
  }
  return mem().filter((t) => t.userId === userId).map((t) => ({ ...t, points: withPoints ? t.points : [] }))
}

/** Una ruta, solo si es suya. Devuelve null en cualquier otro caso. */
export async function getTrack(id: string, userId: string): Promise<Track | null> {
  if (!id || !userId) return null
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      // El dueño va en el WHERE, no en una comprobación posterior.
      const row = await prisma.track.findFirst({ where: { id, userId } })
      return row ? rowTo(row) : null
    } catch (error) {
      console.warn('Track read failed:', error)
      return null
    }
  }
  const t = mem().find((x) => x.id === id && x.userId === userId)
  return t ? { ...t } : null
}

export async function renameTrack(id: string, userId: string, name: string, notes?: string): Promise<Track | null> {
  if (!id || !userId) return null
  if (!name?.trim()) throw new Error('Ponle un nombre a la ruta.')
  const data = { name: name.trim().slice(0, 90), ...(notes != null ? { notes: notes.trim().slice(0, 1000) } : {}) }

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const res = await prisma.track.updateMany({ where: { id, userId }, data })
      if (res.count === 0) return null
      return getTrack(id, userId)
    } catch (error) {
      console.error('Track update failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const t = mem().find((x) => x.id === id && x.userId === userId)
  if (!t) return null
  Object.assign(t, data, { updatedAt: Date.now() })
  return { ...t }
}

export async function deleteTrack(id: string, userId: string): Promise<boolean> {
  if (!id || !userId) return false
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const res = await prisma.track.deleteMany({ where: { id, userId } })
      return res.count > 0
    } catch (error) {
      console.error('Track delete failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const before = mem().length
  g.__pescaplusTracks = mem().filter((t) => !(t.id === id && t.userId === userId))
  return mem().length < before
}

/** Borrar la cuenta borra las rutas (RGPD), como con los waypoints. */
export async function deleteAllTracks(userId: string): Promise<number> {
  if (!userId) return 0
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    const res = await prisma.track.deleteMany({ where: { userId } })
    return res.count
  }
  const before = mem().length
  g.__pescaplusTracks = mem().filter((t) => t.userId !== userId)
  return before - mem().length
}
