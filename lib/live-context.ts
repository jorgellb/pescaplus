import { FISHING_SPOTS, type FishingSpot } from '@/lib/fishing-spots'
import { getMarineForecast, bestWindow, groupByDay } from '@/lib/marine-forecast'
import { getTides, nextExtremes } from '@/lib/tides'
import { rankSpeciesToday } from '@/lib/what-to-fish'
import { solunarDay } from '@/lib/solunar'
import { douglasState } from '@/lib/sea-state'
import { windWord } from '@/lib/forecast-format'
import { fmtTime, fmtWindowRange, fmtDayLabel, todayMadridISO, addDaysISO } from '@/lib/solunar-format'

/**
 * Live-data context for the AI advisor: when the user's message mentions one of
 * our zones (and optionally a day), fetch the REAL forecast and hand the model
 * a compact fact sheet it must not deviate from. This is what turns the chat
 * from "generic fishing tips" into an advisor that knows today's sea.
 */

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

function detectSpots(text: string): FishingSpot[] {
  const t = ` ${normalize(text)} `
  const found: FishingSpot[] = []
  for (const s of FISHING_SPOTS) {
    const name = normalize(s.name).replace(/\(.*\)/g, '').trim()
    if (name.length < 4) continue
    if (new RegExp(`(^|[^a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(t)) {
      found.push(s)
      if (found.length >= 2) break
    }
  }
  return found
}

/** Which of the next 7 days the user is asking about (ISO dates). */
function detectDays(text: string): string[] {
  const t = normalize(text)
  const today = todayMadridISO()
  const days: string[] = []
  const push = (offset: number) => {
    const d = addDaysISO(today, offset)
    if (!days.includes(d) && offset >= 0 && offset < 7) days.push(d)
  }
  if (/\bhoy\b/.test(t)) push(0)
  if (/(?<!\bla\s)(?<!\bde\s)(?<!\bpor la\s)\bmanana\b/.test(t)) push(1) // 'mañana' el día, no 'por la mañana'
  if (/pasado manana/.test(t)) push(2)
  const todayDow = new Date(`${today}T12:00:00Z`).getUTCDay()
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(t)) {
      push((i - todayDow + 7) % 7) // next occurrence (today counts as today)
    }
  }
  if (/\b(finde|fin de semana)\b/.test(t)) {
    push((6 - todayDow + 7) % 7) // sábado
    push((0 - todayDow + 7) % 7) // domingo
  }
  return days.slice(0, 3)
}

async function spotSummary(s: FishingSpot, days: string[]): Promise<string> {
  const [forecast, tides] = await Promise.all([
    getMarineForecast(s, null, 'tierra'),
    s.type === 'mar' ? getTides(s.lat, s.lon) : Promise.resolve(null),
  ])
  if (!forecast.available) return `${s.name}: previsión no disponible ahora mismo.`

  const byDay = groupByDay(forecast.hours)
  const nowHour = forecast.hours.find((h) => h.isNow) ?? forecast.hours[0]
  const targetDays = (days.length ? days : [byDay[0]?.dateISO, byDay[1]?.dateISO].filter(Boolean)) as string[]

  const lines: string[] = []
  const sea = douglasState(nowHour.waveM)
  lines.push(
    `AHORA (${nowHour.hourLabel}): viento ${nowHour.windKmh ?? '?'} km/h ${nowHour.windDirLabel ?? ''} (${windWord(nowHour.windKmh).toLowerCase()})` +
      (sea ? `, ${sea.name.toLowerCase()}${nowHour.waveM != null ? ` ${nowHour.waveM.toFixed(1)} m` : ''}` : '') +
      (nowHour.seaTempC != null ? `, agua ${Math.round(nowHour.seaTempC)}°C` : ''),
  )

  for (const d of targetDays) {
    const g = byDay.find((x) => x.dateISO === d)
    if (!g) continue
    const win = bestWindow(g.hours)
    const sol = solunarDay(s.lat, s.lon, d)
    const label = d === todayMadridISO() ? 'HOY' : fmtDayLabel(d)
    lines.push(
      `${label}: mejor ventana ${win ? `${fmtWindowRange(win.start, win.end, g.hours[0].time)} (${win.avg}/100)` : 'sin datos'}` +
        `, solunar ${sol.rating}/5` +
        (sol.periods.filter((p) => p.kind === 'mayor').length ? `, periodos mayores ${sol.periods.filter((p) => p.kind === 'mayor').map((p) => fmtTime(p.start)).join(' y ')}` : ''),
    )
  }

  if (tides?.available) {
    const upcoming = nextExtremes(tides.all, Date.now(), 2)
    if (upcoming.length) {
      lines.push(`Mareas próximas: ${upcoming.map((e) => `${e.type === 'alta' ? 'pleamar' : 'bajamar'} ${fmtTime(e.time)} (${e.height.toFixed(1)} m)`).join(', ')}`)
    }
  }

  if (s.type === 'mar' && nowHour) {
    const picks = rankSpeciesToday({
      month: Number(todayMadridISO().slice(5, 7)),
      seaTempC: nowHour.seaTempC,
      waveM: nowHour.waveM,
      solunarRating: 3,
    }).slice(0, 2)
    lines.push(`Especies recomendadas: ${picks.map((p) => p.species.name).join(' y ')}`)
  }

  lines.push(`Página con todo el detalle: /mejores-horas/${s.slug}`)
  return `${s.name} (${s.region}):\n${lines.map((l) => `  - ${l}`).join('\n')}`
}

/**
 * Build the live-data system context for a user message, or null when no zone
 * is mentioned. Never throws.
 */
export async function buildLiveContext(message: string): Promise<string | null> {
  try {
    const spots = detectSpots(message)
    if (spots.length === 0) return null
    const days = detectDays(message)
    const summaries = await Promise.all(spots.map((s) => spotSummary(s, days)))
    return `DATOS EN VIVO DE PESCAPLUS (previsión real, calculada ahora):\n${summaries.join('\n')}\n\nINSTRUCCIONES SOBRE ESTOS DATOS: usa EXCLUSIVAMENTE estas cifras para horarios, viento, mar y mareas de esas zonas (no inventes otras). Menciona la mejor ventana y por qué. Incluye el enlace [previsión completa](/mejores-horas/...) de la zona. Si preguntan por una zona o día que no está aquí, di que pueden consultarlo en [Mejores horas](/mejores-horas).`
  } catch {
    return null
  }
}
