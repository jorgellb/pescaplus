import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

/*
 * El cupo gratuito de Open-Meteo es por IP: todo el servidor comparte uno. En
 * producción se vieron respuestas 429 (cupo agotado). Estas pruebas protegen
 * tres cosas que lo gastaban de más o dejaban la web en blanco:
 *
 *  - El ranking de zonas reintentaba al instante ante un 429, triplicando las
 *    peticiones justo cuando ya no quedaba cupo.
 *  - Si Open-Meteo cortaba, el ranking se quedaba vacío aunque tuviera un dato
 *    bueno de hace un rato.
 *  - La comparativa de modelos pedía cada punto exacto; la previsión ya agrupa
 *    por celda de ~11 km, que es la resolución real del modelo.
 */

const dias = (n = 7) => {
  const hoy = new Date()
  return Array.from({ length: n }, (_, i) => new Date(hoy.getTime() + i * 86_400_000).toISOString().slice(0, 10))
}

/** Respuesta de Open-Meteo con tantas ubicaciones como pida la URL. */
function respuestaBuena(url: string) {
  const n = new URL(url).searchParams.get('latitude')!.split(',').length
  const time = dias()
  const bloque = url.includes('marine-api')
    ? { daily: { time, wave_height_max: time.map(() => 0.6) } }
    : {
        daily: {
          time,
          wind_speed_10m_max: time.map(() => 12),
          wind_gusts_10m_max: time.map(() => 20),
          precipitation_probability_max: time.map(() => 5),
        },
      }
  return Response.json(n === 1 ? bloque : Array.from({ length: n }, () => bloque))
}

const cupoAgotado = () => new Response('{"error":true,"reason":"Daily API request limit exceeded"}', { status: 429 })

async function cargarTablero() {
  vi.resetModules()
  return import('@/lib/day-scores')
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('getDayBoard y el cupo de Open-Meteo', () => {
  it('ante un 429 no reintenta: una sola petición por bloque', async () => {
    const fetchFalso = vi.fn(async (_url: string | URL | Request) => cupoAgotado())
    vi.stubGlobal('fetch', fetchFalso)
    const { getDayBoard } = await cargarTablero()

    const tablero = await getDayBoard()
    const urls = fetchFalso.mock.calls.map(([u]) => String(u))
    expect(new Set(urls).size).toBe(urls.length)
    expect(tablero.available).toBe(false)
  })

  it('ante un fallo pasajero reintenta una vez, no dos', async () => {
    const fetchFalso = vi.fn(async (_url: string | URL | Request) => new Response('caído', { status: 503 }))
    vi.stubGlobal('fetch', fetchFalso)
    const { getDayBoard } = await cargarTablero()

    await getDayBoard()
    const veces = new Map<string, number>()
    for (const [u] of fetchFalso.mock.calls) veces.set(String(u), (veces.get(String(u)) ?? 0) + 1)
    expect(Math.max(...veces.values())).toBe(2)
  })

  it('si Open-Meteo corta, enseña el último dato bueno y su hora real', async () => {
    let cortado = false
    vi.stubGlobal('fetch', vi.fn(async (u: string) => (cortado ? cupoAgotado() : respuestaBuena(String(u)))))
    const { getDayBoard } = await cargarTablero()

    const bueno = await getDayBoard()
    expect(bueno.available).toBe(true)

    cortado = true
    vi.spyOn(Date, 'now').mockReturnValue(bueno.fetchedAt + 2 * 3_600_000)
    const respaldo = await getDayBoard()
    expect(respaldo.available).toBe(true)
    expect(respaldo.spots.length).toBe(bueno.spots.length)
    // No finge ser de ahora: lleva la hora del dato que enseña.
    expect(respaldo.fetchedAt).toBe(bueno.fetchedAt)
  })

  it('un dato de más de 12 horas ya no se enseña', async () => {
    let cortado = false
    vi.stubGlobal('fetch', vi.fn(async (u: string) => (cortado ? cupoAgotado() : respuestaBuena(String(u)))))
    const { getDayBoard } = await cargarTablero()

    const bueno = await getDayBoard()
    cortado = true
    vi.spyOn(Date, 'now').mockReturnValue(bueno.fetchedAt + 13 * 3_600_000)
    expect((await getDayBoard()).available).toBe(false)
  })
})

describe('getModelAgreement', () => {
  it('dos puntos de la misma celda comparten la misma petición (y la misma caché)', async () => {
    // 503 y no 429: un 429 pausaría Open-Meteo y el segundo punto ni llamaría.
    const fetchFalso = vi.fn(async (_url: string | URL | Request) => new Response('caído', { status: 503 }))
    vi.stubGlobal('fetch', fetchFalso)
    vi.resetModules()
    const { getModelAgreement, AGREEMENT_REVALIDATE_S } = await import('@/lib/model-agreement')

    // Chipiona y Rota: a unos 12 km, en la misma celda de 0,1°.
    await getModelAgreement(36.7369, -6.4372)
    await getModelAgreement(36.7151, -6.3869)
    const [a, b] = fetchFalso.mock.calls.map(([u]) => String(u))
    expect(a).toBe(b)
    expect(a).toContain('latitude=36.7&longitude=-6.4')
    // Los modelos se actualizan cada pocas horas: pedirlo cada hora es tirar cupo.
    expect(AGREEMENT_REVALIDATE_S).toBeGreaterThanOrEqual(3 * 3600)
  })
})

describe('pausa compartida tras un 429', () => {
  it('después de un 429 nadie vuelve a llamar a Open-Meteo hasta que pasa la pausa', async () => {
    vi.resetModules()
    const { anotarRespuestaOpenMeteo, openMeteoEnPausa } = await import('@/lib/open-meteo-cupo')
    const t0 = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(t0)

    expect(openMeteoEnPausa()).toBe(false)
    await anotarRespuestaOpenMeteo(new Response('{"reason":"Minutely API request limit exceeded. Please try again in one minute."}', { status: 429 }))
    expect(openMeteoEnPausa()).toBe(true)
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 61_000)
    expect(openMeteoEnPausa()).toBe(false)
  })

  it('el cupo diario agotado pausa bastante más que el de un minuto', async () => {
    vi.resetModules()
    const { anotarRespuestaOpenMeteo, openMeteoEnPausa } = await import('@/lib/open-meteo-cupo')
    const t0 = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(t0)
    await anotarRespuestaOpenMeteo(cupoAgotado())
    vi.spyOn(Date, 'now').mockReturnValue(t0 + 10 * 60_000)
    expect(openMeteoEnPausa()).toBe(true)
  })

  it('una respuesta buena o un error que no es de cupo no pausa nada', async () => {
    vi.resetModules()
    const { anotarRespuestaOpenMeteo, openMeteoEnPausa } = await import('@/lib/open-meteo-cupo')
    await anotarRespuestaOpenMeteo(new Response('{}', { status: 200 }))
    await anotarRespuestaOpenMeteo(new Response('caído', { status: 503 }))
    expect(openMeteoEnPausa()).toBe(false)
  })

  it('el ranking en pausa no llama a Open-Meteo', async () => {
    const fetchFalso = vi.fn(async (_url: string | URL | Request) => cupoAgotado())
    vi.stubGlobal('fetch', fetchFalso)
    const { getDayBoard } = await cargarTablero()
    await getDayBoard()
    const antes = fetchFalso.mock.calls.length
    await getDayBoard()
    expect(fetchFalso.mock.calls.length).toBe(antes)
  })
})

describe('getMarineForecast no guarda un parte vacío', () => {
  it('si Open-Meteo falla, el siguiente intento vuelve a pedir y enseña la previsión', async () => {
    // Una caché como la de Next: guarda lo que se resuelve y no lo que lanza.
    vi.doMock('next/cache', () => {
      const guardado = new Map<string, unknown>()
      return {
        revalidatePath: vi.fn(),
        unstable_cache:
          (fn: (...a: unknown[]) => Promise<unknown>) =>
          async (...a: unknown[]) => {
            const clave = JSON.stringify(a)
            if (guardado.has(clave)) return guardado.get(clave)
            const r = await fn(...a)
            guardado.set(clave, r)
            return r
          },
      }
    })
    let caido = true
    const horas = Array.from({ length: 48 }, (_, i) => new Date(Date.now() + i * 3_600_000).toISOString().slice(0, 13) + ':00')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        caido
          ? new Response('caído', { status: 503 })
          : Response.json({ utc_offset_seconds: 0, latitude: 36.7, longitude: -6.4, hourly: { time: horas, wind_speed_10m: horas.map(() => 10) } }),
      ),
    )
    vi.resetModules()
    const { getMarineForecast } = await import('@/lib/marine-forecast')
    const spot = { slug: 'chipiona', name: 'Chipiona', lat: 36.7369, lon: -6.4372, type: 'mar' } as Parameters<typeof getMarineForecast>[0]

    expect((await getMarineForecast(spot)).available).toBe(false)
    caido = false
    expect((await getMarineForecast(spot)).available).toBe(true)
    vi.doUnmock('next/cache')
  })
})
