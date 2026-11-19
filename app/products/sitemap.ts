import type { MetadataRoute } from 'next'
import { listProducts } from '@/lib/products-store'
import { entradasDeProductos } from '@/lib/sitemap-productos'

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://pescaplus.es'

/**
 * Se rehace cada hora, como las fichas. Sin esto se genera una vez al
 * compilar, y una ficha dada de alta o agotada no cambiaba en el sitemap
 * hasta el siguiente despliegue.
 */
export const revalidate = 3600

/** /products/sitemap.xml — las fichas, aparte del sitemap general (ver lib/sitemap-productos.ts). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return entradasDeProductos(await listProducts(), base)
}
