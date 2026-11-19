import { describe, it, expect } from 'vitest'
import type { Product } from '@/types'
import sitemap from '@/app/sitemap'
import sitemapDeProductos from '@/app/products/sitemap'
import robots from '@/app/robots'
import { entradasDeProductos } from '@/lib/sitemap-productos'
import { CATALOG } from '@/lib/catalog'

/*
 * Las fichas van en su propio sitemap (/products/sitemap.xml). Así Search
 * Console cuenta aparte cuántas fichas tiene indexadas, que es justo lo que
 * hay que vigilar, sin mezclarlas con las 1.100 páginas de especie × zona.
 */

const base = 'https://pescaplus.es'
const ficha = (id: string, extra: Partial<Product> = {}): Product => ({ ...CATALOG[0], id, ...extra })

describe('sitemap de fichas', () => {
  it('lleva la fecha real del último cambio, y ninguna si no se sabe', () => {
    const [con, sin] = entradasDeProductos(
      [ficha('a', { updatedAt: '2026-11-11T11:47:00.000Z' }), ficha('b', { updatedAt: undefined })],
      base,
    )
    expect(con.url).toBe(`${base}/products/a`)
    expect(new Date(con.lastModified!).toISOString()).toBe('2026-11-11T11:47:00.000Z')
    expect(sin.lastModified).toBeUndefined()
  })

  it('deja fuera las agotadas: son noindex y no se piden a Google', () => {
    const urls = entradasDeProductos([ficha('a'), ficha('agotada', { inStock: false })], base).map((u) => u.url)
    expect(urls).toEqual([`${base}/products/a`])
  })

  it('el sitemap general ya no repite las fichas, y robots.txt anuncia los dos', async () => {
    const general = await sitemap()
    expect(general.some((u) => u.url.includes('/products/'))).toBe(false)
    const fichas = await sitemapDeProductos()
    expect(fichas.length).toBeGreaterThan(0)
    expect(fichas.every((u) => u.url.includes('/products/'))).toBe(true)

    const r = robots()
    const anunciados = Array.isArray(r.sitemap) ? r.sitemap : [r.sitemap]
    expect(anunciados).toContain(`${base}/sitemap.xml`)
    expect(anunciados).toContain(`${base}/products/sitemap.xml`)
  })
})
