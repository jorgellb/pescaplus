import type { FishingSpot } from '@/lib/fishing-spots'

/**
 * Fishing-oriented weather from Open-Meteo (free, no API key). Fetched
 * server-side (the browser CSP blocks external calls) and cached via ISR.
 * Never throws — returns nulls when the service is unreachable.
 */
export interface FishingWeather {
  tempC: number | null
  pressureHpa: number | null
  pressureTrend: 'subiendo' | 'estable' | 'bajando' | null
  windKmh: number | null
  windDir: string | null
  waveM: number | null
  seaTempC: number | null
  activity: { score: number; label: string; reason: string }
  available: boolean
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO']
const windDir = (deg: number) => COMPASS[Math.round(deg / 22.5) % 16]

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(9000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function rateActivity(
  pressureTrend: FishingWeather['pressureTrend'],
  windKmh: number | null,
): FishingWeather['activity'] {
  let score = 3
  let reason = 'Condiciones normales.'

  if (pressureTrend === 'bajando') {
    score += 1
    reason = 'Presión en descenso: los peces suelen alimentarse más.'
  } else if (pressureTrend === 'subiendo') {
    score -= 1
    reason = 'Presión al alza tras un cambio: la actividad puede bajar.'
  } else if (pressureTrend === 'estable') {
    reason = 'Presión estable: actividad predecible.'
  }

  if (windKmh != null) {
    if (windKmh >= 8 && windKmh <= 28) {
      score += 1
      reason += ' Viento suave que riza el agua, favorable.'
    } else if (windKmh > 40) {
      score -= 1
      reason += ' Viento fuerte: dificulta la pesca.'
    } else if (windKmh < 4) {
      reason += ' Agua muy plana; prueba a primera y última hora.'
    }
  }

  score = Math.max(1, Math.min(5, score))
  const label = score >= 4 ? 'Buena' : score === 3 ? 'Moderada' : 'Floja'
  return { score, label, reason }
}

export async function getFishingWeather(spot: FishingSpot): Promise<FishingWeather> {
  const forecast = await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${spot.lat}&longitude=${spot.lon}` +
      `&current=temperature_2m,surface_pressure,wind_speed_10m,wind_direction_10m` +
      `&hourly=surface_pressure&past_hours=3&forecast_hours=1&timezone=Europe%2FMadrid`,
  )

  const empty: FishingWeather = {
    tempC: null,
    pressureHpa: null,
    pressureTrend: null,
    windKmh: null,
    windDir: null,
    waveM: null,
    seaTempC: null,
    activity: { score: 3, label: 'Moderada', reason: 'Datos meteorológicos no disponibles ahora mismo.' },
    available: false,
  }
  if (!forecast?.current) return empty

  const cur = forecast.current
  const press: number[] = forecast.hourly?.surface_pressure ?? []
  let trend: FishingWeather['pressureTrend'] = null
  if (press.length >= 2) {
    const first = press[0]
    const last = press[press.length - 1]
    const diff = last - first
    trend = diff > 0.8 ? 'subiendo' : diff < -0.8 ? 'bajando' : 'estable'
  }

  const windKmh = typeof cur.wind_speed_10m === 'number' ? Math.round(cur.wind_speed_10m) : null

  let waveM: number | null = null
  let seaTempC: number | null = null
  if (spot.type === 'mar') {
    const marine = await getJson(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${spot.lat}&longitude=${spot.lon}` +
        `&current=wave_height,sea_surface_temperature&timezone=Europe%2FMadrid`,
    )
    if (marine?.current) {
      waveM = typeof marine.current.wave_height === 'number' ? marine.current.wave_height : null
      seaTempC = typeof marine.current.sea_surface_temperature === 'number' ? marine.current.sea_surface_temperature : null
    }
  }

  return {
    tempC: typeof cur.temperature_2m === 'number' ? Math.round(cur.temperature_2m) : null,
    pressureHpa: typeof cur.surface_pressure === 'number' ? Math.round(cur.surface_pressure) : null,
    pressureTrend: trend,
    windKmh,
    windDir: typeof cur.wind_direction_10m === 'number' ? windDir(cur.wind_direction_10m) : null,
    waveM,
    seaTempC: seaTempC != null ? Math.round(seaTempC) : null,
    activity: rateActivity(trend, windKmh),
    available: true,
  }
}
