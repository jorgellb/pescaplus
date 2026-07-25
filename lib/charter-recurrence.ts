/**
 * Recurring charter dates. A patrón who sails every Saturday shouldn't publish
 * the same trip forty times, so a listing can be created as a SERIES: one form,
 * many bookable dates.
 *
 * Each generated date is still a real Charter row — bookings, places and
 * payments all attach to a concrete day — tied together by a shared `seriesId`
 * so the whole run can be cancelled at once.
 *
 * All arithmetic is done in UTC on plain YYYY-MM-DD strings: `new Date(iso)`
 * parses as UTC midnight, so using getUTCDay() keeps a Sunday a Sunday no
 * matter the server's timezone or a DST switch mid-series.
 */

/** Weekday pickers, in Spanish week order (Monday first). */
export const WEEKDAYS: { id: number; short: string; label: string }[] = [
  { id: 1, short: 'L', label: 'Lunes' },
  { id: 2, short: 'M', label: 'Martes' },
  { id: 3, short: 'X', label: 'Miércoles' },
  { id: 4, short: 'J', label: 'Jueves' },
  { id: 5, short: 'V', label: 'Viernes' },
  { id: 6, short: 'S', label: 'Sábado' },
  { id: 0, short: 'D', label: 'Domingo' },
]

/** Hard ceiling on a single series, so one form submit can't create hundreds. */
export const MAX_SERIES_DATES = 60
/** How far ahead a series may run. */
export const MAX_SERIES_DAYS = 366

const DAY_MS = 24 * 60 * 60 * 1000
const ISO = /^\d{4}-\d{2}-\d{2}$/

function toUTC(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}
function fromUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export interface Repeat {
  /** JS weekday numbers (0 = Sunday). Empty = just the start date. */
  weekdays: number[]
  /** Last date of the series, inclusive. */
  untilISO: string
}

export interface ExpandResult {
  dates: string[]
  /** Set when the run was cut short, so the UI can say why. */
  truncated: boolean
  error?: string
}

/**
 * Every date from `startISO` to `untilISO` (inclusive) that falls on one of the
 * chosen weekdays. The start date is always included when it matches — or when
 * no weekday is chosen at all (a one-off).
 */
export function expandSeriesDates(startISO: string, repeat: Repeat | null | undefined): ExpandResult {
  if (!ISO.test(startISO)) return { dates: [], truncated: false, error: 'Fecha de inicio no válida.' }
  if (!repeat || !repeat.weekdays?.length) return { dates: [startISO], truncated: false }
  if (!ISO.test(repeat.untilISO)) return { dates: [], truncated: false, error: 'Indica hasta qué día se repite.' }

  const start = toUTC(startISO)
  const until = toUTC(repeat.untilISO)
  if (Number.isNaN(start) || Number.isNaN(until)) return { dates: [], truncated: false, error: 'Fechas no válidas.' }
  if (until < start) return { dates: [], truncated: false, error: 'La fecha final es anterior a la de inicio.' }

  const wanted = new Set(repeat.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))
  if (wanted.size === 0) return { dates: [startISO], truncated: false }

  // Cap the window as well as the count: both are cheap guards against a typo
  // like "hasta 2099" turning into a runaway loop.
  const lastAllowed = Math.min(until, start + MAX_SERIES_DAYS * DAY_MS)
  const dates: string[] = []
  let truncated = lastAllowed < until

  for (let t = start; t <= lastAllowed; t += DAY_MS) {
    if (wanted.has(new Date(t).getUTCDay())) {
      if (dates.length >= MAX_SERIES_DATES) { truncated = true; break }
      dates.push(fromUTC(t))
    }
  }

  if (dates.length === 0) {
    return { dates: [], truncated: false, error: 'Ningún día de la semana elegido cae en ese rango.' }
  }
  return { dates, truncated }
}

/** Human summary for the form ("Todos los sábados · 12 salidas"). */
export function describeSeries(repeat: Repeat | null | undefined, count: number): string {
  if (!repeat?.weekdays?.length || count <= 1) return 'Una sola salida'
  const names = WEEKDAYS.filter((w) => repeat.weekdays.includes(w.id)).map((w) => w.label.toLowerCase())
  const list = names.length === 1 ? `los ${names[0]}s`
    : `los ${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
  return `Todos ${list} · ${count} salidas`
}
