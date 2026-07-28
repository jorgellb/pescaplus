import { describe, it, expect } from 'vitest'
import { getSpecies, GENERAL, SEA_SPECIES, deSpecies } from '@/lib/fishing-species'

describe('fishing species', () => {
  it('falls back to the general profile for unknown/empty ids', () => {
    expect(getSpecies(null).id).toBe('general')
    expect(getSpecies('rio-inventado').id).toBe('general')
    expect(getSpecies(undefined).id).toBe(GENERAL.id)
  })

  it('resolves each sea species by id', () => {
    for (const sp of SEA_SPECIES) {
      expect(getSpecies(sp.id).id).toBe(sp.id)
    }
  })

  it('tunes profiles to species behaviour (lubina favours night, dorada does not)', () => {
    const lubina = getSpecies('lubina')
    const dorada = getSpecies('dorada')
    expect(lubina.night).toBeGreaterThan(dorada.night)
    expect(lubina.wavePref).toBe('rough')
    expect(dorada.wavePref).toBe('calm')
  })
})

/**
 * El titular de cada ficha es «Pesca ${deSpecies(sp)}». Durante meses dijo
 * "Pesca de la mero" en las 14 especies masculinas, en el h1 Y en el título
 * que ve Google. Estas pruebas existen para que no vuelva a colarse.
 */
describe('concordancia del nombre de especie', () => {
  it('contrae y concuerda: del / de la / de los / de las', () => {
    expect(deSpecies(getSpecies('meros'))).toBe('del mero')
    expect(deSpecies(getSpecies('lubina'))).toBe('de la lubina')
    expect(deSpecies(getSpecies('calamares'))).toBe('de los calamares')
    expect(deSpecies(getSpecies('potas'))).toBe('de las potas')
  })

  it('ninguna ficha dice "de la" delante de un nombre masculino', () => {
    const mal = SEA_SPECIES
      .filter((sp) => sp.article === 'el' && deSpecies(sp).startsWith('de la '))
      .map((sp) => sp.name)
    expect(mal).toEqual([])
  })

  it('cada especie declara su artículo', () => {
    const sinArticulo = SEA_SPECIES
      .filter((sp) => !['el', 'la', 'los', 'las'].includes(sp.article))
      .map((sp) => sp.name)
    expect(sinArticulo).toEqual([])
  })
})
