import { anotarRespuestaOpenMeteo, openMeteoEnPausa } from '@/lib/open-meteo-cupo'

/**
 * Multi-model agreement — the honest uncertainty layer. We ask Open-Meteo for
 * the same 7-day hourly wind from the three flagship global models (European
 * ECMWF, American GFS, German ICON) and measure how far apart they sit on each
 * day. When they agree the forecast deserves trust; when they diverge we say
 * so BEFORE the trip — and the public verification layer grades us after.
 */
export interface DayAgreement {
  dateISO: string
  /** Mean over the day's hours of (max − min) across the three models, km/h. */
  spreadKmh: number
  level: 'alta' | 'media' | 'baja'
}

export interface ModelAgreement {
  available: boolean
  days: DayAgreement[]
  fetchedAt: number
}

/**
 * Tres horas, igual que la previsión. Los modelos globales publican cada 6 h
 * (ECMWF, GFS) o cada 3 h (ICON): pedirlo cada hora devolvía casi siempre lo
 * mismo y gastaba cupo de Open-Meteo, que es uno solo para todo el servidor.
 */
export const AGREEMENT_REVALIDATE_S = 3 * 60 * 60

const MODELS = ['ecmwf_ifs025', 'gfs_seamless', 'icon_seamless'] as const

export function agreementLevel(spreadKmh: number): 'alta' | 'media' | 'baja' {
  if (spreadKmh < 5) return 'alta'
  if (spreadKmh < 10) return 'media'
  return 'baja'
}

export const AGREEMENT_LABEL: Record<'alta' | 'media' | 'baja', string> = {
  alta: 'los 3 modelos coinciden',
  media: 'los modelos difieren algo',
  baja: 'los modelos discrepan — revisa mañana',
}

export async function getModelAgreement(lat: number, lon: number): Promise<ModelAgreement> {
  const empty: ModelAgreement = { available: false, days: [], fetchedAt: Date.now() }
  try {
    // Por celda de ~11 km, como la previsión: la resolución de estos modelos es
    // aún más gruesa, y así los puntos vecinos comparten petición y caché.
    const celda = (n: number) => (Math.round(n * 10) / 10).toFixed(1)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${celda(lat)}&longitude=${celda(lon)}&hourly=wind_speed_10m&models=${MODELS.join(',')}&forecast_days=7&timezone=Europe%2FMadrid&wind_speed_unit=kmh`
    // Secondary enhancement: keep a tighter timeout so a slow multi-model
    // query can't hold the whole dashboard (it degrades to no chip gracefully).
    if (openMeteoEnPausa()) return empty
    const res = await fetch(url, { next: { revalidate: AGREEMENT_REVALIDATE_S }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) {
      await anotarRespuestaOpenMeteo(res)
      return empty
    }
    const data = (await res.json()) as {
      hourly?: { time?: string[] } & Record<string, (number | null)[] | string[] | undefined>
    }
    const time = data.hourly?.time
    if (!time) return empty
    const series = MODELS.map((m) => data.hourly?.[`wind_speed_10m_${m}`] as (number | null)[] | undefined)
    if (series.some((s) => !s)) return empty

    const byDay = new Map<string, number[]>()
    for (let i = 0; i < time.length; i++) {
      const vals = series.map((s) => s![i]).filter((v): v is number => typeof v === 'number')
      if (vals.length < 2) continue
      const spread = Math.max(...vals) - Math.min(...vals)
      const d = time[i].slice(0, 10)
      const list = byDay.get(d)
      if (list) list.push(spread)
      else byDay.set(d, [spread])
    }

    const days: DayAgreement[] = [...byDay.entries()]
      .filter(([, spreads]) => spreads.length >= 6)
      .map(([dateISO, spreads]) => {
        const mean = spreads.reduce((a, b) => a + b, 0) / spreads.length
        const spreadKmh = Math.round(mean * 10) / 10
        return { dateISO, spreadKmh, level: agreementLevel(spreadKmh) }
      })
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO))

    return { available: days.length > 0, days, fetchedAt: Date.now() }
  } catch {
    return empty
  }
}
