import { beforeAll, describe, it, expect } from 'vitest'
import { retrieveProducts } from '@/lib/retrieval'

beforeAll(() => {
  delete process.env.DATABASE_URL
})

describe('retrieveProducts (RAG)', () => {
  it('retrieves relevant products by keyword (capped at the limit)', async () => {
    const r = await retrieveProducts('carrete de spinning', 'carretes')
    expect(r.length).toBeGreaterThan(0)
    expect(r.length).toBeLessThanOrEqual(5)
  })

  it('falls back to popular products of the modality when nothing matches', async () => {
    const r = await retrieveProducts('zzzznoterm', 'canas')
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((p) => p.typeFishing === 'canas')).toBe(true)
  })
})
