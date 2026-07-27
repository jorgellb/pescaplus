import { describe, it, expect } from 'vitest'
import {
  qualityFilter, toGrid, toCsbCsv, toCsbGeoJson, footprintM,
  type RawSounding,
} from '@/lib/csb'

const T0 = Date.UTC(2026, 6, 27, 9, 0, 0)
const punto = (i: number, prof: number, extra: Partial<RawSounding> = {}): RawSounding => ({
  lat: 42.5 + i * 0.0002, lon: -9.0, belowTransducerM: prof, t: T0 + i * 2000, accM: 5, ...extra,
})

describe('calidad — el calado del transductor', () => {
  /**
   * Es la regla que sostiene todo lo demás. Sin restar el calado, cada barco
   * mete un sesgo distinto, y al juntar veinte barcos eso no se promedia: se
   * acumula. Antes que aportar profundidades con un sesgo desconocido, nada.
   */
  it('sin calado declarado no se acepta ninguna sonda', () => {
    const r = qualityFilter([punto(0, 20)], { transducerDraftM: NaN })
    expect(r.soundings).toHaveLength(0)
    expect(r.rejected[0].reason).toMatch(/calado/i)
  })

  it('un calado absurdo tampoco cuela', () => {
    expect(qualityFilter([punto(0, 20)], { transducerDraftM: 40 }).soundings).toHaveLength(0)
    expect(qualityFilter([punto(0, 20)], { transducerDraftM: -1 }).soundings).toHaveLength(0)
  })

  it('el calado se SUMA a lo que dice la sonda', () => {
    const r = qualityFilter([punto(0, 20)], { transducerDraftM: 0.6 })
    expect(r.soundings[0].depthM).toBeCloseTo(20.6, 2)
  })
})

describe('calidad — lo que se descarta', () => {
  it('las posiciones imprecisas', () => {
    const r = qualityFilter([punto(0, 20, { accM: 80 }), punto(1, 20)], { transducerDraftM: 0.5 })
    expect(r.soundings).toHaveLength(1)
    expect(r.rejected.some((x) => /precisión/i.test(x.reason))).toBe(true)
  })

  /**
   * Un banco de peces bajo la quilla da 8 m donde hay 40: baja y vuelve. Eso es
   * un pico. Se reconoce por la forma, no por lo rápido que cambia.
   */
  it('descarta el pico aislado y conserva lo de alrededor', () => {
    const r = qualityFilter(
      [punto(0, 40), punto(1, 8), punto(2, 41)],
      { transducerDraftM: 0.5 },
    )
    expect(r.soundings.map((s) => s.depthM)).toEqual([40.5, 41.5])
    expect(r.rejected.some((x) => /pico/i.test(x.reason))).toBe(true)
  })

  it('un escalón que baja y SIGUE bajando no es un pico', () => {
    // Entrando en un veril: cada sonda es más honda que la anterior. Si esto se
    // filtrara, se perdería justo el borde que se busca.
    const r = qualityFilter(
      [punto(0, 30), punto(1, 45), punto(2, 62), punto(3, 80)],
      { transducerDraftM: 0.5 },
    )
    expect(r.soundings).toHaveLength(4)
  })

  it('un veril de verdad NO se descarta', () => {
    // Bajar 30 m en 10 s es un talud real; el filtro no puede comérselo.
    const r = qualityFilter(
      [{ ...punto(0, 40), t: T0 }, { ...punto(1, 70), t: T0 + 10_000 }],
      { transducerDraftM: 0.5 },
    )
    expect(r.soundings).toHaveLength(2)
  })

  it('las coordenadas y horas imposibles', () => {
    const r = qualityFilter(
      [punto(0, 20, { lat: 99 }), punto(1, 20, { t: 0 }), punto(2, -3), punto(3, 20)],
      { transducerDraftM: 0.5 },
    )
    expect(r.soundings).toHaveLength(1)
  })

  it('agrupa los motivos para poder contárselos a quien aporta', () => {
    const r = qualityFilter(
      [punto(0, 20, { accM: 90 }), punto(1, 20, { accM: 90 }), punto(2, 20)],
      { transducerDraftM: 0.5 },
    )
    const gps = r.rejected.find((x) => /precisión/i.test(x.reason))
    expect(gps?.count).toBe(2)
  })
})

describe('rejilla', () => {
  /**
   * La decisión que define la utilidad de todo esto: se guarda la sonda MENOR
   * de cada celda, no la media. Buscamos piedra, y la media borra justo el
   * rasgo que se quiere encontrar.
   */
  it('guarda la profundidad menor, no la media', () => {
    const s = [
      { lat: 42.5, lon: -9.0, depthM: 31, t: T0 },
      { lat: 42.5, lon: -9.0, depthM: 18, t: T0 + 1000 },
      { lat: 42.5, lon: -9.0, depthM: 29, t: T0 + 2000 },
    ]
    const g = toGrid(s, 20)
    expect(g).toHaveLength(1)
    expect(g[0].depthM).toBe(18)      // la media (26) escondería la piedra
    expect(g[0].samples).toBe(3)
    expect(g[0].spreadM).toBe(13)     // y esto es el indicio de relieve
  })

  it('separa puntos que caen en celdas distintas', () => {
    const s = [
      { lat: 42.5000, lon: -9.0, depthM: 30, t: T0 },
      { lat: 42.5100, lon: -9.0, depthM: 30, t: T0 },  // ~1,1 km al norte
    ]
    expect(toGrid(s, 20)).toHaveLength(2)
  })

  it('la celda mide lo mismo en metros aunque cambie la latitud', () => {
    // Sin corregir por el coseno, cerca del polo saldrían celdas larguísimas.
    const cerca = toGrid([
      { lat: 70, lon: 0, depthM: 10, t: T0 },
      { lat: 70, lon: 0.0004, depthM: 10, t: T0 },  // ~15 m al este
    ], 20)
    expect(cerca).toHaveLength(1)
  })

  it('sin sondas no inventa celdas', () => {
    expect(toGrid([], 20)).toEqual([])
  })
})

describe('formato de la OHI', () => {
  const soundings = [
    { lat: 42.5, lon: -9.0, depthM: 31.25, t: T0 },
    { lat: 42.5002, lon: -9.0001, depthM: 30.9, t: T0 + 2000 },
  ]
  const meta = { uniqueVesselId: 'PP-anon-7f3a', providerName: 'PescaPlus', draftM: 0.6 }

  it('el CSV lleva las columnas y el orden que espera el archivo', () => {
    const csv = toCsbCsv(soundings, meta)
    const lineas = csv.trim().split('\n')
    expect(lineas[0]).toBe('UNIQUE_ID,LON,LAT,DEPTH,TIME')
    // Longitud ANTES que latitud, que es el orden del formato y una fuente
    // inagotable de datos volcados del revés.
    expect(lineas[1]).toBe('PP-anon-7f3a,-9.0000000,42.5000000,31.25,2026-07-27T09:00:00.000Z')
    expect(lineas).toHaveLength(3)
  })

  it('el GeoJSON conserva de dónde salió cada dato', () => {
    const g = JSON.parse(toCsbGeoJson(soundings, meta))
    expect(g.type).toBe('FeatureCollection')
    expect(g.properties.platform.uniqueID).toBe('PP-anon-7f3a')
    expect(g.properties.platform.draft).toBe(0.6)
    expect(g.features[0].geometry.coordinates).toEqual([-9, 42.5])
    expect(g.features[0].properties.depth).toBe(31.25)
  })

  /**
   * Callar que no están corregidas de marea sería dejar que otro las use
   * creyendo que sí. En el Atlántico español eso son metros de diferencia.
   */
  it('declara que NO están corregidas de marea', () => {
    const g = JSON.parse(toCsbGeoJson(soundings, meta))
    expect(g.properties.processingParameters.tideCorrected).toBe(false)
  })

  it('el identificador del barco es el que se le pase: nunca la matrícula', () => {
    const csv = toCsbCsv(soundings, { ...meta, uniqueVesselId: 'PP-anon-0001' })
    expect(csv).toContain('PP-anon-0001')
    expect(csv).not.toMatch(/\d{1,2}-[A-Z]{2}-\d/)  // formato de matrícula española
  })
})

/**
 * El número que hay que tener presente antes de prometer "hasta la piedra más
 * pequeña": una sonda de pesca no ve un punto, ve un círculo.
 */
describe('lo que ve de verdad una ecosonda', () => {
  it('a más fondo, mancha más grande', () => {
    expect(footprintM(50)).toBeCloseTo(17.6, 0)
    expect(footprintM(100)).toBeCloseTo(35.3, 0)
    expect(footprintM(10)).toBeCloseTo(3.5, 0)
  })

  it('un cono más estrecho ve menos superficie', () => {
    expect(footprintM(50, 8)).toBeLessThan(footprintM(50, 20))
  })
})
