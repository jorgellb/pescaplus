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
  /** Every fetched extreme (past + future) — for drawing the tide curve. */
  all: TideExtreme[]
  risingNow: boolean | null
  /** True when the tidal range is small (typical of the Mediterranean). */
  smallRange: boolean
}

const EMPTY = (configured: boolean): TidesInfo => ({
  configured,
  available: false,
  nextTides: [],
  all: [],
  risingNow: null,
  smallRange: false,
})

/**
 * Approximate tidal coefficient (20–120, Brest-style scale) derived from the
 * spring–neap cycle: highest at new/full moon (spring), lowest at the quarters
 * (neap). It's an orientation value based on the moon phase, not a station-exact
 * coefficient.
 */
export function tideCoefficient(moonPhase: number): number {
  const spring = Math.abs(Math.cos(2 * Math.PI * moonPhase)) // 1 = spring, 0 = neap
  return Math.round(30 + 90 * spring)
}

export function coefficientLabel(coef: number): string {
  if (coef >= 100) return 'Marea viva fuerte'
  if (coef >= 70) return 'Marea viva'
  if (coef >= 50) return 'Media'
  return 'Marea muerta'
}

/**
 * Tide height at an arbitrary instant, cosine-interpolated between the
 * surrounding extremes (the standard approximation between high/low water).
 * Returns null outside the covered range or with fewer than 2 extremes.
 */
export function tideHeightAt(extremes: TideExtreme[], t: number): number | null {
  if (extremes.length < 2) return null
  const sorted = [...extremes].sort((a, b) => a.time - b.time)
  if (t < sorted[0].time || t > sorted[sorted.length - 1].time) return null
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (t >= a.time && t <= b.time) {
      const f = (t - a.time) / (b.time - a.time)
      return Math.round((a.height + ((b.height - a.height) * (1 - Math.cos(Math.PI * f))) / 2) * 100) / 100
    }
  }
  return null
}

/** Whether the tide is rising at an instant (null when unknown). */
export function tideRisingAt(extremes: TideExtreme[], t: number): boolean | null {
  const next = [...extremes].sort((a, b) => a.time - b.time).find((e) => e.time > t)
  return next ? next.type === 'alta' : null
}

export async function getTides(lat: number, lon: number): Promise<TidesInfo> {
  const key = process.env.WORLDTIDES_API_KEY
  if (!key) return EMPTY(false)

  try {
    const url = `https://www.worldtides.info/api/v3?extremes&days=7&lat=${lat}&lon=${lon}&key=${key}`
    const res = await fetch(url, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(12000) })
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
      all,
      risingNow: nextTides.length ? nextTides[0].type === 'alta' : null,
      smallRange: range > 0 && range < 0.5,
    }
  } catch {
    return EMPTY(true)
  }
}
