import { describe, it, expect } from 'vitest'
import {
  FISHING_TYPES,
  getFishingType,
  fishingLabel,
  fishingKeyword,
  isFishingTypeId,
} from '@/lib/fishing'

describe('fishing taxonomy', () => {
  it('has 11 categories with unique ids', () => {
    expect(FISHING_TYPES).toHaveLength(11)
    expect(new Set(FISHING_TYPES.map((t) => t.id)).size).toBe(11)
  })

  it('resolves known ids and rejects unknown', () => {
    expect(getFishingType('canas')?.name).toBe('Cañas de pesca')
    expect(getFishingType('nope')).toBeUndefined()
    expect(isFishingTypeId('carretes')).toBe(true)
    expect(isFishingTypeId('spinning-old')).toBe(false)
  })

  it('labels fall back gracefully', () => {
    expect(fishingLabel('senuelos')).toBe('Señuelos')
    expect(fishingLabel('general')).toBe('General')
    expect(fishingLabel('desconocido')).toBe('desconocido')
  })

  it('provides a keyword with a generic fallback', () => {
    expect(fishingKeyword('anzuelos')).toBe('fishing hooks')
    expect(fishingKeyword('desconocido')).toBe('fishing gear')
  })
})
