import { isDatabaseConfigured } from '@/lib/products-store'

/**
 * Public forecast verification ("¿acertamos?"): every day we store what our
 * model predicted for local noon and, the day after, score it against the
 * OFFICIAL AEMET station measurement. The per-zone accuracy is shown openly —
 * a fishing site that grades its own forecasts in public.
 */
export interface ForecastCheckRow {
  id: string
  spotSlug: string
  dateISO: string
  targetUtc: string // ISO hour prefix, e.g. "2026-07-18T10"
  idema: string
  predWindKmh: number
  obsWindKmh: number | null
  errorKmh: number | null
  resolvedAt: number | null
}

export interface SpotAccuracy {
  n: number
  maeKmh: number
  within5: number // fraction 0..1 with |error| <= 5 km/h
}

const globalForChecks = globalThis as unknown as { __pescaplusChecks?: ForecastCheckRow[] }
function memory() {
  if (!globalForChecks.__pescaplusChecks) globalForChecks.__pescaplusChecks = []
  return globalForChecks.__pescaplusChecks
}

export async function upsertPrediction(input: {
  spotSlug: string
  dateISO: string
  targetUtc: string
  idema: string
  predWindKmh: number
}): Promise<void> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.forecastCheck.upsert({
        where: { spotSlug_dateISO: { spotSlug: input.spotSlug, dateISO: input.dateISO } },
        update: { predWindKmh: input.predWindKmh, targetUtc: input.targetUtc, idema: input.idema },
        create: input,
      })
      return
    } catch (error) {
      console.warn('ForecastCheck DB write failed, using memory:', error)
    }
  }
  const store = memory()
  const existing = store.find((r) => r.spotSlug === input.spotSlug && r.dateISO === input.dateISO)
  if (existing) Object.assign(existing, input)
  else store.push({ id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, obsWindKmh: null, errorKmh: null, resolvedAt: null, ...input })
}

export async function listUnresolved(beforeDateISO: string): Promise<ForecastCheckRow[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.forecastCheck.findMany({
        where: { resolvedAt: null, dateISO: { lte: beforeDateISO } },
        take: 500,
      })
      return rows.map((r) => ({ ...r, resolvedAt: r.resolvedAt?.getTime() ?? null }))
    } catch (error) {
      console.warn('ForecastCheck DB read failed, using memory:', error)
    }
  }
  return memory().filter((r) => r.resolvedAt === null && r.dateISO <= beforeDateISO)
}

export async function resolveCheck(id: string, obsWindKmh: number, errorKmh: number): Promise<void> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.forecastCheck.update({ where: { id }, data: { obsWindKmh, errorKmh, resolvedAt: new Date() } })
      return
    } catch (error) {
      console.warn('ForecastCheck DB resolve failed, using memory:', error)
    }
  }
  const row = memory().find((r) => r.id === id)
  if (row) {
    row.obsWindKmh = obsWindKmh
    row.errorKmh = errorKmh
    row.resolvedAt = Date.now()
  }
}

/** Accuracy over the last `days` resolved checks for a zone (null if too few). */
export async function getSpotAccuracy(spotSlug: string, days = 14): Promise<SpotAccuracy | null> {
  let rows: { errorKmh: number | null }[] = []
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      rows = await prisma.forecastCheck.findMany({
        where: { spotSlug, resolvedAt: { not: null } },
        orderBy: { dateISO: 'desc' },
        take: days,
        select: { errorKmh: true },
      })
    } catch {
      rows = []
    }
  } else {
    rows = memory()
      .filter((r) => r.spotSlug === spotSlug && r.resolvedAt !== null)
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
      .slice(0, days)
  }
  const errs = rows.map((r) => r.errorKmh).filter((e): e is number => e != null)
  if (errs.length < 3) return null
  const mae = errs.reduce((s, e) => s + Math.abs(e), 0) / errs.length
  const within5 = errs.filter((e) => Math.abs(e) <= 5).length / errs.length
  return { n: errs.length, maeKmh: Math.round(mae * 10) / 10, within5 }
}
