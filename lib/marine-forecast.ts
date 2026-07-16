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
  /** Predicted fish activity (solunar, light, pressure, species) 0..100. */
  activity: number
  /** Conditions quality for the selected modality (wind, gusts, waves) 0..100. */
  conditions: number
  /** Combined score used for windows/charts, 0..100. */
  score: number
}

/** Fishing modality — each gets its own condition thresholds. A kayak is not a small boat. */
export type Modality = 'tierra' | 'barco' | 'kayak'

export interface ModalityProfile {
  id: Modality
  name: string
  emoji: string
  /** Wind (km/h): fully comfortable up to `windOk`, unusable at `windMax`. */
  windOk: number
  windMax: number
  gustMax: number
  /** Waves (m): fine up to `waveOk`, unusable at `waveMax`. */
  waveOk: number
  waveMax: number
  /** Thresholds for a "safe outing" window (used for salida/regreso). */
  navWind: number
  navGust: number
  navWave: number
}

export const MODALITIES: ModalityProfile[] = [
  { id: 'tierra', name: 'Tierra', emoji: '🏖️', windOk: 25, windMax: 55, gustMax: 75, waveOk: 2, waveMax: 3.5, navWind: 35, navGust: 55, navWave: 2.5 },
  { id: 'barco', name: 'Embarcación', emoji: '🚤', windOk: 18, windMax: 40, gustMax: 50, waveOk: 1.0, waveMax: 2.0, navWind: 30, navGust: 45, navWave: 1.25 },
  { id: 'kayak', name: 'Kayak', emoji: '🛶', windOk: 12, windMax: 26, gustMax: 35, waveOk: 0.6, waveMax: 1.2, navWind: 18, navGust: 28, navWave: 0.8 },
]

export function getModality(id?: string | null): ModalityProfile {
  return MODALITIES.find((m) => m.id === id) ?? MODALITIES[0]
}

/** One scored factor — powers the transparent "¿por qué esta puntuación?" breakdown. */
export interface ScoreFactor {
  label: string
  pts: number
  /** 'modelo' = physical model data (Open-Meteo); 'propio' = PescaPlus calculation (solunar…). */
  kind: 'modelo' | 'propio'
}

export interface MarineForecast {
  available: boolean
  hasMarine: boolean
  hours: HourPoint[]
  meta: {
    /** Epoch ms when the provider was queried (page generation time under ISR). */
    fetchedAt: number | null
    /** Distance (km) from the spot to the weather model grid point. */
    gridKm: number | null
    /** Distance (km) from the spot to the marine model grid point. */
    marineGridKm: number | null
  }
}

/** Seconds between refetches — drives the "próxima actualización" metadata. */
export const FORECAST_REVALIDATE_S = 1800

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * 111.32
  const dLon = (lon2 - lon1) * 111.32 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180))
  return Math.round(Math.sqrt(dLat * dLat + dLon * dLon) * 10) / 10
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

type ScoredInput = Omit<HourPoint, 'score' | 'activity' | 'conditions'>

const clamp100 = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

/**
 * Fish-activity factors: what the fish are predicted to be doing (solunar,
 * light, pressure trend, species preferences). Base 40; each factor is listed
 * so the UI can show the transparent breakdown.
 */
export function activityFactors(h: ScoredInput, pressure3hAgo: number | null, p: SpeciesProfile): ScoreFactor[] {
  const f: ScoreFactor[] = []
  if (h.solunar) f.push({ label: 'Periodo solunar', pts: p.solunar, kind: 'propio' })
  if (h.twilight) f.push({ label: 'Amanecer / atardecer', pts: p.dawnDusk, kind: 'propio' })
  else if (!h.isDay && p.night > 0) f.push({ label: `Horas nocturnas (${p.name.toLowerCase()})`, pts: p.night, kind: 'propio' })

  if (h.pressure != null && pressure3hAgo != null) {
    const d = h.pressure - pressure3hAgo
    if (d < -0.6) f.push({ label: 'Presión bajando', pts: p.pressureFall, kind: 'modelo' })
    else if (d > 0.6) f.push({ label: 'Presión subiendo', pts: -8, kind: 'modelo' })
  }

  const w = h.windKmh
  if (w != null && w >= 6 && w <= 30) f.push({ label: 'Agua rizada por el viento', pts: 6, kind: 'modelo' })

  if (h.waveM != null) {
    const m = h.waveM
    if (p.wavePref === 'rough') {
      if (m >= 0.75 && m <= 2.5) f.push({ label: `Rompiente que activa a la ${p.name.toLowerCase()}`, pts: 10, kind: 'modelo' })
      else if (m < 0.4) f.push({ label: 'Mar demasiado plano para la especie', pts: -4, kind: 'modelo' })
    } else if (p.wavePref === 'calm') {
      if (m < 0.75) f.push({ label: 'Agua calmada, ideal para la especie', pts: 8, kind: 'modelo' })
      else if (m > 1.5) f.push({ label: 'Demasiada mar para la especie', pts: -8, kind: 'modelo' })
    } else if (m >= 0.5 && m <= 1.5) {
      f.push({ label: 'Algo de mar, favorable', pts: 6, kind: 'modelo' })
    }
  }
  return f
}

/**
 * Modality-conditions factors: whether a human can fish comfortably/safely in
 * this modality (wind, gusts, waves, rain). The SAME onshore wind that wakes up
 * the shore bite penalises a kayak here — never one sign for all modalities.
 */
export function conditionsFactors(h: ScoredInput, m: ModalityProfile): ScoreFactor[] {
  const f: ScoreFactor[] = []
  const w = h.windKmh
  if (w != null && w > m.windOk) {
    const over = Math.min(1, (w - m.windOk) / Math.max(1, m.windMax - m.windOk))
    f.push({ label: `Viento de ${Math.round(w)} km/h para ${m.name.toLowerCase()}`, pts: -Math.round(15 + 45 * over), kind: 'modelo' })
  }
  if (h.gustKmh != null && h.gustKmh > m.gustMax) {
    f.push({ label: `Rachas de ${Math.round(h.gustKmh)} km/h`, pts: -20, kind: 'modelo' })
  }
  if (h.waveM != null && h.waveM > m.waveOk) {
    const over = Math.min(1, (h.waveM - m.waveOk) / Math.max(0.1, m.waveMax - m.waveOk))
    f.push({ label: `Olas de ${h.waveM.toFixed(1)} m para ${m.name.toLowerCase()}`, pts: -Math.round(12 + 38 * over), kind: 'modelo' })
  }
  if (m.id !== 'tierra' && h.swellPeriod != null && h.swellPeriod >= 12 && (h.swellM ?? 0) >= 0.8) {
    f.push({ label: `Mar de fondo de ${Math.round(h.swellPeriod)} s`, pts: -10, kind: 'modelo' })
  }
  if (h.precipProb != null && h.precipProb > 70) f.push({ label: 'Lluvia probable', pts: -10, kind: 'modelo' })
  else if (h.precipProb != null && h.precipProb >= 40) f.push({ label: 'Posible lluvia', pts: -4, kind: 'modelo' })
  return f
}

const ACTIVITY_BASE = 40
const CONDITIONS_BASE = 90

function scoreHour(h: ScoredInput, pressure3hAgo: number | null, p: SpeciesProfile, m: ModalityProfile) {
  const activity = clamp100(ACTIVITY_BASE + activityFactors(h, pressure3hAgo, p).reduce((s, x) => s + x.pts, 0))
  const conditions = clamp100(CONDITIONS_BASE + conditionsFactors(h, m).reduce((s, x) => s + x.pts, 0))
  // Combined: activity-led, but unusable conditions cap the result — a great
  // bite you cannot fish is not a great hour.
  let score = Math.round(activity * 0.6 + conditions * 0.4)
  if (conditions < 30) score = Math.min(score, 35)
  return { activity, conditions, score: clamp100(score) }
}

export async function getMarineForecast(
  spot: FishingSpot,
  speciesId?: string | null,
  modalityId?: string | null,
): Promise<MarineForecast> {
  const profile = getSpecies(speciesId)
  const modality = getModality(modalityId)
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
  const emptyMeta = { fetchedAt: null, gridKm: null, marineGridKm: null }
  if (!forecast?.hourly?.time) return { available: false, hasMarine: false, hours: [], meta: emptyMeta }

  // Trust metadata: when the data was fetched and how far the model grid point
  // sits from the actual spot (Open-Meteo returns its snapped coordinates).
  const meta: MarineForecast['meta'] = {
    fetchedAt: Date.now(),
    gridKm:
      typeof forecast.latitude === 'number' && typeof forecast.longitude === 'number'
        ? distanceKm(spot.lat, spot.lon, forecast.latitude, forecast.longitude)
        : null,
    marineGridKm:
      marine && typeof marine.latitude === 'number' && typeof marine.longitude === 'number'
        ? distanceKm(spot.lat, spot.lon, marine.latitude, marine.longitude)
        : null,
  }

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

  const points: ScoredInput[] = fh.time.map((t: string, i: number) => {
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
    ...scoreHour(p, i >= 3 ? points[i - 3].pressure : null, profile, modality),
  }))

  return { available: hours.length > 0, hasMarine: !!mh, hours, meta }
}

/** Pressure 3 h before an hour of the list — for recomputing factor breakdowns at render. */
export function pressure3hAgo(hours: HourPoint[], h: HourPoint): number | null {
  const idx = hours.indexOf(h)
  return idx >= 3 ? hours[idx - 3].pressure : null
}
