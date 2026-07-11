import { beforeAll, describe, it, expect } from 'vitest'
import { getTrendingProducts, getTrendingRanked } from '@/lib/trending'

beforeAll(() => {
  delete process.env.DATABASE_URL
})

describe('trending', () => {
  it('returns image-bearing products, capped at the limit', async () => {
    const top = await getTrendingProducts(5)
    expect(top.length).toBeGreaterThan(0)
    expect(top.length).toBeLessThanOrEqual(5)
    expect(top.every((p) => p.imageUrl)).toBe(true)
  })

  it('orders by score (reviews/rating) descending with no clicks', async () => {
    const top = await getTrendingProducts(10)
    const scores = top.map((p) => Math.min(p.reviews, 5000) + p.rating * 20)
    const sorted = [...scores].sort((a, b) => b - a)
    expect(scores).toEqual(sorted)
  })

  it('ranks a single category and keeps only its products', async () => {
    const ranked = await getTrendingRanked('carretes')
    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked.every((p) => p.typeFishing === 'carretes')).toBe(true)
  })
})
