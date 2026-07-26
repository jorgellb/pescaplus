import { describe, it, expect } from 'vitest'
import { checkPoint, PESCAREC_NOTE } from '@/lib/protected-areas'

/**
 * La regla que se prueba aquí es la que evita una sanción: sin datos
 * cargados, la respuesta es "no verificado", NUNCA "fuera de zona
 * protegida". Un falso negativo en esta capa es peor que no tener capa.
 */
describe('capa normativa — los tres estados', () => {
  it('sin datos cargados nunca dice que estás fuera', async () => {
    // En tests no hay base de datos: es exactamente el caso "capa vacía".
    const r = await checkPoint(36.0128, -5.6056)
    expect(r.coverage).toBe('unverified')
    expect(r.coverage).not.toBe('outside')
    expect(r.loaded).toBe(0)
    expect(r.areas).toEqual([])
  })

  it('coordenadas inválidas tampoco producen un "estás fuera"', async () => {
    for (const [lat, lon] of [[NaN, 0], [0, NaN], [999, 999]] as const) {
      const r = await checkPoint(lat, lon)
      expect(r.coverage).not.toBe('outside')
    }
  })

  it('el aviso de PescaREC existe y menciona la app oficial', () => {
    expect(PESCAREC_NOTE).toMatch(/PescaREC/)
    expect(PESCAREC_NOTE).toMatch(/reservas marinas/i)
  })
})
