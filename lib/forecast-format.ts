/** Shared colour scales + helpers for the angling forecast UI. */

/*
 * Estos colores se usan de fondo de insignias con texto blanco de 11 px
 * (puntuaciones) y como color de texto («Desfavorables»), así que todos dan
 * ≥ 4,5:1 con blanco. Medidos el 2026-11-19: el ámbar (#c98a1a, 2,94:1), el
 * verde medio (#3f9d94, 3,25:1) y el gris (#9c9484, 3,01:1) no llegaban.
 */
export const INK = '#06141b'
export const ACCENT = '#0b6f66'
export const AMBER = '#94600f'
export const RED = '#b23b2e'
export const MUTED = '#c7c0b2'
/** Verde medio de las escalas: «buena», entre la excelente y la regular. 5,24:1. */
export const TEAL_MID = '#287870'
/** Lo mejor de la escala, más oscuro que ACCENT para que se distinga de «buena». */
const EXCELENTE = '#075a52'

/** Fishing score 0..100 → colour (poor → excellent). */
export function scoreHex(s: number): string {
  if (s >= 70) return EXCELENTE
  if (s >= 55) return TEAL_MID
  if (s >= 40) return AMBER
  return '#746c5e'
}
export function scoreLabel(s: number): string {
  if (s >= 70) return 'Excelente'
  if (s >= 55) return 'Buena'
  if (s >= 40) return 'Regular'
  return 'Floja'
}

/** Wind speed (km/h) → colour (calm/ideal → strong). */
export function windHex(k: number | null): string {
  if (k == null) return MUTED
  if (k < 20) return ACCENT
  if (k < 35) return AMBER
  return RED
}

/** Wave height (m) → colour (flat → rough). */
export function waveHex(m: number | null): string {
  if (m == null) return MUTED
  if (m < 0.75) return ACCENT
  if (m < 1.5) return TEAL_MID
  if (m < 2.5) return AMBER
  return RED
}

/** Beaufort-ish descriptor for wind in km/h. */
export function windWord(k: number | null): string {
  if (k == null) return '—'
  if (k < 6) return 'Calma'
  if (k < 12) return 'Flojo'
  if (k < 20) return 'Suave'
  if (k < 30) return 'Moderado'
  if (k < 40) return 'Fresco'
  if (k < 50) return 'Fuerte'
  return 'Muy fuerte'
}

/** WMO weather code → icon name (matches a key in components/icons/Icon.tsx). */
export type WeatherIconName = 'sunny' | 'moon' | 'partlyCloudyDay' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'drizzle' | 'storm'

export function weatherIcon(code: number | null, isDay = true): WeatherIconName | null {
  if (code == null) return null
  if (code === 0) return isDay ? 'sunny' : 'moon'
  if (code <= 2) return isDay ? 'partlyCloudyDay' : 'cloudy'
  if (code === 3) return 'cloudy'
  if (code <= 48) return 'fog'
  if (code <= 67) return 'rain'
  if (code <= 77) return 'snow'
  if (code <= 82) return 'drizzle'
  if (code <= 86) return 'snow'
  return 'storm'
}
