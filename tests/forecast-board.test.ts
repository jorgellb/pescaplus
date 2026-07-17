import { describe, it, expect } from 'vitest'
import { slimScore } from '@/lib/day-scores'
import { getModality } from '@/lib/marine-forecast'
import { agreementLevel } from '@/lib/model-agreement'
import { fmtWindowRange } from '@/lib/solunar-format'
import { upsertPrediction, listUnresolved, resolveCheck, getSpotAccuracy } from '@/lib/verification-store'

const tierra = getModality('tierra')
const barco = getModality('barco')
const kayak = getModality('kayak')

describe('slimScore — day board ranking', () => {
  it('a calm coastal day scores well', () => {
    const { score, navegabilidad } = slimScore(tierra, true, 4, 8, 15, 0.4, 0)
    expect(score).toBeGreaterThanOrEqual(70)
    expect(navegabilidad).toBe('ok')
  })

  it('a rough windy day scores low', () => {
    const { score } = slimScore(tierra, true, 3, 55, 80, 3.0, 90)
    expect(score).toBeLessThan(45)
  })

  // Regression: the Viveiro bug — a coastal zone whose wave data is missing was
  // treated as a flat sea and floated to the top ("Excelente"). Missing sea
  // must be flagged unknown and can never score excellent.
  it('coastal zone with UNKNOWN wave never scores excellent', () => {
    const { score, navegabilidad } = slimScore(tierra, true, 5, 6, 12, null, 0)
    expect(score).toBeLessThan(70) // not "Excelente"
    expect(navegabilidad).toBe('ok') // tierra doesn't need the sea reading
  })

  it('unknown wave means navigation cannot be confirmed for barco/kayak', () => {
    const boat = slimScore(barco, true, 5, 6, 12, null, 0)
    expect(boat.navegabilidad).toBe('unknown')
    expect(boat.score).toBeLessThanOrEqual(45)
    const yak = slimScore(kayak, true, 5, 6, 12, null, 0)
    expect(yak.navegabilidad).toBe('unknown')
  })

  it('over navigation limits caps the score and marks not navegable', () => {
    const { score, navegabilidad } = slimScore(kayak, true, 4, 40, 45, 2.0, 0)
    expect(navegabilidad).toBe('no')
    expect(score).toBeLessThanOrEqual(25)
  })

  it('interior (embalse) zones are never wave-unknown and always tierra-navegable', () => {
    const { navegabilidad } = slimScore(tierra, false, 3, 10, 18, null, 0)
    expect(navegabilidad).toBe('ok')
  })

  it('calmer sea outranks a rougher one on an otherwise equal day', () => {
    const calm = slimScore(tierra, true, 3, 8, 14, 0.3, 0).score
    const rough = slimScore(tierra, true, 3, 8, 14, 1.8, 0).score
    expect(calm).toBeGreaterThan(rough)
  })
})

describe('agreementLevel — multi-model confidence', () => {
  it('classifies spread into alta/media/baja at the right boundaries', () => {
    expect(agreementLevel(0)).toBe('alta')
    expect(agreementLevel(4.9)).toBe('alta')
    expect(agreementLevel(5)).toBe('media')
    expect(agreementLevel(9.9)).toBe('media')
    expect(agreementLevel(10)).toBe('baja')
    expect(agreementLevel(25)).toBe('baja')
  })
})

describe('getSpotAccuracy — public verification stats (memory path)', () => {
  it('returns null under 3 resolved checks and the MAE/within-5 once there are enough', async () => {
    const slug = `__test-zone-${Math.random().toString(36).slice(2)}`
    // Predicted 20 km/h each day; measured 22, 18, 27 → errors +2, -2, +7.
    const cases = [
      { date: '2026-06-01', obs: 22 },
      { date: '2026-06-02', obs: 18 },
      { date: '2026-06-03', obs: 27 },
    ]
    for (const c of cases) {
      await upsertPrediction({ spotSlug: slug, dateISO: c.date, targetUtc: `${c.date}T10`, idema: '9999X', predWindKmh: 20 })
    }
    // With everything still pending, there are no resolved checks yet.
    expect(await getSpotAccuracy(slug)).toBeNull()

    const pending = (await listUnresolved('2026-06-10')).filter((r) => r.spotSlug === slug)
    for (const row of pending) {
      const obs = cases.find((c) => c.date === row.dateISO)?.obs ?? 0
      await resolveCheck(row.id, obs, obs - row.predWindKmh)
    }

    const acc = await getSpotAccuracy(slug)
    expect(acc).not.toBeNull()
    expect(acc!.n).toBe(3)
    // MAE = (2 + 2 + 7) / 3 = 3.67
    expect(acc!.maeKmh).toBeCloseTo(3.7, 1)
    // 2 of 3 within ±5 km/h
    expect(acc!.within5).toBeCloseTo(2 / 3, 5)
  })
})

describe('fmtWindowRange — no confusing 00:00–00:00', () => {
  const dayStart = new Date('2026-07-15T00:00:00+02:00').getTime()
  const h = (n: number) => dayStart + n * 3600000

  it('a full-day window says so', () => {
    expect(fmtWindowRange(dayStart, dayStart + 24 * 3600000, dayStart)).toBe('Todo el día')
  })

  it('an end at day close renders as 24:00, never 00:00', () => {
    const label = fmtWindowRange(h(18), dayStart + 24 * 3600000, dayStart)
    expect(label).toContain('24:00')
    expect(label).not.toMatch(/00:00\s*$/)
  })

  it('a normal window shows both ends', () => {
    expect(fmtWindowRange(h(6), h(9), dayStart)).toMatch(/\d{2}:\d{2}\s*–\s*\d{2}:\d{2}/)
  })
})
