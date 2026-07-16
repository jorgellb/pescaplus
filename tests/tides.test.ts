import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { getTides, tideCoefficient, coefficientLabel, nextExtremes, tideRisingAt } from '@/lib/tides'

describe('tideCoefficient', () => {
  it('is highest at new/full moon (spring) and lowest at the quarters (neap)', () => {
    const spring = tideCoefficient(0) // new moon
    const full = tideCoefficient(0.5) // full moon
    const neap = tideCoefficient(0.25) // first quarter
    expect(spring).toBeGreaterThan(100)
    expect(full).toBeGreaterThan(100)
    expect(neap).toBeLessThan(45)
    expect(coefficientLabel(spring)).toMatch(/viva/i)
    expect(coefficientLabel(neap)).toMatch(/muerta/i)
  })
})

const nowSec = Math.floor(Date.now() / 1000)

function mockFetch(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: async () => body } as Response)
}

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.WORLDTIDES_API_KEY
})

describe('getTides', () => {
  it('is disabled (hidden) when no API key is configured', async () => {
    const t = await getTides(36.53, -6.29)
    expect(t.configured).toBe(false)
    expect(t.available).toBe(false)
    expect(t.all).toEqual([])
  })

  describe('with an API key', () => {
    beforeEach(() => {
      process.env.WORLDTIDES_API_KEY = 'test-key'
    })

    it('parses/validates extremes; views derive at render (falling tide now)', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetch({
          status: 200,
          station: 'Cadiz',
          extremes: [
            { dt: nowSec - 3 * 3600, height: 3.1, type: 'High' },
            { dt: nowSec + 3 * 3600, height: 0.42, type: 'Low' },
            { dt: nowSec + 9 * 3600, height: 3.24, type: 'High' },
            { dt: nowSec + 15 * 3600, height: 0.5, type: 'Low' },
          ],
        }),
      )
      const t = await getTides(36.53, -6.29)
      expect(t.configured).toBe(true)
      expect(t.available).toBe(true)
      expect(t.station).toBe('Cadiz')
      expect(t.fetchedAt).not.toBeNull()
      const now = Date.now()
      const upcoming = nextExtremes(t.all, now)
      expect(upcoming).toHaveLength(3) // only the three future extremes
      expect(upcoming[0].type).toBe('baja')
      expect(upcoming[0].height).toBe(0.42)
      expect(tideRisingAt(t.all, now)).toBe(false) // next extreme is a low → falling
      expect(t.smallRange).toBe(false) // Atlantic range ~2.8 m
    })

    it('flags a small tidal range (Mediterranean)', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetch({
          status: 200,
          extremes: [
            { dt: nowSec + 1800, height: 0.35, type: 'High' },
            { dt: nowSec + 1800 + 6 * 3600, height: 0.12, type: 'Low' },
          ],
        }),
      )
      const t = await getTides(41.35, 2.17)
      expect(t.available).toBe(true)
      expect(t.smallRange).toBe(true)
      expect(tideRisingAt(t.all, Date.now())).toBe(true)
    })

    it('hides contradictory data (two consecutive high waters) instead of showing it', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetch({
          status: 200,
          extremes: [
            { dt: nowSec + 3600, height: 3.0, type: 'High' },
            { dt: nowSec + 6 * 3600, height: 3.2, type: 'High' },
          ],
        }),
      )
      const t = await getTides(36.53, -6.29)
      expect(t.configured).toBe(true)
      expect(t.available).toBe(false)
      expect(t.all).toEqual([])
    })

    it('degrades gracefully on a provider error', async () => {
      vi.stubGlobal('fetch', mockFetch({ status: 400, error: 'API key is invalid' }))
      const t = await getTides(36.53, -6.29)
      expect(t.configured).toBe(true)
      expect(t.available).toBe(false)
    })
  })
})
