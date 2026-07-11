import { revalidatePath } from 'next/cache'
import { listProducts, updateProduct } from '@/lib/products-store'
import { isAliExpressConfigured, getAliExpressProductsByIds } from '@/lib/aliexpress'

export interface RefreshResult {
  configured: boolean
  checked: number
  updated: number
  unavailable: number
}

const BATCH = 20

/**
 * Refresh live product data from AliExpress: current price, affiliate link
 * (promotion_link, which expires), rating, sales and availability. The
 * AI-written title/description/SEO/images are preserved — only volatile fields
 * are updated. Products whose id no longer resolves are marked out of stock.
 */
export async function refreshCatalogPrices(): Promise<RefreshResult> {
  if (!isAliExpressConfigured()) {
    return { configured: false, checked: 0, updated: 0, unavailable: 0 }
  }

  const products = await listProducts()
  const targets = products.filter((p) => /^\d+$/.test(p.aliexpressId))

  let updated = 0
  let unavailable = 0
  const touchedCategories = new Set<string>()

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH)
    const fresh = await getAliExpressProductsByIds(batch.map((p) => p.aliexpressId))
    const byId = new Map(fresh.map((f) => [f.aliexpressId, f]))

    for (const p of batch) {
      const f = byId.get(p.aliexpressId)

      if (!f || !f.affiliateUrl || f.price <= 0) {
        if (p.inStock) {
          await updateProduct(p.id, { inStock: false })
          unavailable++
          touchedCategories.add(String(p.typeFishing))
          revalidatePath(`/products/${p.id}`)
        }
        continue
      }

      const priceChanged = Math.abs(f.price - p.price) > 0.001
      const linkChanged = f.affiliateUrl !== p.affiliateUrl
      if (priceChanged || linkChanged || !p.inStock) {
        await updateProduct(p.id, {
          price: f.price,
          currency: f.currency || p.currency,
          affiliateUrl: f.affiliateUrl,
          rating: f.rating || p.rating,
          reviews: f.reviews || p.reviews,
          inStock: true,
        })
        updated++
        touchedCategories.add(String(p.typeFishing))
        revalidatePath(`/products/${p.id}`)
      }
    }
  }

  touchedCategories.forEach((c) => revalidatePath(`/categories/${c}`))
  if (updated + unavailable > 0) revalidatePath('/')

  return { configured: true, checked: targets.length, updated, unavailable }
}
