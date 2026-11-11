import { revalidatePath } from 'next/cache'
import { listProducts, updateProduct } from '@/lib/products-store'
import {
  isAliExpressConfigured,
  getAliExpressProductsByIds,
  generarEnlacesCortos,
  esEnlaceReemplazable,
} from '@/lib/aliexpress'

export interface RefreshResult {
  configured: boolean
  checked: number
  updated: number
  unavailable: number
  /** Enlaces largos de la API cambiados por enlaces cortos del generador. */
  shortened: number
}

const BATCH = 20

/**
 * Refresh live product data from AliExpress: current price, rating, sales and
 * availability. The AI-written title/description/SEO/images are preserved —
 * only volatile fields are updated. Products whose id no longer resolves are
 * marked out of stock.
 *
 * El enlace de compra ya no se sobrescribe sin más. Uno pegado a mano (o uno
 * corto `/e/_…` ya generado) se respeta siempre; solo se sustituyen los largos
 * de la API o los vacíos, y se sustituyen por enlaces cortos de `link.generate`,
 * iguales a los del portal. Si el generador falla, queda el de la API, como antes.
 */
export async function refreshCatalogPrices(): Promise<RefreshResult> {
  if (!isAliExpressConfigured()) {
    return { configured: false, checked: 0, updated: 0, unavailable: 0, shortened: 0 }
  }

  const products = await listProducts()
  const targets = products.filter((p) => /^\d+$/.test(p.sku))

  let updated = 0
  let unavailable = 0
  let shortened = 0
  const touchedCategories = new Set<string>()

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH)
    const fresh = await getAliExpressProductsByIds(batch.map((p) => p.sku))
    const byId = new Map(fresh.map((f) => [f.sku, f]))

    const vivos = batch.filter((p) => {
      const f = byId.get(p.sku)
      return f && f.affiliateUrl && f.price > 0
    })
    const cortos = await generarEnlacesCortos(
      vivos.filter((p) => esEnlaceReemplazable(p.affiliateUrl)).map((p) => p.sku),
    )

    for (const p of batch) {
      const f = byId.get(p.sku)

      if (!f || !f.affiliateUrl || f.price <= 0) {
        if (p.inStock) {
          await updateProduct(p.id, { inStock: false })
          unavailable++
          touchedCategories.add(String(p.typeFishing))
          revalidatePath(`/products/${p.id}`)
        }
        continue
      }

      const corto = cortos.get(p.sku)
      const enlace = !esEnlaceReemplazable(p.affiliateUrl) ? p.affiliateUrl : (corto ?? f.affiliateUrl)

      const priceChanged = Math.abs(f.price - p.price) > 0.001
      const linkChanged = enlace !== p.affiliateUrl
      if (priceChanged || linkChanged || !p.inStock) {
        await updateProduct(p.id, {
          price: f.price,
          currency: f.currency || p.currency,
          affiliateUrl: enlace,
          rating: f.rating || p.rating,
          reviews: f.reviews || p.reviews,
          inStock: true,
        })
        updated++
        if (linkChanged && enlace === corto) shortened++
        touchedCategories.add(String(p.typeFishing))
        revalidatePath(`/products/${p.id}`)
      }
    }
  }

  touchedCategories.forEach((c) => revalidatePath(`/categories/${c}`))
  if (updated + unavailable > 0) revalidatePath('/')

  return { configured: true, checked: targets.length, updated, unavailable, shortened }
}
