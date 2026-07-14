import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { getTides } from '@/lib/tides'

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
    expect(t.nextTides).toEqual([])
  })

  describe('with an API key', () => {
    beforeEach(() => {
      process.env.WORLDTIDES_API_KEY = 'test-key'
    })

    it('parses upcoming extremes and detects falling tide', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetch({
          status: 200,
          extremes: [
            { dt: nowSec - 3600, height: 3.1, type: 'High' },
            { dt: nowSec + 3600, height: 0.42, type: 'Low' },
            { dt: nowSec + 7200, height: 3.24, type: 'High' },
            { dt: nowSec + 14400, height: 0.5, type: 'Low' },
          ],
        }),
      )
      const t = await getTides(36.53, -6.29)
      expect(t.configured).toBe(true)
      expect(t.available).toBe(true)
      expect(t.nextTides).toHaveLength(3) // only the three future extremes
      expect(t.nextTides[0].type).toBe('baja')
      expect(t.nextTides[0].height).toBe(0.42)
      expect(t.risingNow).toBe(false) // next extreme is a low → tide is falling
      expect(t.smallRange).toBe(false) // Atlantic range ~2.8 m
    })

    it('flags a small tidal range (Mediterranean)', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetch({
          status: 200,
          extremes: [
            { dt: nowSec + 1800, height: 0.35, type: 'High' },
            { dt: nowSec + 9000, height: 0.12, type: 'Low' },
          ],
        }),
      )
      const t = await getTides(41.35, 2.17)
      expect(t.available).toBe(true)
      expect(t.smallRange).toBe(true)
      expect(t.risingNow).toBe(true)
    })

    it('degrades gracefully on a provider error', async () => {
      vi.stubGlobal('fetch', mockFetch({ status: 400, error: 'API key is invalid' }))
      const t = await getTides(36.53, -6.29)
      expect(t.configured).toBe(true)
      expect(t.available).toBe(false)
    })
  })
})
