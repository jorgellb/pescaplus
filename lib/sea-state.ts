import type { HourPoint, FishingWindow, ModalityProfile } from '@/lib/marine-forecast'
import { fmtTime, fmtWindowRange } from '@/lib/solunar-format'
import { windWord } from '@/lib/forecast-format'

/** Douglas sea-state scale (the one used by Spanish marine bulletins). */
export function douglasState(waveM: number | null): { grade: number; name: string } | null {
  if (waveM == null) return null
  if (waveM < 0.1) return { grade: 0, name: 'Mar llana' }
  if (waveM < 0.5) return { grade: 1, name: 'Mar rizada' }
  if (waveM < 1.25) return { grade: 2, name: 'Marejadilla' }
  if (waveM < 2.5) return { grade: 3, name: 'Marejada' }
  if (waveM < 4) return { grade: 4, name: 'Fuerte marejada' }
  if (waveM < 6) return { grade: 5, name: 'Mar gruesa' }
  return { grade: 6, name: 'Mar muy gruesa' }
}

export interface SafetyAlert {
  level: 'aviso' | 'peligro'
  text: string
}

/** Safety review of the next hours for rock/shore anglers and small boats. */
export function safetyAlerts(hours: HourPoint[]): SafetyAlert[] {
  const next = hours.slice(0, 18)
  if (next.length === 0) return []
  const maxWave = Math.max(...next.map((h) => h.waveM ?? 0))
  const maxGust = Math.max(...next.map((h) => h.gustKmh ?? 0))
  const maxSwellPeriod = Math.max(...next.map((h) => h.swellPeriod ?? 0))
  const alerts: SafetyAlert[] = []

  if (maxWave >= 3 || maxGust >= 75) {
    alerts.push({ level: 'peligro', text: `Condiciones peligrosas próximas horas: olas de hasta ${maxWave.toFixed(1)} m y rachas de ${Math.round(maxGust)} km/h. Evita la roca expuesta y no salgas a navegar.` })
  } else if (maxWave >= 2 || maxGust >= 55 || (maxSwellPeriod >= 12 && maxWave >= 1.2)) {
    alerts.push({ level: 'aviso', text: `Precaución en roca y espigones: olas de hasta ${maxWave.toFixed(1)} m${maxSwellPeriod >= 12 ? ` con mar de fondo de ${Math.round(maxSwellPeriod)} s (olas sorpresivas)` : ''} y rachas de ${Math.round(maxGust)} km/h.` })
  }
  return alerts
}

export interface NavWindow {
  start: number
  end: number
}

/** Contiguous hours within this modality's safe-outing thresholds. */
export function navigationWindows(hours: HourPoint[], m: ModalityProfile): NavWindow[] {
  const ok = (h: HourPoint) =>
    (h.windKmh ?? 99) <= m.navWind && (h.gustKmh ?? 99) <= m.navGust && (h.waveM ?? 0) <= m.navWave
  const windows: NavWindow[] = []
  let i = 0
  while (i < hours.length) {
    if (ok(hours[i])) {
      let j = i
      while (j + 1 < hours.length && ok(hours[j + 1])) j++
      if (j - i + 1 >= 3) windows.push({ start: hours[i].time, end: hours[j].time + 3600000 })
      i = j + 1
    } else i++
  }
  return windows.slice(0, 2)
}

export interface OutAndBack {
  departure: number
  returnBy: number
  /** How conditions evolve towards the return leg. */
  returnNote: string | null
}

/**
 * Salida y regreso for boat/kayak: the usable outing inside the day's safest
 * window, with an explicit "return by" time — the return leg is where trouble
 * happens, so we flag deterioration towards the end.
 */
export function outAndBack(hours: HourPoint[], m: ModalityProfile): OutAndBack | null {
  const wins = navigationWindows(hours, m)
  if (wins.length === 0) return null
  const win = wins.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a))
  const inWin = hours.filter((h) => h.time >= win.start && h.time < win.end)
  if (inWin.length < 3) return null

  // Compare the first and last thirds of the window.
  const third = Math.max(1, Math.floor(inWin.length / 3))
  const head = inWin.slice(0, third)
  const tail = inWin.slice(-third)
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null)
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null
  }
  const windHead = avg(head.map((h) => h.windKmh))
  const windTail = avg(tail.map((h) => h.windKmh))
  const waveHead = avg(head.map((h) => h.waveM))
  const waveTail = avg(tail.map((h) => h.waveM))

  let returnNote: string | null = null
  if (windHead != null && windTail != null && windTail - windHead >= 8) {
    returnNote = `el viento sube a ~${Math.round(windTail)} km/h hacia el regreso`
  } else if (waveHead != null && waveTail != null && waveTail - waveHead >= 0.4) {
    returnNote = `la mar crece a ~${waveTail.toFixed(1)} m hacia el regreso`
  }

  // After the window closes, conditions exceed the thresholds — that IS the
  // reason to be back by then.
  const after = hours.find((h) => h.time >= win.end)
  if (!returnNote && after) {
    if ((after.windKmh ?? 0) > m.navWind) returnNote = `después el viento supera los ${m.navWind} km/h`
    else if ((after.waveM ?? 0) > m.navWave) returnNote = `después la mar supera ${m.navWave} m`
  }

  return { departure: win.start, returnBy: win.end, returnNote }
}

/** Deterministic plain-language verdict for a day. */
export function dayVerdict(opts: {
  hours: HourPoint[]
  window: FishingWindow | null
  tideNote?: string | null
}): string {
  const { hours, window: win, tideNote } = opts
  if (hours.length === 0) return ''
  const avg = Math.round(hours.reduce((s, h) => s + h.score, 0) / hours.length)
  const head = avg >= 60 ? 'Día muy prometedor' : avg >= 48 ? 'Día aprovechable' : 'Día flojo: elige bien la ventana'

  const midday = hours[Math.min(13, hours.length - 1)]
  const windBit = midday.windKmh != null ? `viento ${windWord(midday.windKmh).toLowerCase()}${midday.windDirLabel ? ` del ${midday.windDirLabel}` : ''}` : ''
  const sea = douglasState(midday.waveM)
  const seaBit = sea ? sea.name.toLowerCase() : ''
  const winBit = win ? `mejor ventana ${fmtWindowRange(win.start, win.end, hours[0].time).toLowerCase()}` : ''

  const parts = [winBit, windBit, seaBit, tideNote ?? ''].filter(Boolean)
  return `${head}: ${parts.join(', ')}.`
}

export interface GearTip {
  text: string
  href: string
  label: string
}

/** Conditions → gear advice, linking into the shop. */
export function gearForConditions(now: HourPoint | null): GearTip[] {
  if (!now) return []
  const tips: GearTip[] = []
  const wave = now.waveM ?? 0
  const wind = now.windKmh ?? 0

  if (wave >= 1.25 || wind >= 25) {
    tips.push({ text: 'Mar movido y viento: plomos pesados y bajos reforzados para mantener el fondo.', href: '/categories/plomos', label: 'Ver plomos' })
    tips.push({ text: 'Señuelos con vibración y colores llamativos para agua removida.', href: '/categories/senuelos', label: 'Ver señuelos' })
  } else if (wave < 0.5 && wind < 12) {
    tips.push({ text: 'Agua calmada y clara: baja el diámetro de línea y pesca fino (fluorocarbono).', href: '/categories/lineas', label: 'Ver líneas' })
    tips.push({ text: 'Señuelos naturales y presentaciones sutiles para peces desconfiados.', href: '/categories/senuelos', label: 'Ver señuelos' })
  } else {
    tips.push({ text: 'Condiciones intermedias: un equipo de spinning versátil cubre casi todo.', href: '/categories/canas', label: 'Ver cañas' })
  }

  if (!now.isDay) {
    tips.push({ text: 'De noche: señuelos oscuros o luminosos y frontal con luz roja.', href: '/categories/senuelos', label: 'Señuelos de noche' })
  }
  return tips.slice(0, 3)
}
