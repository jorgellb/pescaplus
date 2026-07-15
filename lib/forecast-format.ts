/** Shared colour scales + helpers for the angling forecast UI. */

export const INK = '#111111'
export const ACCENT = '#0f766e'
export const AMBER = '#c98a1a'
export const RED = '#b23b2e'
export const MUTED = '#c7c0b2'

/** Fishing score 0..100 → colour (poor → excellent). */
export function scoreHex(s: number): string {
  if (s >= 70) return ACCENT
  if (s >= 55) return '#3f9d94'
  if (s >= 40) return AMBER
  return '#9c9484'
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
  if (m < 1.5) return '#3f9d94'
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

/** WMO weather code → emoji. */
export function weatherEmoji(code: number | null, isDay = true): string {
  if (code == null) return ''
  if (code === 0) return isDay ? '☀️' : '🌙'
  if (code <= 2) return isDay ? '🌤️' : '☁️'
  if (code === 3) return '☁️'
  if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '🌨️'
  if (code <= 82) return '🌦️'
  if (code <= 86) return '🌨️'
  return '⛈️'
}
