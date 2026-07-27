import { NextRequest, NextResponse } from 'next/server'
import { getForecastAt, bestWindow, windDirLabel, FORECAST_REVALIDATE_S } from '@/lib/marine-forecast'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { getTides, tideCoefficient, coefficientLabel, tideRisingAt, nextExtremes, TIDE_DATUM_NOTE } from '@/lib/tides'
import { lunarInfo } from '@/lib/solunar'

/**
 * ¿Qué mar hay en este punto, y cuándo conviene salir?
 *
 * Devuelve un resumen, no el parte entero: el panel de la carta enseña cuatro
 * cifras y una ventana. Mandar 168 horas de datos para pintar eso sería
 * malgastar la conexión de alguien que está en el muelle con cobertura mala.
 */
export async function GET(request: NextRequest) {
  const limit = rateLimit(`condiciones:${clientIp(request)}`, 300, 60 * 60_000)
  if (!limit.ok) {
    return NextResponse.json({ success: false, error: 'Demasiadas consultas.' }, { status: 429 })
  }
  const rawLat = request.nextUrl.searchParams.get('lat')
  const rawLon = request.nextUrl.searchParams.get('lon')
  const lat = Number(rawLat)
  const lon = Number(rawLon)
  if (rawLat === null || rawLon === null || !Number.isFinite(lat) || !Number.isFinite(lon)
      || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ success: false, error: 'Coordenadas no válidas.' }, { status: 400 })
  }

  /*
   * La marea va en paralelo con el parte: son dos servicios distintos y en serie
   * el panel tardaría el doble en aparecer.
   *
   * El COEFICIENTE se calcula aquí mismo desde la fase lunar, así que sale
   * siempre, haya o no clave de WorldTides. Es lo primero que mira quien pesca
   * —vivas o muertas decide la corriente, y con ella la actividad— y sería
   * absurdo esconderlo por no tener contratadas las alturas.
   */
  const [fc, tides] = await Promise.all([getForecastAt(lat, lon), getTides(lat, lon)])
  const hoy = new Date().toISOString().slice(0, 10)
  const luna = lunarInfo(hoy)
  const coef = tideCoefficient(luna.phase)
  if (!fc.available || fc.hours.length === 0) {
    return NextResponse.json({ success: true, available: false })
  }

  // La hora en curso; si el parte va por detrás, la primera que quede por venir.
  const now = fc.hours.find((h) => h.isNow) ?? fc.hours.find((h) => h.time >= Date.now()) ?? fc.hours[0]
  // La ventana se busca en las próximas 48 h: más allá, el modelo ya no manda
  // lo bastante como para que nadie planifique una salida con ella.
  const proximas = fc.hours.filter((h) => h.time >= Date.now() && h.time <= Date.now() + 48 * 3600_000)
  const ventana = proximas.length > 0 ? bestWindow(proximas) : null

  return NextResponse.json(
    {
      success: true,
      available: true,
      hasMarine: fc.hasMarine,
      ahora: {
        windKmh: now.windKmh,
        gustKmh: now.gustKmh,
        windDir: now.windDir,
        windDirLabel: now.windDirLabel ?? (now.windDir != null ? windDirLabel(now.windDir) : null),
        waveM: now.waveM,
        wavePeriod: now.wavePeriod,
        swellM: now.swellM,
        swellDir: now.swellDir,
        seaTempC: now.seaTempC,
        score: now.score,
        activity: now.activity,
      },
      ventana,
      marea: {
        // Siempre presente: no depende de ningún servicio externo.
        coeficiente: coef,
        coeficienteTexto: coefficientLabel(coef),
        lunaFase: luna.name,
        // Lo demás solo si hay alturas de verdad. Nunca se inventan.
        disponible: tides.available,
        // En el Mediterráneo el rango es de centímetros: decirlo evita que
        // alguien planifique una salida alrededor de una marea que no existe.
        rangoPequeno: tides.smallRange,
        estacion: tides.station,
        subiendo: tides.available ? tideRisingAt(tides.all, Date.now()) : null,
        proximas: tides.available
          ? nextExtremes(tides.all, Date.now(), 2).map((e) => ({ t: e.time, altura: e.height, tipo: e.type }))
          : [],
        nota: tides.available ? TIDE_DATUM_NOTE : null,
      },
      gridKm: fc.meta.marineGridKm ?? fc.meta.gridKm,
    },
    { headers: { 'Cache-Control': `public, max-age=300, s-maxage=${FORECAST_REVALIDATE_S}` } },
  )
}
