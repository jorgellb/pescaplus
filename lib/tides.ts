/**
 * Real tide predictions from WorldTides (https://www.worldtides.info).
 *
 * Fetched server-side (the browser CSP blocks external calls) and cached hard
 * (tide extremes are deterministic predictions, so we only refetch every 6 h to
 * stay within the provider's quota). Requires WORLDTIDES_API_KEY; without it the
 * tide section is simply hidden — we never fabricate tide data.
 */
export interface TideExtreme {
  time: number // UTC ms
  height: number // metres, relative to the provider datum
  type: 'alta' | 'baja'
}

export interface TidesInfo {
  /** A key is configured (so the feature is enabled for this site). */
  configured: boolean
  /** Fresh data is available right now. */
  available: boolean
  nextTides: TideExtreme[]
  risingNow: boolean | null
  /** True when the tidal range is small (typical of the Mediterranean). */
  smallRange: boolean
}

const EMPTY = (configured: boolean): TidesInfo => ({
  configured,
  available: false,
  nextTides: [],
  risingNow: null,
  smallRange: false,
})

export async function getTides(lat: number, lon: number): Promise<TidesInfo> {
  const key = process.env.WORLDTIDES_API_KEY
  if (!key) return EMPTY(false)

  try {
    const url = `https://www.worldtides.info/api/v3?extremes&days=2&lat=${lat}&lon=${lon}&key=${key}`
    const res = await fetch(url, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(9000) })
    if (!res.ok) return EMPTY(true)
    const data = await res.json()
    if (data?.status !== 200 || !Array.isArray(data.extremes)) return EMPTY(true)

    const now = Date.now()
    const all: TideExtreme[] = data.extremes.map((e: { dt: number; height: number; type: string }) => ({
      time: e.dt * 1000,
      height: Math.round(e.height * 100) / 100,
      type: e.type === 'High' ? 'alta' : 'baja',
    }))
    const heights = all.map((e) => e.height)
    const range = heights.length ? Math.max(...heights) - Math.min(...heights) : 0
    const nextTides = all.filter((e) => e.time >= now).slice(0, 4)

    return {
      configured: true,
      available: nextTides.length > 0,
      nextTides,
      risingNow: nextTides.length ? nextTides[0].type === 'alta' : null,
      smallRange: range > 0 && range < 0.5,
    }
  } catch {
    return EMPTY(true)
  }
}
