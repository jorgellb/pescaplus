import { beforeAll, describe, it, expect } from 'vitest'
import { recordClick, getClickStats } from '@/lib/clicks-store'

beforeAll(() => {
  delete process.env.DATABASE_URL
})

describe('clicks store (in-memory)', () => {
  it('records clicks and aggregates by product, category and day', async () => {
    const before = (await getClickStats()).total

    await recordClick({ productId: 'p1', productTitle: 'Prod 1', typeFishing: 'canas' })
    await recordClick({ productId: 'p1', productTitle: 'Prod 1', typeFishing: 'canas' })
    await recordClick({ productId: 'p2', productTitle: 'Prod 2', typeFishing: 'carretes' })

    const stats = await getClickStats()
    expect(stats.total).toBe(before + 3)
    expect(stats.byProduct.find((p) => p.productId === 'p1')?.count).toBe(2)
    expect(stats.byCategory.find((c) => c.typeFishing === 'canas')?.count).toBeGreaterThanOrEqual(2)
    expect(stats.byDay).toHaveLength(14)
    // most recent day bucket includes today's clicks
    expect(stats.byDay[stats.byDay.length - 1].count).toBeGreaterThanOrEqual(3)
  })
})
