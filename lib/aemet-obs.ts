/**
 * OBSERVED weather from AEMET's official station network — real measurements,
 * not model output. This is the "contraste" layer: next to every forecast we
 * show what the nearest station is actually measuring right now, and the daily
 * verification cron uses it to score our own forecasts in public.
 * Two-step OpenData API, hourly records for the last ~24 h per station.
 */
export interface AemetObservation {
  available: boolean
  stationName: string
  time: string | null // ISO, as reported (station local convention: UTC)
  windKmh: number | null
  gustKmh: number | null
  windDir: number | null
  tempC: number | null
  pressureHpa: number | null
  precipMm: number | null
}

const EMPTY: AemetObservation = {
  available: false,
  stationName: '',
  time: null,
  windKmh: null,
  gustKmh: null,
  windDir: null,
  tempC: null,
  pressureHpa: null,
  precipMm: null,
}

export const AEMET_OBS_REVALIDATE_S = 900

async function fetchJson(url: string, revalidate: number): Promise<unknown | null> {
  try {
    const res = await fetch(url, { next: { revalidate }, signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    for (const enc of ['utf-8', 'latin1'] as const) {
      try {
        return JSON.parse(new TextDecoder(enc, { fatal: enc === 'utf-8' }).decode(buf))
      } catch {
        /* next encoding */
      }
    }
    return null
  } catch {
    return null
  }
}

interface RawObs {
  fint?: string
  ubi?: string
  vv?: number
  vmax?: number
  dv?: number
  ta?: number
  pres_nmar?: number
  pres?: number
  prec?: number
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Latest hourly observation for a station (idema). Never throws. */
export async function getAemetObservation(idema: string): Promise<AemetObservation> {
  const key = process.env.AEMET_API_KEY
  if (!key) return EMPTY

  const envelope = (await fetchJson(
    `https://opendata.aemet.es/opendata/api/observacion/convencional/datos/estacion/${idema}?api_key=${key}`,
    AEMET_OBS_REVALIDATE_S,
  )) as { estado?: number; datos?: string } | null
  if (!envelope || envelope.estado !== 200 || !envelope.datos) return EMPTY

  const data = (await fetchJson(envelope.datos, AEMET_OBS_REVALIDATE_S)) as RawObs[] | null
  if (!Array.isArray(data) || data.length === 0) return EMPTY

  const latest = [...data].sort((a, b) => (a.fint ?? '').localeCompare(b.fint ?? '')).pop()!
  const vv = num(latest.vv)
  const vmax = num(latest.vmax)
  return {
    available: true,
    stationName: (latest.ubi ?? idema).replace(/\?/g, "'"),
    time: latest.fint ?? null,
    windKmh: vv != null ? Math.round(vv * 3.6) : null,
    gustKmh: vmax != null ? Math.round(vmax * 3.6) : null,
    windDir: num(latest.dv),
    tempC: num(latest.ta),
    pressureHpa: num(latest.pres_nmar) ?? num(latest.pres),
    precipMm: num(latest.prec),
  }
}

/**
 * Observation for a specific PAST hour (for the verification cron): the record
 * whose fint matches `hourIso` prefix (e.g. "2026-07-16T12"). Null if absent.
 */
export async function getAemetObservationAt(idema: string, hourIsoPrefix: string): Promise<AemetObservation | null> {
  const key = process.env.AEMET_API_KEY
  if (!key) return null
  const envelope = (await fetchJson(
    `https://opendata.aemet.es/opendata/api/observacion/convencional/datos/estacion/${idema}?api_key=${key}`,
    AEMET_OBS_REVALIDATE_S,
  )) as { estado?: number; datos?: string } | null
  if (!envelope || envelope.estado !== 200 || !envelope.datos) return null
  const data = (await fetchJson(envelope.datos, AEMET_OBS_REVALIDATE_S)) as RawObs[] | null
  const hit = data?.find((r) => (r.fint ?? '').startsWith(hourIsoPrefix))
  if (!hit) return null
  const vv = num(hit.vv)
  const vmax = num(hit.vmax)
  return {
    available: true,
    stationName: (hit.ubi ?? idema).replace(/\?/g, "'"),
    time: hit.fint ?? null,
    windKmh: vv != null ? Math.round(vv * 3.6) : null,
    gustKmh: vmax != null ? Math.round(vmax * 3.6) : null,
    windDir: num(hit.dv),
    tempC: num(hit.ta),
    pressureHpa: num(hit.pres_nmar) ?? num(hit.pres),
    precipMm: num(hit.prec),
  }
}
