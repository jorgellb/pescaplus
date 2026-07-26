import { describe, it, expect } from 'vitest'
import { translateSubstrate } from '@/lib/seabed'

/**
 * Las cadenas son las que devuelve EUSeaMap tal cual, comprobadas contra el
 * servicio. La regla es la de siempre en este proyecto: lo que no se entiende
 * se enseña como viene, nunca se adivina.
 */
describe('tipo de fondo', () => {
  it('traduce las clases conocidas', () => {
    expect(translateSubstrate('Rock or other hard substrata').label).toBe('Roca o fondo duro')
    expect(translateSubstrate('Sand').label).toBe('Arena')
    expect(translateSubstrate('Coarse substrate').label).toBe('Fondo grueso (grava y cascajo)')
  })

  it('no le importan las mayúsculas ni los espacios de la fuente', () => {
    expect(translateSubstrate('  SAND  ').label).toBe('Arena')
  })

  it('una clase desconocida se enseña tal cual, no se inventa', () => {
    const s = translateSubstrate('Bioclastic gravel of the abyssal plain')
    expect(s.label).toBe('Bioclastic gravel of the abyssal plain')
    expect(s.substrate).toBe('Bioclastic gravel of the abyssal plain')
  })

  it('sin dato no hay fondo: no se rellena con lo más probable', () => {
    for (const v of [null, undefined, '', '   ']) {
      const s = translateSubstrate(v)
      expect(s.substrate).toBeNull()
      expect(s.label).toMatch(/sin datos/i)
    }
  })

  it('guarda el original en inglés por si la traducción se queda corta', () => {
    expect(translateSubstrate('Sand').raw).toBe('Sand')
  })
})
