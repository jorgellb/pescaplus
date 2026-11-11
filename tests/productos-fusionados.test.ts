import { describe, it, expect } from 'vitest'
import fusion from '@/lib/productos-fusionados.json'
import nextConfig from '../next.config'

/*
 * Productos duplicados fusionados (2026-11-11): la copia se borra de la base
 * de datos con scripts/fusionar-duplicados.mjs y su URL lleva a la original.
 */

const pares = Object.entries(fusion.fusionados)

describe('productos fusionados', () => {
  it('cada copia lleva a una original distinta de sí misma, sin cadenas', () => {
    expect(pares.length).toBeGreaterThan(0)
    const copias = new Set(pares.map(([de]) => de))
    for (const [de, a] of pares) {
      expect(de).not.toBe(a)
      // Si la original fuera a su vez una copia, habría dos saltos y la
      // segunda ficha ya no existiría.
      expect(copias.has(a)).toBe(false)
      expect(de).toMatch(/^[a-z0-9-]+$/)
      expect(a).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('la ficha de la copia redirige para siempre y la salida a la tienda, de forma temporal', async () => {
    const redirecciones = (await nextConfig.redirects?.()) ?? []
    for (const [de, a] of pares) {
      expect(redirecciones).toContainEqual({ source: `/products/${de}`, destination: `/products/${a}`, permanent: true })
      expect(redirecciones).toContainEqual({ source: `/go/${de}`, destination: `/go/${a}`, permanent: false })
    }
  })
})
