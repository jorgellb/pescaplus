import type { FishingSpot } from '@/lib/fishing-spots'
import { solunarDay, type SolunarDay } from '@/lib/solunar'
import { getSpecies, type SpeciesProfile } from '@/lib/fishing-species'

/**
 * Hourly angling forecast (Windguru-style) built from Open-Meteo's free forecast
 * and marine APIs (no key), merged with our own solunar engine into a per-hour
 * fishing score. Fetched server-side (CSP) and cached via ISR. Never throws.
 */
export interface HourPoint {
  time: number // UTC ms
  dateISO: string // local (Madrid) date
  hourLabel: string // "07:00" local
  isDay: boolean
  temp: number | null
  windKmh: number | null
  gustKmh: number | null
  windDir: number | null
  windDirLabel: string | null
  pressure: number | null
  precipProb: number | null
  precipMm: number | null
  cloud: number | null
  code: number | null
  waveM: number | null
  wavePeriod: number | null
  waveDir: number | null
  swellM: number | null
  swellPeriod: number | null
  swellDir: number | null
  currentKmh: number | null
  currentDir: number | null
  seaTempC: number | null
  uv: number | null
  visibilityKm: number | null
  solunar: boolean
  twilight: boolean
  isNow: boolean
  score: number // 0..100
}

export interface MarineForecast {
  available: boolean
  hasMarine: boolean
  hours: HourPoint[]
}

export interface FishingWindow {
  start: number
  end: number
  avg: number
}

/** Best contiguous fishing window of a day (highest-scoring run of hours). */
export function bestWindow(hours: HourPoint[]): FishingWindow | null {
  if (hours.length === 0) return null
  const GOOD = 55
  let best: (FishingWindow & { span: number }) | null = null
  let i = 0
  while (i < hours.length) {
    if (hours[i].score >= GOOD) {
      let j = i
      while (j + 1 < hours.length && hours[j + 1].score >= GOOD) j++
      const seg = hours.slice(i, j + 1)
      const avg = seg.reduce((s, h) => s + h.score, 0) / seg.length
      const span = j - i + 1
      if (!best || avg * span > best.avg * best.span) best = { start: hours[i].time, end: hours[j].time + 3600000, avg, span }
      i = j + 1
    } else i++
  }
  if (best) return { start: best.start, end: best.end, avg: Math.round(best.avg) }
  const top = [...hours].sort((a, b) => b.score - a.score)[0]
  return { start: top.time, end: top.time + 3600000, avg: top.score }
}

/** Group the flat hourly list by local day. */
export function groupByDay(hours: HourPoint[]): { dateISO: string; hours: HourPoint[] }[] {
  const out: { dateISO: string; hours: HourPoint[] }[] = []
  for (const h of hours) {
    const last = out[out.length - 1]
    if (last && last.dateISO === h.dateISO) last.hours.push(h)
    else out.push({ dateISO: h.dateISO, hours: [h] })
  }
  return out
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO']
export const windDirLabel = (deg: number | null) => (deg == null ? null : COMPASS[Math.round(deg / 22.5) % 16])

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function scoreHour(
  h: Omit<HourPoint, 'score'>,
  pressure3hAgo: number | null,
  p: SpeciesProfile,
): number {
  let s = 40
  if (h.solunar) s += p.solunar
  if (h.twilight) s += p.dawnDusk
  else if (!h.isDay) s += p.night

  const w = h.windKmh
  if (w != null) {
    const [lo, hi] = p.windSweet
    if (w >= lo && w <= hi) s += p.windBonus
    else if (w < lo) s += Math.round(p.windBonus * 0.15)
    else if (w <= p.windStrongAt) s += 4
    else s -= 16
  }
  if (h.gustKmh != null && h.gustKmh > 60) s -= 10

  if (h.pressure != null && pressure3hAgo != null) {
    const d = h.pressure - pressure3hAgo
    if (d < -0.6) s += p.pressureFall
    else if (d > 0.6) s -= 8
  }

  if (h.precipProb != null) {
    if (h.precipProb > 70) s -= 10
    else if (h.precipProb >= 40) s -= 4
  }

  if (h.waveM != null) {
    const m = h.waveM
    if (p.wavePref === 'rough') {
      if (m >= 0.75 && m <= 2.5) s += 8
      else if (m < 0.4) s -= 4
      else if (m > 3.5) s -= 8
    } else if (p.wavePref === 'calm') {
      if (m < 0.75) s += 8
      else if (m > 2.5) s -= 14
      else if (m > 1.5) s -= 8
    } else {
      if (m >= 0.5 && m <= 1.5) s += 6
      else if (m > 3) s -= 8
    }
  }

  return Math.max(0, Math.min(100, Math.round(s)))
}

export async function getMarineForecast(spot: FishingSpot, speciesId?: string | null): Promise<MarineForecast> {
  const profile = getSpecies(speciesId)
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${spot.lat}&longitude=${spot.lon}` +
    `&hourly=temperature_2m,precipitation,precipitation_probability,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day,uv_index,visibility` +
    `&timezone=Europe%2FMadrid&forecast_days=7`
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${spot.lat}&longitude=${spot.lon}` +
    `&hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period,swell_wave_direction,ocean_current_velocity,ocean_current_direction,sea_surface_temperature` +
    `&timezone=Europe%2FMadrid&forecast_days=7`

  const [forecast, marine] = await Promise.all([
    getJson(forecastUrl),
    spot.type === 'mar' ? getJson(marineUrl) : Promise.resolve(null),
  ])
  if (!forecast?.hourly?.time) return { available: false, hasMarine: false, hours: [] }

  const off = (forecast.utc_offset_seconds ?? 0) * 1000
  const fh = forecast.hourly
  const toMs = (t: string) => Date.parse(`${t}:00Z`) - off

  // Marine values indexed by time string for a safe merge.
  const mh = marine?.hourly
  const mIndex = new Map<string, number>()
  if (mh?.time) mh.time.forEach((t: string, i: number) => mIndex.set(t, i))

  // Solunar (periods + twilight) for each date in the range.
  const solCache = new Map<string, SolunarDay>()
  const solFor = (dateISO: string) => {
    let s = solCache.get(dateISO)
    if (!s) {
      s = solunarDay(spot.lat, spot.lon, dateISO)
      solCache.set(dateISO, s)
    }
    return s
  }

  const now = Date.now()
  const nowHour = Math.floor(now / 3600000)

  const points: Omit<HourPoint, 'score'>[] = fh.time.map((t: string, i: number) => {
    const time = toMs(t)
    const dateISO = t.slice(0, 10)
    const sol = solFor(dateISO)
    const inPeriod = sol.periods.some((p) => time + 3600000 > p.start && time < p.end)
    const twilight = [sol.sunrise, sol.sunset].some((tw) => tw != null && Math.abs(tw - time) <= 60 * 60000)
    const mi = mh ? mIndex.get(t) : undefined
    const dir = num(fh.wind_direction_10m?.[i])
    return {
      time,
      dateISO,
      hourLabel: t.slice(11, 16),
      isDay: fh.is_day?.[i] === 1,
      temp: num(fh.temperature_2m?.[i]),
      windKmh: num(fh.wind_speed_10m?.[i]),
      gustKmh: num(fh.wind_gusts_10m?.[i]),
      windDir: dir,
      windDirLabel: windDirLabel(dir),
      pressure: num(fh.surface_pressure?.[i]),
      precipProb: num(fh.precipitation_probability?.[i]),
      precipMm: num(fh.precipitation?.[i]),
      cloud: num(fh.cloud_cover?.[i]),
      code: num(fh.weather_code?.[i]),
      waveM: mi != null ? num(mh.wave_height?.[mi]) : null,
      wavePeriod: mi != null ? num(mh.wave_period?.[mi]) : null,
      waveDir: mi != null ? num(mh.wave_direction?.[mi]) : null,
      swellM: mi != null ? num(mh.swell_wave_height?.[mi]) : null,
      swellPeriod: mi != null ? num(mh.swell_wave_period?.[mi]) : null,
      swellDir: mi != null ? num(mh.swell_wave_direction?.[mi]) : null,
      currentKmh: mi != null ? num(mh.ocean_current_velocity?.[mi]) : null,
      currentDir: mi != null ? num(mh.ocean_current_direction?.[mi]) : null,
      seaTempC: mi != null ? num(mh.sea_surface_temperature?.[mi]) : null,
      uv: num(fh.uv_index?.[i]),
      visibilityKm: num(fh.visibility?.[i]) != null ? Math.round((fh.visibility[i] as number) / 100) / 10 : null,
      solunar: inPeriod,
      twilight,
      isNow: Math.floor(time / 3600000) === nowHour,
    }
  })

  const hours: HourPoint[] = points.map((p, i) => ({
    ...p,
    score: scoreHour(p, i >= 3 ? points[i - 3].pressure : null, profile),
  }))

  return { available: hours.length > 0, hasMarine: !!mh, hours }
}
