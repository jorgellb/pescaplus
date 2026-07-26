import { isDatabaseConfigured } from '@/lib/products-store'
import { getSpot } from '@/lib/fishing-spots'
import { SEA_SPECIES } from '@/lib/fishing-species'
import { todayMadridISO, addDaysISO } from '@/lib/solunar-format'

/**
 * Shared catches — the one thing a weather model can't tell you: what is
 * actually being caught right now, here.
 *
 * The diary stays private in the browser; sharing is a separate, deliberate
 * act, and only structured fields travel (zone, species, day, count). Three
 * rules keep it honest and keep anglers willing to contribute:
 *
 *  1. NEVER a coordinate — the unit is the zone, which is already public.
 *  2. NEVER the diary note — free text is where a secret spot leaks.
 *  3. Nothing is shown below MIN_REPORTS. One report isn't a trend, and a
 *     lone data point in a small zone is identifiable by whoever was there.
 */
export const RECENT_DAYS = 21
export const MIN_REPORTS = 3

export interface CatchInput {
  spotSlug: string
  speciesId: string
  dateISO: string
  qty?: number
}

export interface SpeciesActivity {
  speciesId: string
  name: string
  /** Reports mentioning this species in the window. */
  reports: number
  /** Fish logged (reports can carry several). */
  fish: number
  /** Share of the window's reports, 0-100. */
  share: number
}

export interface SpotActivity {
  spotSlug: string
  /** Whether there's enough data to show anything at all. */
  enough: boolean
  reports: number
  days: number
  species: SpeciesActivity[]
  /** Most recent day with a report (ISO), for "última captura". */
  lastDateISO: string | null
}

interface StoredCatch { spotSlug: string; speciesId: string; dateISO: string; qty: number; userId: string | null; createdAt: number }
const g = globalThis as unknown as { __pescaplusCatches?: StoredCatch[] }
function mem() { return (g.__pescaplusCatches ??= []) }

const ISO = /^\d{4}-\d{2}-\d{2}$/

/** Validate against the real catalogues; a made-up zone or species never lands. */
export function validateCatch(input: CatchInput): string | null {
  if (!getSpot(input.spotSlug)) return 'Zona no válida.'
  if (!SEA_SPECIES.some((s) => s.id === input.speciesId)) return 'Especie no válida.'
  if (!ISO.test(input.dateISO ?? '')) return 'Fecha no válida.'
  const today = todayMadridISO()
  if (input.dateISO > today) return 'Esa fecha aún no ha llegado.'
  // Compartir una captura de hace dos años no aporta nada a "qué se pesca ahora".
  if (input.dateISO < addDaysISO(today, -365)) return 'Solo se comparten capturas del último año.'
  return null
}

export async function shareCatch(input: CatchInput, userId?: string | null): Promise<void> {
  const err = validateCatch(input)
  if (err) throw new Error(err)
  const qty = Math.min(200, Math.max(1, Math.round(Number(input.qty) || 1)))
  const row = { spotSlug: input.spotSlug, speciesId: input.speciesId, dateISO: input.dateISO, qty, userId: userId ?? null }

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      await prisma.catchReport.create({ data: row })
      return
    } catch (error) {
      console.error('Catch report write failed:', error)
      throw new Error('No se ha podido compartir la captura. Inténtalo de nuevo.')
    }
  }
  mem().push({ ...row, createdAt: Date.now() })
}

function aggregate(rows: { speciesId: string; qty: number; dateISO: string }[], spotSlug: string): SpotActivity {
  const total = rows.length
  if (total < MIN_REPORTS) {
    return { spotSlug, enough: false, reports: total, days: RECENT_DAYS, species: [], lastDateISO: null }
  }
  const byId = new Map<string, { reports: number; fish: number }>()
  let last = ''
  for (const r of rows) {
    const cur = byId.get(r.speciesId) ?? { reports: 0, fish: 0 }
    cur.reports += 1
    cur.fish += r.qty
    byId.set(r.speciesId, cur)
    if (r.dateISO > last) last = r.dateISO
  }
  const species: SpeciesActivity[] = [...byId.entries()]
    .map(([speciesId, v]) => ({
      speciesId,
      name: SEA_SPECIES.find((s) => s.id === speciesId)?.name ?? speciesId,
      reports: v.reports,
      fish: v.fish,
      share: Math.round((v.reports / total) * 100),
    }))
    .sort((a, b) => b.reports - a.reports || b.fish - a.fish)

  return { spotSlug, enough: true, reports: total, days: RECENT_DAYS, species, lastDateISO: last || null }
}

/** What's been caught in a zone lately. Returns `enough: false` below threshold. */
export async function getSpotActivity(spotSlug: string, days = RECENT_DAYS): Promise<SpotActivity> {
  const from = addDaysISO(todayMadridISO(), -days)
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.catchReport.findMany({
        where: { spotSlug, dateISO: { gte: from } },
        select: { speciesId: true, qty: true, dateISO: true },
        take: 1000,
      })
      return aggregate(rows, spotSlug)
    } catch (error) {
      console.warn('Catch activity read failed:', error)
      return { spotSlug, enough: false, reports: 0, days, species: [], lastDateISO: null }
    }
  }
  return aggregate(mem().filter((r) => r.spotSlug === spotSlug && r.dateISO >= from), spotSlug)
}

/** Same window, narrowed to one species — for the species × zone pages. */
export async function getSpeciesActivity(spotSlug: string, speciesId: string, days = RECENT_DAYS): Promise<{
  enough: boolean; reports: number; fish: number; lastDateISO: string | null
}> {
  const all = await getSpotActivity(spotSlug, days)
  const found = all.species.find((s) => s.speciesId === speciesId)
  // El umbral se aplica sobre el total de la zona, no sobre la especie: si ya
  // hay actividad suficiente, decir "y de estas 2 son lubinas" no identifica.
  if (!all.enough || !found) return { enough: false, reports: 0, fish: 0, lastDateISO: null }
  return { enough: true, reports: found.reports, fish: found.fish, lastDateISO: all.lastDateISO }
}
