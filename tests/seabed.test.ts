import { describe, it, expect } from 'vitest'
import { translateSubstrate } from '@/lib/seabed'
import { readRelief } from '@/lib/soundings'

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


/**
 * El relieve sale gratis del reparto de sondas que la fuente ya devuelve, y es
 * el mejor indicio de roca que se puede sacar a distancia. Los números son
 * medidos: Columbretes da 32,1 m de desnivel dentro de una celda y el golfo de
 * Cádiz 0,4 m.
 */
describe('relieve del fondo', () => {
  it('un desnivel grande dentro de la celda apunta a roca', () => {
    const r = readRelief(32.1, 9)
    expect(r.kind).toBe('muy-irregular')
    expect(r.hint).toMatch(/roca/i)
  })

  it('un fondo plano apunta a sedimento', () => {
    const r = readRelief(0.4, 9)
    expect(r.kind).toBe('liso')
    expect(r.hint).toMatch(/arena|fango/i)
  })

  it('los tramos intermedios no prometen roca', () => {
    expect(readRelief(5, 9).kind).toBe('irregular')
    expect(readRelief(1.5, 9).kind).toBe('poco-movido')
    expect(readRelief(1.5, 9).hint).toBeNull()
  })

  /**
   * Con una sola celda la fuente no promedió nada, así que no hay reparto que
   * medir. Decir "liso" ahí sería inventarse un dato que no existe.
   */
  it('sin reparto no se afirma que el fondo sea liso', () => {
    expect(readRelief(0, 1).kind).toBe('desconocido')
    expect(readRelief(null, 9).kind).toBe('desconocido')
    expect(readRelief(5, null).kind).toBe('desconocido')
  })

  it('nunca promete el sustrato, solo lo sugiere', () => {
    for (const r of [readRelief(32, 9), readRelief(0.2, 9)]) {
      expect(r.hint).toMatch(/compatible con/i)
    }
  })
})
