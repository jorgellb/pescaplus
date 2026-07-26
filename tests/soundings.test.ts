import { describe, it, expect } from 'vitest'
import { interpretSample } from '@/lib/soundings'

/**
 * Las respuestas de abajo son literales de EMODnet, capturadas al sondear la
 * API antes de escribir el lector. No son inventadas ni recortadas a lo que
 * conviene: son justo los casos que rompen una implementación ingenua.
 */
const ESTRECHO = {
  min: -413.46765, max: -392.37476, avg: -404.8204, stdev: 7.17,
  elementarySurfaces: 25, interpolationType: false, smoothed: -409.8806,
  reference: { organisation_id: 353, identifier: '291711', type: 'DTM', metadata_url: 'https://sextant.ifremer.fr/record/SDN_CPRD_353_291711' },
}
const COLUMBRETES = {
  min: -53.913254, max: -21.822073, avg: -42.131744, stdev: 6.123,
  elementarySurfaces: 9, interpolationType: false, smoothed: 5.424671,
  reference: { organisation_id: 1461, identifier: 'SPAIHM_MDT_MEDCASS', type: 'DTM' },
}
const MADRID = { avg: 676.92566, elementarySurfaces: 1, interpolationType: false, smoothed: 680.0489, reference: {} }
const CARIBE = { avg: -678.55664, elementarySurfaces: 1, interpolationType: true, smoothed: -678.3202, reference: { identifier: 'GEBCO2024', type: 'DTM' } }

describe('sondas — el fondo que se enseña', () => {
  it('da la profundidad en metros positivos', () => {
    const s = interpretSample(ESTRECHO)
    expect(s.kind).toBe('medida')
    expect(s.depthM).toBe(404.8)
    expect(s.label).toBe('404,8 m')  // decimal con coma: esto se lee en español
  })

  /**
   * El caso que decidió el diseño: sobre un bajo con paredes, `smoothed`
   * devuelve +5,4 m —por encima del agua— donde la media dice −42 m. Usar el
   * suavizado pondría "está en tierra" en pleno caladero de Columbretes.
   */
  it('usa la media, nunca el valor suavizado', () => {
    const s = interpretSample(COLUMBRETES)
    expect(s.kind).toBe('medida')
    expect(s.depthM).toBe(42.1)
    expect(s.depthM).not.toBeCloseTo(5.4, 1)
  })

  it('el rango se cuenta del menos hondo al más hondo', () => {
    const s = interpretSample(COLUMBRETES)
    // min/max llegan con el signo de la fuente: al invertirlos se cruzan.
    expect(s.minM).toBe(21.8)
    expect(s.maxM).toBe(53.9)
    expect(s.minM!).toBeLessThan(s.maxM!)
  })
})

describe('sondas — lo que no se puede afirmar', () => {
  it('en tierra no hay sonda de 0 m: hay altitud', () => {
    const s = interpretSample(MADRID)
    expect(s.kind).toBe('tierra')
    expect(s.depthM).toBeNull()
    expect(s.elevationM).toBe(676.9)
  })

  /**
   * La API contesta en todo el mundo, también donde solo hay modelo global.
   * Nunca avisa ella de que el dato es más flojo: hay que marcarlo aquí.
   */
  it('lo interpolado se marca como aproximado y se dice de dónde sale', () => {
    const s = interpretSample(CARIBE)
    expect(s.kind).toBe('aproximada')
    expect(s.label).toContain('≈')
    expect(s.source).toBe('GEBCO2024')
  })

  it('en la orilla no se dice "0 m": eso no es una sonda', () => {
    // El modelo devuelve centímetros junto a la costa; redondeados dan 0.
    const s = interpretSample({ avg: -0.12, interpolationType: false, reference: {} })
    expect(s.depthM).toBe(0.1)
    expect(s.label).toMatch(/orilla/i)
    expect(s.label).not.toMatch(/^0[,.]?0? m$/)
  })

  it('sin dato utilizable no se inventa nada', () => {
    for (const raw of [{}, { avg: undefined }, { avg: Number.NaN }]) {
      const s = interpretSample(raw)
      expect(s.kind).toBe('desconocida')
      expect(s.depthM).toBeNull()
    }
  })

  it('una medida real no se confunde con una aproximada', () => {
    expect(interpretSample(ESTRECHO).kind).toBe('medida')
    expect(interpretSample({ ...ESTRECHO, interpolationType: true }).kind).toBe('aproximada')
  })
})
