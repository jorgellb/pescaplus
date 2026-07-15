import { describe, it, expect } from 'vitest'
import { douglasState, navigationWindows, safetyAlerts } from '@/lib/sea-state'
import { seawardBearing, windRelation } from '@/lib/coast'
import { tideHeightAt, tideRisingAt, type TideExtreme } from '@/lib/tides'
import { getSpot } from '@/lib/fishing-spots'
import type { HourPoint } from '@/lib/marine-forecast'

const angDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

function hour(over: Partial<HourPoint>): HourPoint {
  return {
    time: 0, dateISO: '2026-07-15', hourLabel: '12:00', isDay: true,
    temp: 22, windKmh: 10, gustKmh: 15, windDir: 0, windDirLabel: 'N',
    pressure: 1015, precipProb: 0, precipMm: 0, cloud: 0, code: 0,
    waveM: 0.5, wavePeriod: 5, waveDir: 270, swellM: 0.3, swellPeriod: 6, swellDir: 270,
    currentKmh: 0.5, currentDir: 90, seaTempC: 20, uv: 5, visibilityKm: 20,
    solunar: false, twilight: false, isNow: false, score: 50,
    ...over,
  }
}

describe('douglasState', () => {
  it('maps wave heights to the Spanish marine bulletin scale', () => {
    expect(douglasState(0.05)?.name).toBe('Mar llana')
    expect(douglasState(0.3)?.name).toBe('Mar rizada')
    expect(douglasState(1.0)?.name).toBe('Marejadilla')
    expect(douglasState(2.0)?.name).toBe('Marejada')
    expect(douglasState(3.0)?.name).toBe('Fuerte marejada')
    expect(douglasState(5.0)?.name).toBe('Mar gruesa')
    expect(douglasState(null)).toBeNull()
  })
})

describe('safetyAlerts', () => {
  it('raises danger on big seas or violent gusts, nothing when calm', () => {
    expect(safetyAlerts([hour({ waveM: 3.4 })])[0]?.level).toBe('peligro')
    expect(safetyAlerts([hour({ gustKmh: 58 })])[0]?.level).toBe('aviso')
    expect(safetyAlerts([hour({})])).toHaveLength(0)
  })
})

describe('navigationWindows', () => {
  it('finds contiguous safe runs of at least 3 hours', () => {
    const hours = [
      ...Array.from({ length: 4 }, (_, i) => hour({ time: i * 3600000, windKmh: 12, waveM: 0.6 })),
      hour({ time: 4 * 3600000, windKmh: 50, waveM: 2 }),
      hour({ time: 5 * 3600000, windKmh: 12, waveM: 0.5 }),
    ]
    const wins = navigationWindows(hours)
    expect(wins).toHaveLength(1)
    expect(wins[0].start).toBe(0)
    expect(wins[0].end).toBe(4 * 3600000)
  })
})

describe('seawardBearing', () => {
  it('points roughly out to sea for well-known coasts', () => {
    // North coast faces N (0°), Cádiz faces SW-ish (~225°), Valencia E-ish (~90°).
    expect(angDiff(seawardBearing(getSpot('santander')!)!, 0)).toBeLessThanOrEqual(30)
    expect(angDiff(seawardBearing(getSpot('cadiz')!)!, 235)).toBeLessThanOrEqual(50)
    expect(angDiff(seawardBearing(getSpot('valencia')!)!, 100)).toBeLessThanOrEqual(50)
    expect(seawardBearing(getSpot('mequinenza')!)).toBeNull() // inland
  })
})

describe('windRelation', () => {
  it('classifies onshore/offshore/cross correctly', () => {
    expect(windRelation(0, 0)).toBe('onshore') // wind from the sea
    expect(windRelation(180, 0)).toBe('offshore') // wind from the land
    expect(windRelation(90, 0)).toBe('cross')
  })
})

describe('tide interpolation', () => {
  const extremes: TideExtreme[] = [
    { time: 0, height: 0.5, type: 'baja' },
    { time: 6 * 3600000, height: 3.5, type: 'alta' },
    { time: 12 * 3600000, height: 0.5, type: 'baja' },
  ]
  it('hits the extremes and the midpoint of the cosine curve', () => {
    expect(tideHeightAt(extremes, 0)).toBe(0.5)
    expect(tideHeightAt(extremes, 6 * 3600000)).toBe(3.5)
    expect(tideHeightAt(extremes, 3 * 3600000)).toBe(2) // halfway between 0.5 and 3.5
    expect(tideHeightAt(extremes, 99 * 3600000)).toBeNull()
  })
  it('knows whether the tide is rising', () => {
    expect(tideRisingAt(extremes, 3 * 3600000)).toBe(true)
    expect(tideRisingAt(extremes, 9 * 3600000)).toBe(false)
  })
})
