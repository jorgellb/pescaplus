import { describe, it, expect } from 'vitest'
import { solunarDay } from '@/lib/solunar'

const hm = (ms: number | null) =>
  ms == null
    ? '—'
    : new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms))
const hourMadrid = (ms: number) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false }).format(new Date(ms)))

describe('solunar', () => {
  it('computes plausible sun/moon times for Madrid on 2026-07-14', () => {
    const s = solunarDay(40.4168, -3.7038, '2026-07-14')
    // eslint-disable-next-line no-console
    console.log('Madrid 2026-07-14 →', {
      sunrise: hm(s.sunrise),
      sunset: hm(s.sunset),
      moonrise: hm(s.moonrise),
      moonset: hm(s.moonset),
      phase: s.moonPhaseName,
      illum: `${Math.round(s.moonIllumination * 100)}%`,
      rating: s.rating,
      periods: s.periods.map((p) => `${p.kind} ${hm(p.start)}-${hm(p.end)}`),
    })
    expect(s.sunrise).not.toBeNull()
    expect(s.sunset).not.toBeNull()
    // Mid-July Madrid: sunrise ~06:5x–07:0x, sunset ~21:3x–21:4x CEST.
    expect(hourMadrid(s.sunrise!)).toBeGreaterThanOrEqual(6)
    expect(hourMadrid(s.sunrise!)).toBeLessThanOrEqual(7)
    expect(hourMadrid(s.sunset!)).toBeGreaterThanOrEqual(21)
    expect(hourMadrid(s.sunset!)).toBeLessThanOrEqual(22)
    expect(s.moonIllumination).toBeGreaterThanOrEqual(0)
    expect(s.moonIllumination).toBeLessThanOrEqual(1)
    expect(s.periods.length).toBeGreaterThan(0)
    expect(s.rating).toBeGreaterThanOrEqual(1)
    expect(s.rating).toBeLessThanOrEqual(5)
  })

  it('detects a near-full moon around 2026-07-29', () => {
    // Full moon is ~2026-07-29; illumination should be high.
    const s = solunarDay(40.4168, -3.7038, '2026-07-29')
    // eslint-disable-next-line no-console
    console.log('Madrid 2026-07-29 →', { phase: s.moonPhaseName, illum: `${Math.round(s.moonIllumination * 100)}%` })
    expect(s.moonIllumination).toBeGreaterThan(0.85)
  })
})
