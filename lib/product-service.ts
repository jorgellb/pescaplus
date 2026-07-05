import type { Product } from '@/types'
import { getProduct, listProducts } from '@/lib/products-store'
import { isAliExpressConfigured, getAliExpressProductDetail } from '@/lib/aliexpress'

/**
 * Server-side product resolver shared by the product page and its generateMetadata.
 * Looks in the store first, then falls back to a live AliExpress lookup for
 * numeric ids that aren't persisted locally.
 */
export async function resolveProduct(id: string): Promise<Product | undefined> {
  const local = await getProduct(id)
  if (local) return local
  if (isAliExpressConfigured() && /^\d+$/.test(id)) {
    return getAliExpressProductDetail(id)
  }
  return undefined
}

export async function relatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const all = await listProducts({ typeFishing: String(product.typeFishing) })
  return all.filter((p) => p.id !== product.id).slice(0, limit)
}
