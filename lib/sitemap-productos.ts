import type { MetadataRoute } from 'next'
import type { Product } from '@/types'

/**
 * Las entradas del sitemap de fichas (/products/sitemap.xml).
 *
 * Van aparte del sitemap general para que Search Console cuente las fichas
 * indexadas por separado: con 626 fichas mezcladas entre 2.000 URL no se ve si
 * Google las indexa o las suelta.
 *
 * - `lastmod` es la fecha real del último cambio de la fila (precio, enlace,
 *   texto). Sin ella no se pone: ver la regla en app/sitemap.ts.
 * - Las agotadas no entran: la ficha es `noindex` mientras no se pueda comprar,
 *   y pedirle a Google que rastree una página que le prohibimos indexar es
 *   contradecirse.
 */
export function entradasDeProductos(productos: readonly Product[], base: string): MetadataRoute.Sitemap {
  return productos
    .filter((p) => p.inStock)
    .map((p) => ({
      url: `${base}/products/${p.id}`,
      ...(p.updatedAt ? { lastModified: new Date(p.updatedAt) } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
}
