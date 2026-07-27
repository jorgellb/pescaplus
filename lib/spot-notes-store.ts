import { isDatabaseConfigured } from '@/lib/products-store'

/**
 * Private per-user notes on a fishing zone — a field notebook ("aquí va bien
 * con marea baja") that only its author ever sees, persisted across visits
 * and devices (unlike "favoritos", which lives in localStorage). DB-backed
 * with a memory fallback for local dev / tests.
 */
export interface SpotNote {
  spotSlug: string
  text: string
  updatedAt: number
}

const WRITE_FAIL = 'No se ha podido guardar tu nota ahora mismo. Inténtalo de nuevo en unos minutos.'

const g = globalThis as unknown as { __pescaplusSpotNotes?: Map<string, SpotNote> }
function mem(): Map<string, SpotNote> {
  if (!g.__pescaplusSpotNotes) g.__pescaplusSpotNotes = new Map()
  return g.__pescaplusSpotNotes
}
const memKey = (userId: string, spotSlug: string) => `${userId}:${spotSlug}`

export async function getSpotNote(userId: string, spotSlug: string): Promise<SpotNote | null> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.spotNote.findUnique({ where: { userId_spotSlug: { userId, spotSlug } } })
      return row ? { spotSlug: row.spotSlug, text: row.text, updatedAt: row.updatedAt.getTime() } : null
    } catch (error) {
      console.warn('SpotNote read failed:', error)
      return null
    }
  }
  return mem().get(memKey(userId, spotSlug)) ?? null
}

/** Saves the note, or deletes it when `text` is blank (an empty note is no note). */
export async function saveSpotNote(userId: string, spotSlug: string, text: string): Promise<SpotNote> {
  const trimmed = text.trim().slice(0, 2000)

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      if (!trimmed) {
        await prisma.spotNote.deleteMany({ where: { userId, spotSlug } })
        return { spotSlug, text: '', updatedAt: Date.now() }
      }
      const row = await prisma.spotNote.upsert({
        where: { userId_spotSlug: { userId, spotSlug } },
        update: { text: trimmed },
        create: { userId, spotSlug, text: trimmed },
      })
      return { spotSlug: row.spotSlug, text: row.text, updatedAt: row.updatedAt.getTime() }
    } catch (error) {
      console.error('SpotNote write failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }

  if (!trimmed) {
    mem().delete(memKey(userId, spotSlug))
    return { spotSlug, text: '', updatedAt: Date.now() }
  }
  const note: SpotNote = { spotSlug, text: trimmed, updatedAt: Date.now() }
  mem().set(memKey(userId, spotSlug), note)
  return note
}
