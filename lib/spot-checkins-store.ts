import { isDatabaseConfigured } from '@/lib/products-store'

/**
 * "Voy hoy" — a lightweight, opt-in social signal separate from creating a
 * full quedada: mark that you're heading to a zone today, see how many
 * others did the same. DB-backed with a memory fallback for local dev/tests.
 */
export interface CheckinStatus {
  count: number
  going: boolean
}

const g = globalThis as unknown as { __pescaplusCheckins?: { userId: string; spotSlug: string; dateISO: string }[] }
function mem() {
  if (!g.__pescaplusCheckins) g.__pescaplusCheckins = []
  return g.__pescaplusCheckins
}

export async function getCheckinStatus(spotSlug: string, dateISO: string, userId: string | null): Promise<CheckinStatus> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const [count, mine] = await Promise.all([
        prisma.spotCheckin.count({ where: { spotSlug, dateISO } }),
        userId ? prisma.spotCheckin.findUnique({ where: { userId_spotSlug_dateISO: { userId, spotSlug, dateISO } } }) : null,
      ])
      return { count, going: !!mine }
    } catch (error) {
      console.warn('SpotCheckin read failed:', error)
      return { count: 0, going: false }
    }
  }
  const rows = mem().filter((r) => r.spotSlug === spotSlug && r.dateISO === dateISO)
  return { count: rows.length, going: userId ? rows.some((r) => r.userId === userId) : false }
}

/** Toggles the current user's check-in and returns the fresh status. */
export async function toggleCheckin(userId: string, spotSlug: string, dateISO: string): Promise<CheckinStatus> {
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const existing = await prisma.spotCheckin.findUnique({ where: { userId_spotSlug_dateISO: { userId, spotSlug, dateISO } } })
      if (existing) await prisma.spotCheckin.delete({ where: { id: existing.id } })
      else await prisma.spotCheckin.create({ data: { userId, spotSlug, dateISO } })
      const count = await prisma.spotCheckin.count({ where: { spotSlug, dateISO } })
      return { count, going: !existing }
    } catch (error) {
      console.error('SpotCheckin write failed:', error)
      throw new Error('No se ha podido guardar ahora mismo. Inténtalo de nuevo en unos minutos.')
    }
  }
  const store = mem()
  const idx = store.findIndex((r) => r.userId === userId && r.spotSlug === spotSlug && r.dateISO === dateISO)
  if (idx >= 0) store.splice(idx, 1)
  else store.push({ userId, spotSlug, dateISO })
  const count = store.filter((r) => r.spotSlug === spotSlug && r.dateISO === dateISO).length
  return { count, going: idx < 0 }
}
