import { describe, it, expect } from 'vitest'
import { buildTimeline } from '@/lib/plan'
import { solunarDay } from '@/lib/solunar'

describe('buildTimeline', () => {
  it('orders the day events and highlights majors + window', () => {
    const sol = solunarDay(36.53, -6.29, '2026-07-18')
    const dayStart = (sol.sunrise ?? 0) - ((sol.sunrise ?? 0) % 86400000) // rough anchor unused for assertions
    const start = sol.firstLight! - 2 * 3600000
    const items = buildTimeline({ sol, extremes: [], win: { start: sol.sunrise!, end: sol.sunrise! + 3 * 3600000, avg: 80 }, dayStart: start })
    expect(items.length).toBeGreaterThan(4)
    for (let i = 1; i < items.length; i++) expect(items[i].time).toBeGreaterThanOrEqual(items[i - 1].time)
    expect(items.some((x) => x.highlight)).toBe(true)
  })
})

describe('sanitizeSpanishProse (anti chain-of-thought leak)', () => {
  it('discards English reasoning leaks and keeps Spanish prose', async () => {
    const { sanitizeSpanishProse } = await import('@/lib/nvidia-ai')
    const leak = 'We need to produce a brief tactical advice, 2 paragraphs, max 110 words total. Must be in Spanish, as PescaPlus advisor, human tone, no mention of AI.'
    expect(sanitizeSpanishProse(leak)).toBe('')
    const ok = 'Con la mar en calma y el agua a 23°C, trabaja la orilla con bajos finos a primera hora. Aprovecha el periodo solunar de la tarde para insistir con la subiente de la marea.'
    expect(sanitizeSpanishProse(ok)).toBe(ok)
    expect(sanitizeSpanishProse('<think>the user wants...</think>Pesca la subiente con gusana en el agua de la marea.')).toContain('Pesca la subiente')
    expect(sanitizeSpanishProse('Soy una inteligencia artificial y este es el plan de pesca para la marea.')).toBe('')
  })
})
