import { describe, it, expect } from 'vitest'
import { getSpecies, GENERAL, SEA_SPECIES } from '@/lib/fishing-species'

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
