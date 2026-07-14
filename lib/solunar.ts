/**
 * Self-contained astronomy + solunar engine (no external API).
 *
 * Computes sunrise/sunset, moonrise/moonset, moon transits, moon phase and the
 * classic "solunar" major/minor feeding periods anglers use to pick the best
 * hours. Positions use truncated Meeus series (accurate to a few minutes for
 * rise/set — plenty for fishing), and rise/set/transit are found by scanning
 * altitude minute-by-minute over the local day.
 */

const RAD = Math.PI / 180
const DEG = 180 / Math.PI
const sin = (d: number) => Math.sin(d * RAD)
const cos = (d: number) => Math.cos(d * RAD)
const tan = (d: number) => Math.tan(d * RAD)
const asin = (x: number) => Math.asin(Math.max(-1, Math.min(1, x))) * DEG
const atan2 = (y: number, x: number) => Math.atan2(y, x) * DEG
const norm360 = (d: number) => ((d % 360) + 360) % 360

function julianDay(ms: number): number {
  return ms / 86400000 + 2440587.5
}

function sunEquatorial(jd: number): { ra: number; dec: number; lon: number } {
  const T = (jd - 2451545) / 36525
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T)
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T)
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
    (0.019993 - 0.000101 * T) * sin(2 * M) +
    0.000289 * sin(3 * M)
  const trueLon = L0 + C
  const omega = 125.04 - 1934.136 * T
  const lambda = trueLon - 0.00569 - 0.00478 * sin(omega)
  const eps = 23.439291 - 0.0130042 * T + 0.00256 * cos(omega)
  const ra = norm360(atan2(cos(eps) * sin(lambda), cos(lambda)))
  const dec = asin(sin(eps) * sin(lambda))
  return { ra, dec, lon: norm360(lambda) }
}

function moonEquatorial(jd: number): { ra: number; dec: number; lon: number } {
  const T = (jd - 2451545) / 36525
  const Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T)
  const D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T)
  const M = norm360(357.5291092 + 35999.0502909 * T)
  const Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T)
  const F = norm360(93.272095 + 483202.0175233 * T - 0.0036539 * T * T)

  const lon =
    Lp +
    6.288774 * sin(Mp) +
    1.274027 * sin(2 * D - Mp) +
    0.658314 * sin(2 * D) +
    0.213618 * sin(2 * Mp) -
    0.185116 * sin(M) -
    0.114332 * sin(2 * F) +
    0.058793 * sin(2 * D - 2 * Mp) +
    0.057066 * sin(2 * D - M - Mp) +
    0.053322 * sin(2 * D + Mp) +
    0.045758 * sin(2 * D - M) -
    0.040923 * sin(M - Mp) -
    0.03472 * sin(D) -
    0.030383 * sin(M + Mp) +
    0.015327 * sin(2 * D - 2 * F) -
    0.012528 * sin(Mp + 2 * F) +
    0.01098 * sin(Mp - 2 * F)

  const lat =
    5.128122 * sin(F) +
    0.280602 * sin(Mp + F) +
    0.277693 * sin(Mp - F) +
    0.173237 * sin(2 * D - F) +
    0.055413 * sin(2 * D - Mp + F) +
    0.046271 * sin(2 * D - Mp - F) +
    0.032573 * sin(2 * D + F) +
    0.017198 * sin(2 * Mp + F)

  const eps = 23.439291 - 0.0130042 * T
  const l = norm360(lon)
  const ra = norm360(atan2(sin(l) * cos(eps) - tan(lat) * sin(eps), cos(l)))
  const dec = asin(sin(lat) * cos(eps) + cos(lat) * sin(eps) * sin(l))
  return { ra, dec, lon: l }
}

function gmst(jd: number): number {
  return norm360(280.46061837 + 360.98564736629 * (jd - 2451545))
}

/** Altitude of a body (degrees) for an observer at lat/lonEast. */
function altitude(jd: number, lat: number, lonEast: number, ra: number, dec: number): number {
  const lst = norm360(gmst(jd) + lonEast)
  const H = lst - ra
  return asin(sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(H))
}

// Timezone helpers (work in UTC instants; format for display separately).
function offsetMinutes(utcMs: number, tz: string): number {
  const d = new Date(utcMs)
  const utc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()
  const local = new Date(d.toLocaleString('en-US', { timeZone: tz })).getTime()
  return Math.round((local - utc) / 60000)
}
function localMidnightUtc(y: number, m: number, d: number, tz: string): number {
  let ms = Date.UTC(y, m - 1, d)
  ms -= offsetMinutes(ms, tz) * 60000
  return ms
}

export interface SolunarPeriod {
  kind: 'mayor' | 'menor'
  start: number // UTC ms
  end: number
}

export interface SolunarDay {
  date: string
  sunrise: number | null
  sunset: number | null
  moonrise: number | null
  moonset: number | null
  moonUpper: number | null // overhead transit
  moonLower: number | null // underfoot transit
  moonPhase: number // 0..1 (0 = new, 0.5 = full)
  moonIllumination: number // 0..1
  moonPhaseName: string
  periods: SolunarPeriod[]
  rating: number // 1..5 fishing-activity rating for the day
}

const SUN_H0 = -0.833
const MOON_H0 = 0.125

function phaseName(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return 'Luna nueva'
  if (phase < 0.22) return 'Creciente iluminante'
  if (phase < 0.28) return 'Cuarto creciente'
  if (phase < 0.47) return 'Gibosa creciente'
  if (phase < 0.53) return 'Luna llena'
  if (phase < 0.72) return 'Gibosa menguante'
  if (phase < 0.78) return 'Cuarto menguante'
  return 'Creciente menguante'
}

/**
 * Compute the solunar data for one calendar day at a location.
 * @param lat latitude (deg, north positive)
 * @param lon longitude (deg, EAST positive; Spain is negative)
 * @param dateISO YYYY-MM-DD
 * @param tz IANA timezone (default Europe/Madrid)
 */
export function solunarDay(lat: number, lon: number, dateISO: string, tz = 'Europe/Madrid'): SolunarDay {
  const [y, m, d] = dateISO.split('-').map(Number)
  const start = localMidnightUtc(y, m, d, tz)
  const stepMs = 60000 // 1 minute

  let sunrise: number | null = null
  let sunset: number | null = null
  let moonrise: number | null = null
  let moonset: number | null = null
  let moonUpper: number | null = null
  let moonLower: number | null = null
  let maxMoonAlt = -Infinity
  let minMoonAlt = Infinity

  let prevSun = altitude(julianDay(start - stepMs), lat, lon, ...eq(sunEquatorial, start - stepMs))
  let prevMoon = altitude(julianDay(start - stepMs), lat, lon, ...eq(moonEquatorial, start - stepMs))

  for (let i = 0; i <= 24 * 60; i++) {
    const t = start + i * stepMs
    const jd = julianDay(t)
    const s = sunEquatorial(jd)
    const mo = moonEquatorial(jd)
    const sunAlt = altitude(jd, lat, lon, s.ra, s.dec)
    const moonAlt = altitude(jd, lat, lon, mo.ra, mo.dec)

    if (sunrise === null && prevSun < SUN_H0 && sunAlt >= SUN_H0) sunrise = t
    if (sunset === null && prevSun >= SUN_H0 && sunAlt < SUN_H0) sunset = t
    if (moonrise === null && prevMoon < MOON_H0 && moonAlt >= MOON_H0) moonrise = t
    if (moonset === null && prevMoon >= MOON_H0 && moonAlt < MOON_H0) moonset = t
    if (moonAlt > maxMoonAlt) {
      maxMoonAlt = moonAlt
      moonUpper = t
    }
    if (moonAlt < minMoonAlt) {
      minMoonAlt = moonAlt
      moonLower = t
    }
    prevSun = sunAlt
    prevMoon = moonAlt
  }

  // Moon phase from sun/moon ecliptic elongation at local noon.
  const noonJd = julianDay(start + 12 * 3600000)
  const elong = norm360(moonEquatorial(noonJd).lon - sunEquatorial(noonJd).lon)
  const phase = elong / 360
  const illumination = (1 - cos(elong)) / 2

  const periods: SolunarPeriod[] = []
  const major = (center: number | null) =>
    center !== null && periods.push({ kind: 'mayor', start: center - 60 * 60000, end: center + 60 * 60000 })
  const minor = (center: number | null) =>
    center !== null && periods.push({ kind: 'menor', start: center - 45 * 60000, end: center + 45 * 60000 })
  major(moonUpper)
  major(moonLower)
  minor(moonrise)
  minor(moonset)
  periods.sort((a, b) => a.start - b.start)

  // Day rating: strongest near new/full moon, boosted when a solunar period
  // overlaps dawn or dusk (the classic prime windows).
  const nearNewFull = Math.max(0, 1 - Math.abs(((phase % 0.5) - 0.25) / 0.25)) // 1 at new/full, 0 at quarters
  let rating = 2 + nearNewFull * 1.5
  const twilights = [sunrise, sunset].filter((x): x is number => x !== null)
  for (const p of periods) {
    for (const tw of twilights) {
      if (tw >= p.start && tw <= p.end) rating += 0.5
    }
  }
  rating = Math.max(1, Math.min(5, Math.round(rating)))

  return {
    date: dateISO,
    sunrise,
    sunset,
    moonrise,
    moonset,
    moonUpper,
    moonLower,
    moonPhase: phase,
    moonIllumination: illumination,
    moonPhaseName: phaseName(phase),
    periods,
    rating,
  }
}

// Small helper so we can seed prev-altitude before the loop.
function eq(fn: (jd: number) => { ra: number; dec: number }, ms: number): [number, number] {
  const { ra, dec } = fn(julianDay(ms))
  return [ra, dec]
}
