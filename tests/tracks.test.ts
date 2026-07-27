import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTrack, listTracks, getTrack, renameTrack, deleteTrack, deleteAllTracks, validateTrack,
} from '@/lib/tracks-store'
import {
  rejectReason, decimate, trackDistance, trackDuration, formatDistance, formatDuration,
  MAX_ACCURACY_M, type TrackPoint,
} from '@/lib/track-types'
import { trackToGPX, trackFromGPX } from '@/lib/gpx'

const g = globalThis as unknown as Record<string, unknown[]>
beforeEach(() => { g.__pescaplusTracks = [] })

const A = 'usuario-a'
const B = 'usuario-b'
const T0 = Date.UTC(2026, 6, 27, 6, 0, 0)

/** Una derrota corta saliendo de Tarifa hacia el sur. */
function derrota(n = 5, paso = 0.002): TrackPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    lat: 36.0 - i * paso, lon: -5.61, t: T0 + i * 60_000, acc: 8,
  }))
}

describe('rutas — privacidad por defecto', () => {
  it('nace privada aunque no se diga nada', async () => {
    const t = await createTrack(A, { name: 'Salida del sábado', points: derrota() })
    expect(t.visibility).toBe('private')
  })

  it('cualquier valor raro de visibilidad cae del lado seguro', async () => {
    const t = await createTrack(A, { name: 'X', points: derrota(), visibility: 'todo-el-mundo' })
    expect(t.visibility).toBe('private')
  })
})

/**
 * Una derrota completa dice dónde pesca alguien, a qué hora sale y por dónde
 * entra: es más revelador que una marca suelta. El aislamiento se demuestra por
 * todas las vías, igual que con los waypoints.
 */
describe('rutas — aislamiento entre usuarios', () => {
  it('B no puede leer, listar, renombrar ni borrar una ruta de A', async () => {
    const t = await createTrack(A, { name: 'Al bajo de las lubinas', points: derrota() })

    expect(await getTrack(t.id, B)).toBeNull()
    expect(await listTracks(B)).toHaveLength(0)
    expect(await renameTrack(t.id, B, 'secuestrada')).toBeNull()
    expect(await deleteTrack(t.id, B)).toBe(false)

    const sigue = await getTrack(t.id, A)
    expect(sigue).not.toBeNull()
    expect(sigue!.name).toBe('Al bajo de las lubinas')
  })

  it('sin usuario no se puede hacer nada', async () => {
    const t = await createTrack(A, { name: 'X', points: derrota() })
    await expect(createTrack('', { name: 'X', points: derrota() })).rejects.toThrow()
    expect(await getTrack(t.id, '')).toBeNull()
    expect(await listTracks('')).toHaveLength(0)
    expect(await deleteTrack(t.id, '')).toBe(false)
  })

  it('borrar la cuenta no toca las rutas de otro', async () => {
    await createTrack(A, { name: 'Una', points: derrota() })
    await createTrack(A, { name: 'Otra', points: derrota() })
    await createTrack(B, { name: 'De B', points: derrota() })

    expect(await deleteAllTracks(A)).toBe(2)
    expect(await listTracks(A)).toHaveLength(0)
    expect(await listTracks(B)).toHaveLength(1)
  })

  it('el listado no arrastra los puntos salvo que se pidan', async () => {
    await createTrack(A, { name: 'Larga', points: derrota(50) })
    expect((await listTracks(A))[0].points).toHaveLength(0)
    expect((await listTracks(A, true))[0].points.length).toBeGreaterThan(2)
  })
})

describe('rutas — validación y métricas', () => {
  it('rechaza lo que no es una ruta', () => {
    expect(validateTrack({ name: '', points: derrota() })).toMatch(/nombre/i)
    expect(validateTrack({ name: 'X', points: [] })).toMatch(/puntos/i)
    expect(validateTrack({ name: 'X', points: derrota(1) })).toMatch(/puntos/i)
    expect(validateTrack({ name: 'X', points: [{ lat: 99, lon: 0, t: 1 }, { lat: 0, lon: 0, t: 2 }] })).toMatch(/no válidas/i)
    expect(validateTrack({ name: 'X', points: derrota() })).toBeNull()
  })

  it('calcula distancia y duración al guardar', async () => {
    const t = await createTrack(A, { name: 'Cuatro minutos', points: derrota(5) })
    // 4 tramos de 0,002° de latitud ≈ 222 m cada uno.
    expect(t.distanceM).toBeGreaterThan(800)
    expect(t.distanceM).toBeLessThan(950)
    expect(t.durationS).toBe(240)
  })

  it('la distancia se enseña en millas náuticas a partir de una milla', () => {
    expect(formatDistance(500)).toMatch(/m$/)
    expect(formatDistance(3704)).toBe('2 M')
    expect(formatDuration(45)).toBe('45 s')
    expect(formatDuration(3600 + 14 * 60)).toBe('1 h 14 min')
  })
})

/**
 * El filtrado es lo que separa una derrota utilizable de una línea con dientes
 * de sierra. Cada caso de abajo se ha visto en un GPS de móvil real.
 */
describe('rutas — filtrado de puntos del GPS', () => {
  const p = (lat: number, lon: number, t: number, acc?: number): TrackPoint => ({ lat, lon, t, acc })

  it('descarta las posiciones imprecisas', () => {
    expect(rejectReason(null, p(36, -5.6, T0, MAX_ACCURACY_M + 1))).toMatch(/precisión/i)
    expect(rejectReason(null, p(36, -5.6, T0, 10))).toBeNull()
  })

  it('descarta el salto imposible', () => {
    // 5 km en dos segundos: el aparato ha cambiado de fuente de posición.
    const antes = p(36, -5.6, T0, 5)
    expect(rejectReason(antes, p(36.045, -5.6, T0 + 2000, 5))).toMatch(/salto/i)
  })

  it('no guarda un punto por segundo con el barco parado', () => {
    const antes = p(36, -5.6, T0, 5)
    expect(rejectReason(antes, p(36.000005, -5.6, T0 + 1000, 5))).toMatch(/sin movimiento/i)
  })

  it('descarta relojes que van hacia atrás', () => {
    const antes = p(36, -5.6, T0, 5)
    expect(rejectReason(antes, p(36.01, -5.6, T0 - 1000, 5))).toMatch(/tiempo/i)
  })

  it('acepta el avance normal de una embarcación', () => {
    const antes = p(36, -5.6, T0, 8)
    expect(rejectReason(antes, p(36.002, -5.6, T0 + 60_000, 8))).toBeNull()
  })
})

describe('rutas — diezmado', () => {
  it('respeta las rutas que caben', () => {
    const d = derrota(10)
    expect(decimate(d, 100)).toHaveLength(10)
  })

  it('al diezmar conserva SIEMPRE el último punto', () => {
    // Perder el final es perder la vuelta a puerto, que es lo que se mira.
    const d = derrota(1000)
    const corta = decimate(d, 100)
    expect(corta.length).toBeLessThanOrEqual(101)
    expect(corta[corta.length - 1]).toEqual(d[d.length - 1])
    expect(corta[0]).toEqual(d[0])
  })
})

describe('rutas — GPX', () => {
  it('exporta trkpt con su hora y vuelve a leerse', async () => {
    const t = await createTrack(A, { name: 'Derrota del sábado', notes: 'Curricán', points: derrota(6) })
    const xml = trackToGPX(t)

    expect(xml).toContain('<trk>')
    expect(xml).toContain('<trkseg>')
    expect(xml).toContain('Derrota del sábado')
    // Sin <time> un plotter no puede sacar velocidad ni sentido de la marcha.
    expect(xml).toContain('<time>2026-07-27T06:00:00.000Z</time>')

    const vuelta = trackFromGPX(xml)
    expect(vuelta).toHaveLength(6)
    expect(vuelta[0].lat).toBeCloseTo(36.0, 5)
    expect(vuelta[0].t).toBe(T0)
    expect(trackDuration(vuelta)).toBe(trackDuration(t.points))
    expect(trackDistance(vuelta)).toBeCloseTo(trackDistance(t.points), 0)
  })

  it('lee GPX de otros aparatos, con prefijo de espacio de nombres', () => {
    const xml = `<?xml version="1.0"?>
      <gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
        <gpx:trk><gpx:trkseg>
          <gpx:trkpt lat="43.3" lon="-8.4"><gpx:time>2026-07-27T08:00:00Z</gpx:time></gpx:trkpt>
          <gpx:trkpt lat="43.31" lon="-8.41"><gpx:time>2026-07-27T08:01:00Z</gpx:time></gpx:trkpt>
        </gpx:trkseg></gpx:trk>
      </gpx>`
    const pts = trackFromGPX(xml)
    expect(pts).toHaveLength(2)
    expect(pts[0].lat).toBe(43.3)
    expect(trackDuration(pts)).toBe(60)
  })

  it('un punto sin hora no tumba el fichero', () => {
    // Muchos plotters no escriben <time> en cada trkpt.
    const xml = '<gpx><trk><trkseg><trkpt lat="40" lon="-3"/><trkpt lat="40.01" lon="-3"/></trkseg></trk></gpx>'
    const pts = trackFromGPX(xml)
    expect(pts).toHaveLength(2)
    expect(pts[1].t).toBeGreaterThan(pts[0].t)
  })

  it('descarta coordenadas imposibles en vez de romper', () => {
    const xml = `<gpx><trk><trkseg>
      <trkpt lat="99" lon="-3"/><trkpt lat="40" lon="-3"/><trkpt lat="40.01" lon="-3"/>
    </trkseg></trk></gpx>`
    expect(trackFromGPX(xml)).toHaveLength(2)
  })

  it('escapa lo que rompería el XML', async () => {
    const t = await createTrack(A, { name: 'Ruta <peligro> & "la mala"', points: derrota() })
    const xml = trackToGPX(t)
    expect(xml).toContain('&lt;peligro&gt;')
    expect(xml).toContain('&amp;')
  })
})
