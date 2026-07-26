import { describe, it, expect } from 'vitest'
import { describePoi, POI_KINDS, MIN_POI_ZOOM } from '@/lib/nautical-pois'
import type { NauticalPoi } from '@/lib/nautical-poi-types'

const base: NauticalPoi = {
  id: 'x', kind: 'rampa', name: 'Rampa de Bouzas',
  lat: 42.21, lon: -8.74, details: {}, sourceDate: '2026-07-27',
  osmUrl: 'https://www.openstreetmap.org/way/1',
}

describe('puntos náuticos — cómo se cuentan los datos de OSM', () => {
  it('traduce las etiquetas y los valores que conoce', () => {
    const filas = describePoi({ ...base, details: { access: 'public', surface: 'concrete', fee: 'no' } })
    expect(filas).toEqual(expect.arrayContaining([
      { label: 'Acceso', value: 'público' },
      { label: 'Firme', value: 'hormigón' },
      { label: 'De pago', value: 'no' },
    ]))
  })

  /**
   * OSM tiene decenas de miles de claves. Enseñar las que no se entienden sería
   * ruido, e inventarles nombre sería peor.
   */
  it('descarta las etiquetas que no sabe explicar', () => {
    const filas = describePoi({ ...base, details: { 'tiger:cfcc': 'A41', access: 'private' } })
    expect(filas).toHaveLength(1)
    expect(filas[0]).toEqual({ label: 'Acceso', value: 'privado' })
  })

  it('un valor desconocido se enseña tal cual, no se traduce a ojo', () => {
    const filas = describePoi({ ...base, details: { surface: 'paving_stones' } })
    expect(filas[0].value).toBe('paving_stones')
  })

  it('sin detalles no inventa ninguna fila', () => {
    expect(describePoi(base)).toEqual([])
  })
})

describe('puntos náuticos — configuración', () => {
  it('los tres tipos tienen nombre en español', () => {
    expect(POI_KINDS.map((k) => k.id).sort()).toEqual(['pecio', 'puerto', 'rampa'])
    for (const k of POI_KINDS) expect(k.label.length).toBeGreaterThan(3)
  })

  it('no se piden con el mapa muy abierto', () => {
    // Con España entera en pantalla serían miles de chinchetas ilegibles.
    expect(MIN_POI_ZOOM).toBeGreaterThanOrEqual(8)
  })
})
