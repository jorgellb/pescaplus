import { FISHING_SPOTS } from '@/lib/fishing-spots'
import { getModality, type Modality, type ModalityProfile } from '@/lib/marine-forecast'
import { solunarDay } from '@/lib/solunar'
import { todayMadridISO, addDaysISO } from '@/lib/solunar-format'

/**
 * National day board — the inverse question ("this Saturday, WHERE?"). One
 * bulk Open-Meteo request per ~100 zones brings the daily maxima for all 195
 * spots and 7 days, and a slim score ranks the whole coastline for a given
 * day + modality. The zone dashboard remains the precise per-hour source;
 * this layer only has to order zones fairly against each other.
 */
export interface SpotDayScore {
  slug: string
  name: string
  region: string
  type: 'mar' | 'interior'
  lat: number
  lon: number
  score: number
  windMax: number | null
  gustMax: number | null
  waveMax: number | null
  precipProb: number | null
  /** True for a COASTAL zone whose wave data is missing (model land cell / API
   * down). We must not treat that as a flat sea — the score is capped and the
   * UI flags it instead of implying calm. */
  waveUnknown: boolean
  /** Navigation safety for barco/kayak: 'ok', 'no' (over limits) or 'unknown'
   * (can't tell — wave data missing). Always 'ok' for tierra. */
  navegabilidad: 'ok' | 'no' | 'unknown'
}

export interface DayBoard {
  available: boolean
  dateISO: string
  days: string[]
  modality: ModalityProfile
  /** National solunar rating 1..5 (same activity component for every zone). */
  solunarRating: number
  /** False when the marine API returned nothing — sea state is unknown for
   * every coastal zone and the page warns instead of over-scoring. */
  marineAvailable: boolean
  spots: SpotDayScore[]
  fetchedAt: number
}

/** A coastal zone with unknown sea can never be scored "excellent" (≥70). */
const UNKNOWN_WAVE_CAP = 62

export const DAY_BOARD_REVALIDATE_S = 1800

interface DailyBlock {
  time: string[]
  wind_speed_10m_max?: (number | null)[]
  wind_gusts_10m_max?: (number | null)[]
  precipitation_probability_max?: (number | null)[]
  wave_height_max?: (number | null)[]
}

async function fetchBulk(url: string): Promise<{ daily?: DailyBlock }[] | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        next: { revalidate: DAY_BOARD_REVALIDATE_S },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) continue
      const data = (await res.json()) as { daily?: DailyBlock }[] | { daily?: DailyBlock }
      return Array.isArray(data) ? data : [data]
    } catch {
      /* retry */
    }
  }
  return null
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function slimScore(
  m: ModalityProfile,
  isMar: boolean,
  solunarRating: number,
  windMax: number | null,
  gustMax: number | null,
  waveMax: number | null,
  precipProb: number | null,
): { score: number; navegabilidad: 'ok' | 'no' | 'unknown' } {
  const waveUnknown = isMar && waveMax == null

  let cond = 95
  // Gentle gradient below the thresholds too, so calm zones don't all tie:
  // among "good" days, the calmest sea still ranks first.
  cond -= Math.min(4, (windMax ?? 0) * 0.16)
  if (isMar && waveMax != null) cond -= Math.min(3, waveMax * 1.5)
  if (windMax != null && windMax > m.windOk) {
    cond -= Math.min(45, ((windMax - m.windOk) / (m.windMax - m.windOk)) * 45)
    if (windMax > m.windMax) cond -= 15
  }
  if (gustMax != null && gustMax > m.gustMax) cond -= 12
  if (isMar && waveMax != null && waveMax > m.waveOk) {
    cond -= Math.min(35, ((waveMax - m.waveOk) / (m.waveMax - m.waveOk)) * 35)
    if (waveMax > m.waveMax) cond -= 12
  }
  if (precipProb != null && precipProb > 70) cond -= 5
  cond = clamp(cond, 3, 95)

  const activity = 30 + solunarRating * 12 // 1..5 → 42..90
  let score = Math.round(0.6 * cond + 0.4 * activity)

  // Navigation safety. On tierra it's always fine; otherwise a missing wave
  // reading means we CANNOT confirm it's safe, so 'unknown' (not 'ok').
  let navegabilidad: 'ok' | 'no' | 'unknown'
  if (m.id === 'tierra') {
    navegabilidad = 'ok'
  } else if (waveUnknown) {
    navegabilidad = 'unknown'
  } else {
    const overLimits = (windMax ?? 0) > m.navWind || (gustMax ?? 0) > m.navGust || (isMar && (waveMax ?? 0) > m.navWave)
    navegabilidad = overLimits ? 'no' : 'ok'
  }
  if (navegabilidad === 'no') score = Math.min(score, 25)

  // Unknown sea must never masquerade as calm: cap below "excellent" and, for
  // navigation modalities, keep it out of the "go" range entirely.
  if (waveUnknown) score = Math.min(score, m.id === 'tierra' ? UNKNOWN_WAVE_CAP : 45)

  return { score: clamp(score, 0, 100), navegabilidad }
}

/** Score every zone for one day. Data covers 7 days and is cached 30 min. */
export async function getDayBoard(dateISO?: string | null, modalityId?: string | null): Promise<DayBoard> {
  const today = todayMadridISO()
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(today, i))
  const date = dateISO && days.includes(dateISO) ? dateISO : today
  const modality = getModality(modalityId)

  const marSpots = FISHING_SPOTS.filter((s) => s.type === 'mar')

  const forecastChunks = await Promise.all(
    chunk(FISHING_SPOTS, 100).map((c) =>
      fetchBulk(
        `https://api.open-meteo.com/v1/forecast?latitude=${c.map((s) => s.lat.toFixed(3)).join(',')}&longitude=${c
          .map((s) => s.lon.toFixed(3))
          .join(',')}&daily=wind_speed_10m_max,wind_gusts_10m_max,precipitation_probability_max&forecast_days=7&timezone=Europe%2FMadrid&wind_speed_unit=kmh`,
      ),
    ),
  )
  const marineChunks = await Promise.all(
    chunk(marSpots, 100).map((c) =>
      fetchBulk(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${c.map((s) => s.lat.toFixed(3)).join(',')}&longitude=${c
          .map((s) => s.lon.toFixed(3))
          .join(',')}&daily=wave_height_max&forecast_days=7&timezone=Europe%2FMadrid`,
      ),
    ),
  )

  const empty: DayBoard = {
    available: false,
    dateISO: date,
    days,
    modality,
    solunarRating: 3,
    marineAvailable: false,
    spots: [],
    fetchedAt: Date.now(),
  }
  if (forecastChunks.some((c) => c === null)) return empty
  const forecastAll = forecastChunks.flatMap((c) => c!)
  const marineAvailable = marineChunks.every((c) => c !== null)
  const marineAll = marineAvailable ? marineChunks.flatMap((c) => c!) : null
  const marineBySlug = new Map<string, { daily?: DailyBlock }>()
  if (marineAll) marSpots.forEach((s, i) => marineBySlug.set(s.slug, marineAll[i]))

  // Solunar activity is national-scale for ranking purposes (phase + period
  // timing barely move across Spain in one day); each zone page computes its
  // own exact local solunar. Anchor it on a mid-coast point (Valencia), not
  // inland Madrid, so the reference is a place people actually fish.
  const solunarRating = solunarDay(39.45, -0.33, date).rating

  const at = (block: DailyBlock | undefined, key: keyof DailyBlock): number | null => {
    if (!block?.time) return null
    const idx = block.time.indexOf(date)
    if (idx < 0) return null
    const v = (block[key] as (number | null)[] | undefined)?.[idx]
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }

  const spots: SpotDayScore[] = FISHING_SPOTS.map((s, i) => {
    const daily = forecastAll[i]?.daily
    const windMax = at(daily, 'wind_speed_10m_max')
    const gustMax = at(daily, 'wind_gusts_10m_max')
    const precipProb = at(daily, 'precipitation_probability_max')
    const waveMax = s.type === 'mar' ? at(marineBySlug.get(s.slug)?.daily, 'wave_height_max') : null
    const waveUnknown = s.type === 'mar' && waveMax == null
    const { score, navegabilidad } = slimScore(modality, s.type === 'mar', solunarRating, windMax, gustMax, waveMax, precipProb)
    return { slug: s.slug, name: s.name, region: s.region, type: s.type, lat: s.lat, lon: s.lon, score, windMax, gustMax, waveMax, precipProb, waveUnknown, navegabilidad }
  })

  return { available: true, dateISO: date, days, modality, solunarRating, marineAvailable, spots, fetchedAt: Date.now() }
}
