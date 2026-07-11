import { beforeAll, describe, it, expect } from 'vitest'
import { getRoundup, roundupSlugs, getRoundupPreviews, ROUNDUP_YEAR } from '@/lib/roundups'

beforeAll(() => {
  delete process.env.DATABASE_URL
})

describe('roundups (programmatic SEO)', () => {
  it('lists slugs that have products', async () => {
    const slugs = await roundupSlugs()
    expect(slugs.length).toBeGreaterThan(0)
  })

  it('builds a complete roundup for a populated category', async () => {
    const slugs = await roundupSlugs()
    const r = await getRoundup(slugs[0])
    expect(r).not.toBeNull()
    if (!r) return
    expect(r.h1).toContain(String(ROUNDUP_YEAR))
    expect(r.items.length).toBeGreaterThan(0)
    expect(r.items.length).toBeLessThanOrEqual(8)
    // ranks are sequential from 1
    expect(r.items.map((i) => i.rank)).toEqual(r.items.map((_, i) => i + 1))
    expect(r.faq.length).toBe(3)
    expect(r.howToChoose.length).toBeGreaterThan(0)
    expect(r.metaDescription.length).toBeLessThanOrEqual(160)
  })

  it('returns null for an unknown slug', async () => {
    expect(await getRoundup('no-such-category')).toBeNull()
  })

  it('produces hub previews with cover + count', async () => {
    const previews = await getRoundupPreviews()
    expect(previews.length).toBeGreaterThan(0)
    expect(previews.every((p) => p.cover && p.count > 0)).toBe(true)
  })
})
