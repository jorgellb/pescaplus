import type { SolunarDay } from '@/lib/solunar'
import type { HourPoint, FishingWindow } from '@/lib/marine-forecast'
import type { TideExtreme } from '@/lib/tides'
import { fmtTime } from '@/lib/solunar-format'

/**
 * Day timeline for the fishing plan: merges first/last light, sun, solunar
 * periods, tide extremes and the best window into one ordered schedule with
 * tactical notes. Deterministic — built only from computed data.
 */
export interface TimelineItem {
  time: number
  icon: string
  title: string
  note: string
  highlight: boolean
}

export function buildTimeline(opts: {
  sol: SolunarDay
  extremes: TideExtreme[]
  win: FishingWindow | null
  dayStart: number
}): TimelineItem[] {
  const { sol, extremes, win, dayStart } = opts
  const dayEnd = dayStart + 24 * 3600000
  const items: TimelineItem[] = []
  const inDay = (t: number | null): t is number => t != null && t >= dayStart && t < dayEnd

  if (inDay(sol.firstLight)) items.push({ time: sol.firstLight, icon: '🌄', title: 'Primera luz', note: 'Empieza la ventana clásica del alba: los depredadores cazan con poca luz.', highlight: false })
  if (inDay(sol.sunrise)) items.push({ time: sol.sunrise, icon: '🌅', title: 'Amanecer', note: 'Hora prime: pesca activa ya montado desde la primera luz.', highlight: false })
  for (const p of sol.periods) {
    if (p.start >= dayStart && p.start < dayEnd) {
      items.push({
        time: p.start,
        icon: p.kind === 'mayor' ? '🌕' : '🌗',
        title: p.kind === 'mayor' ? `Periodo solunar mayor (hasta ${fmtTime(p.end)})` : `Periodo solunar menor (hasta ${fmtTime(p.end)})`,
        note: p.kind === 'mayor' ? 'Máxima actividad teórica: insiste con tus mejores señuelos.' : 'Repunte de actividad: buen momento para cambiar de puesto o técnica.',
        highlight: p.kind === 'mayor',
      })
    }
  }
  for (const e of extremes) {
    if (e.time >= dayStart && e.time < dayEnd) {
      items.push({
        time: e.time,
        icon: '🌊',
        title: `${e.type === 'alta' ? 'Pleamar' : 'Bajamar'} (${e.height.toFixed(1)} m)`,
        note: e.type === 'alta' ? 'Trabaja las 2 h de subiente previas y la primera hora de vaciante.' : 'Con la baja, localiza canales y pozas; la subiente que arranca suele activar la comida.',
        highlight: false,
      })
    }
  }
  if (win) {
    items.push({ time: Math.max(win.start, dayStart), icon: '🎯', title: `Mejor ventana del día (${win.avg} pts)`, note: 'El tramo con más probabilidad: prioriza estar pescando aquí.', highlight: true })
  }
  if (inDay(sol.sunset)) items.push({ time: sol.sunset, icon: '🌇', title: 'Atardecer', note: 'Segunda hora prime del día; apura hasta la última luz.', highlight: false })
  if (inDay(sol.lastLight)) items.push({ time: sol.lastLight, icon: '🌒', title: 'Última luz', note: 'A partir de aquí, frontal y señuelos oscuros o luminosos.', highlight: false })

  return items.sort((a, b) => a.time - b.time)
}
