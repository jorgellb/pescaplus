/**
 * Real tide predictions from WorldTides (https://www.worldtides.info).
 *
 * Fetched server-side (the browser CSP blocks external calls) and cached hard
 * (tide extremes are deterministic predictions, so we only refetch every 6 h to
 * stay within the provider's quota). Requires WORLDTIDES_API_KEY; without it the
 * tide section is simply hidden — we never fabricate tide data.
 *
 * IMPORTANT: everything time-sensitive (next tide, rising/falling) must be
 * derived AT RENDER from `all` + the page's own "now", never from fetch-time
 * snapshots — with ISR the fetch may be hours old and the two would contradict.
 */
export interface TideExtreme {
  time: number // UTC ms
  height: number // metres, relative to the provider datum
  type: 'alta' | 'baja'
}

export interface TidesInfo {
  /** A key is configured (so the feature is enabled for this site). */
  configured: boolean
  /** Validated data is available. */
  available: boolean
  /** Every fetched extreme (past + future), validated — derive views from this. */
  all: TideExtreme[]
  /** True when the tidal range is small (typical of the Mediterranean). */
  smallRange: boolean
  /** Epoch ms when this data was fetched from the provider. */
  fetchedAt: number | null
  /** Nearest tide station reported by the provider, when available. */
  station: string | null
}

/** Datum note shown wherever heights appear (they can be negative vs MSL). */
export const TIDE_DATUM_NOTE =
  'Alturas respecto al nivel medio del mar (MSL): en mareas vivas pueden ser negativas.'

/** Seconds between refetches — drives the "próxima actualización" metadata. */
export const TIDES_REVALIDATE_S = 21600

const EMPTY = (configured: boolean): TidesInfo => ({
  configured,
  available: false,
  all: [],
  smallRange: false,
  fetchedAt: null,
  station: null,
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
 * Automatic consistency check before anything is shown to the user: extremes
 * must alternate high/low and be spaced plausibly for semidiurnal/diurnal tides
 * (2–15 h apart). Returns the sorted list when valid, or null when the data
 * contradicts itself (two incompatible high waters, missing lows…).
 */
export function validateExtremes(extremes: TideExtreme[]): TideExtreme[] | null {
  if (extremes.length < 2) return null
  const sorted = [...extremes].sort((a, b) => a.time - b.time)
  for (let i = 1; i < sorted.length; i++) {
    const gapH = (sorted[i].time - sorted[i - 1].time) / 3600000
    if (sorted[i].type === sorted[i - 1].type) return null // two highs (or lows) in a row
    if (gapH < 2 || gapH > 15) return null // implausible spacing
    if (sorted[i].type === 'alta' && sorted[i].height < sorted[i - 1].height) return null
    if (sorted[i].type === 'baja' && sorted[i].height > sorted[i - 1].height) return null
  }
  return sorted
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

/** Upcoming extremes from an instant — the render-time replacement for fetch-time "nextTides". */
export function nextExtremes(extremes: TideExtreme[], t: number, count = 4): TideExtreme[] {
  return [...extremes].sort((a, b) => a.time - b.time).filter((e) => e.time > t).slice(0, count)
}

export async function getTides(lat: number, lon: number): Promise<TidesInfo> {
  const key = process.env.WORLDTIDES_API_KEY
  if (!key) return EMPTY(false)

  try {
    const url = `https://www.worldtides.info/api/v3?extremes&days=7&lat=${lat}&lon=${lon}&key=${key}`
    const res = await fetch(url, { next: { revalidate: TIDES_REVALIDATE_S }, signal: AbortSignal.timeout(12000) })
    if (!res.ok) return EMPTY(true)
    const data = await res.json()
    if (data?.status !== 200 || !Array.isArray(data.extremes)) return EMPTY(true)

    const raw: TideExtreme[] = data.extremes.map((e: { dt: number; height: number; type: string }) => ({
      time: e.dt * 1000,
      height: Math.round(e.height * 100) / 100,
      type: e.type === 'High' ? 'alta' : 'baja',
    }))
    // Never show contradictory tide data: validate or hide.
    const all = validateExtremes(raw)
    if (!all) return EMPTY(true)

    const heights = all.map((e) => e.height)
    const range = Math.max(...heights) - Math.min(...heights)

    return {
      configured: true,
      available: true,
      all,
      smallRange: range > 0 && range < 0.5,
      fetchedAt: Date.now(),
      station: typeof data.station === 'string' && data.station ? data.station : null,
    }
  } catch {
    return EMPTY(true)
  }
}
