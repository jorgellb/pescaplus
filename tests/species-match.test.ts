import { describe, it, expect } from 'vitest'
import { depthRange, substratos, especiesCompatibles, datosQueFaltan, PELAGICAS } from '@/lib/species-match'
import { SEA_SPECIES, getSpecies } from '@/lib/fishing-species'

/**
 * Los rangos no están escritos a mano: se derivan de la prosa de cada ficha.
 * Esta prueba es lo que impide que la derivación se rompa en silencio cuando
 * alguien reescriba un "10–50 m sobre piedra".
 */
describe('lo que se deriva de las fichas', () => {
  it('TODAS las especies de mar dicen su profundidad de forma interpretable', () => {
    const sinRango = SEA_SPECIES
      .filter((p) => p.id !== 'general' && p.id !== 'pelagicos')
      .filter((p) => depthRange(p) === null)
      .map((p) => `${p.id}: "${p.depth}"`)
    expect(sinRango).toEqual([])
  })

  it('lee bien el rango', () => {
    expect(depthRange(getSpecies('lubina'))).toEqual([0, 10])
    expect(depthRange(getSpecies('denton'))).toEqual([10, 50])
    expect(depthRange(getSpecies('gallineta'))).toEqual([80, 200])
  })

  it('deduce el fondo de lo que dice el hábitat', () => {
    expect(substratos(getSpecies('sargo'))).toContain('Roca o fondo duro')
    expect(substratos(getSpecies('lenguado'))).toContain('Arena')
    // El mero vive en cuevas y pecios: eso es roca.
    expect(substratos(getSpecies('meros'))).toContain('Roca o fondo duro')
  })

  /**
   * Las únicas sin fondo deben ser las pelágicas, y por decisión declarada. Si
   * aparece otra, es que su hábitat se ha reescrito y la derivación ya no lo
   * reconoce — que es justo lo que esta prueba existe para cazar.
   */
  it('solo las pelágicas se quedan sin tipo de fondo', () => {
    const sinFondo = SEA_SPECIES
      .filter((p) => p.id !== 'general')
      .filter((p) => substratos(p).length === 0)
      .map((p) => p.id)
      .sort()
    expect(sinFondo).toEqual([...PELAGICAS].sort())
  })

  it('la lecha caza sobre bajos y estructuras: eso es roca', () => {
    expect(substratos(getSpecies('lechas'))).toContain('Roca o fondo duro')
  })
})

describe('qué encaja en un punto', () => {
  /** Roca a 22 m en octubre con agua a 17 °C: sitio de dentón y mero. */
  const bajoDeRoca = { sondaM: 22, sustrato: 'Roca o fondo duro', aguaC: 17, mes: 10 }

  it('propone especies de roca en un bajo de roca', () => {
    const r = especiesCompatibles(bajoDeRoca)
    expect(r.length).toBeGreaterThan(0)
    const ids = r.map((c) => c.speciesId)
    expect(ids).toContain('denton')
    // El lenguado vive enterrado en arena a poca sonda: aquí no pinta nada.
    expect(ids).not.toContain('lenguado')
  })

  it('en un arenal somero propone especies de arena', () => {
    const ids = especiesCompatibles({ sondaM: 4, sustrato: 'Arena', aguaC: 18, mes: 7 }).map((c) => c.speciesId)
    expect(ids.some((i) => ['lenguado', 'herrera', 'dorada'].includes(i))).toBe(true)
    expect(ids).not.toContain('gallineta')  // vive a 80-200 m
  })

  it('enseña QUÉ ha encajado, no una puntuación opaca', () => {
    const [primera] = especiesCompatibles(bajoDeRoca)
    expect(primera.criterios.length).toBeGreaterThanOrEqual(3)
    for (const c of primera.criterios) {
      expect(['sonda', 'fondo', 'agua', 'época']).toContain(c.que)
      expect(c.detalle.length).toBeGreaterThan(4)
    }
  })

  /**
   * Coincidir solo en el mes no basta: alguien va a decidir qué caña montar con
   * esta lista.
   */
  it('no cuela una especie que solo coincide en la época', () => {
    const ids = especiesCompatibles({ sondaM: 150, sustrato: 'Arena', aguaC: 30, mes: 10 }).map((c) => c.speciesId)
    expect(ids).not.toContain('lubina')
  })

  it('sin datos del punto no se inventa una lista larga', () => {
    // Solo con el mes, casi todo "encaja" y eso no informa de nada.
    const soloMes = especiesCompatibles({ mes: 10 })
    for (const c of soloMes) expect(c.comprobados).toBe(1)
  })

  it('respeta el tope', () => {
    expect(especiesCompatibles(bajoDeRoca, 3).length).toBeLessThanOrEqual(3)
  })
})

describe('lo que falta se dice', () => {
  it('enumera los datos ausentes del punto', () => {
    expect(datosQueFaltan({ mes: 5 })).toEqual(['la sonda', 'el tipo de fondo', 'la temperatura del agua'])
    expect(datosQueFaltan({ sondaM: 12, sustrato: 'Arena', aguaC: 18, mes: 5 })).toEqual([])
  })
})
