import type { Product } from '@/types'
import { listProducts } from '@/lib/products-store'
import { getClickStats } from '@/lib/clicks-store'
import { proxyProductImages } from '@/lib/img-proxy'

/**
 * "Most wanted" ranking for storefront sections. Blends real affiliate-click
 * counts (the strongest signal of intent) with catalog popularity (reviews +
 * rating) so the list is meaningful from day one — before any clicks exist — and
 * automatically sharpens as traffic accrues.
 *
 * Score = clicks · 1000  +  min(reviews, 5000)  +  rating · 20
 * The huge click weight guarantees any clicked product outranks unclicked ones,
 * while reviews/rating provide a sensible order for the long tail.
 */
function trendingScore(clicks: Map<string, number>) {
  return (p: Product) => (clicks.get(p.id) ?? 0) * 1000 + Math.min(p.reviews, 5000) + p.rating * 20
}

async function clickCounts(): Promise<Map<string, number>> {
  const stats = await getClickStats().catch(() => null)
  return new Map((stats?.byProduct ?? []).map((p) => [p.productId, p.count]))
}

/** Every product of the scope, ordered by trending score (nothing filtered out). */
export async function getTrendingRanked(typeFishing?: string): Promise<Product[]> {
  const [products, clicks] = await Promise.all([
    listProducts(typeFishing ? { typeFishing } : {}),
    clickCounts(),
  ])
  const score = trendingScore(clicks)
  return [...products].sort((a, b) => score(b) - score(a)).map(proxyProductImages)
}

/** Top storefront picks: image-bearing products ordered by trending, capped. */
export async function getTrendingProducts(limit = 8, typeFishing?: string): Promise<Product[]> {
  const ranked = await getTrendingRanked(typeFishing)
  return ranked.filter((p) => p.imageUrl).slice(0, limit)
}
