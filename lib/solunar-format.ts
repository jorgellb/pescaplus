const TZ = 'Europe/Madrid'

export const fmtTime = (ms: number | null): string =>
  ms == null
    ? '—'
    : new Intl.DateTimeFormat('es-ES', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms))

export const fmtDayLabel = (iso: string): string =>
  new Intl.DateTimeFormat('es-ES', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00`))

export const fmtDateLong = (iso: string): string =>
  new Intl.DateTimeFormat('es-ES', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${iso}T12:00:00`))

/** Today's date (YYYY-MM-DD) in Spanish local time. */
export const todayMadridISO = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())

export const addDaysISO = (iso: string, days: number): string => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export const ratingLabel = (r: number): string =>
  r >= 5 ? 'Excelente' : r === 4 ? 'Muy buena' : r === 3 ? 'Buena' : r === 2 ? 'Regular' : 'Floja'
