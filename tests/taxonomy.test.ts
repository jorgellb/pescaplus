import { beforeAll, describe, it, expect } from 'vitest'
import { getTaxonomy, saveTaxonomy, sanitizeOverride } from '@/lib/taxonomy-store'
import { FISHING_TYPE_IDS } from '@/lib/fishing'
import { filterProducts, withProductDefaults } from '@/lib/catalog'

beforeAll(() => {
  delete process.env.DATABASE_URL
})

describe('taxonomy store', () => {
  it('resolves all categories with default names + subcategories', async () => {
    const tax = await getTaxonomy()
    expect(tax.length).toBe(FISHING_TYPE_IDS.length)
    const carretes = tax.find((c) => c.id === 'carretes')
    expect(carretes?.name).toBe('Carretes de pesca')
    expect(carretes?.subcategories.length).toBeGreaterThan(0)
  })

  it('applies renames and subcategory edits (in-memory)', async () => {
    await saveTaxonomy({
      names: { carretes: 'Carretes y bobinas' },
      subs: { carretes: [{ id: 'spinning', name: 'Spinning' }, { id: 'nueva', name: 'Nueva sub' }] },
    })
    const tax = await getTaxonomy()
    const carretes = tax.find((c) => c.id === 'carretes')
    expect(carretes?.name).toBe('Carretes y bobinas')
    expect(carretes?.subcategories.map((s) => s.id)).toContain('nueva')
    // reset
    await saveTaxonomy({ names: {}, subs: {} })
  })

  it('sanitizes overrides: slugifies ids, drops empty names, ignores default-equal', () => {
    const clean = sanitizeOverride({
      names: { carretes: 'Carretes de pesca', lineas: '  Sedales  ' },
      subs: { anzuelos: [{ id: '', name: 'Anzuelos Circle!' }, { id: 'x', name: '' }] },
    })
    expect(clean.names.carretes).toBeUndefined() // equal to default -> dropped
    expect(clean.names.lineas).toBe('Sedales')
    expect(clean.subs.anzuelos).toEqual([{ id: 'anzuelos-circle', name: 'Anzuelos Circle!' }])
  })
})

describe('multi-category filtering', () => {
  const p = withProductDefaults({
    id: 'x', sku: 'x', title: 'Bolsa para carretes', description: 'funda',
    imageUrl: 'i', price: 10, currency: 'EUR', affiliateUrl: 'a', category: 'fishing',
    typeFishing: 'equipo', categories: ['equipo', 'carretes'], rating: 4, reviews: 1, inStock: true,
  })

  it('shows a product in every one of its categories', () => {
    expect(filterProducts([p], { typeFishing: 'equipo' })).toHaveLength(1)
    expect(filterProducts([p], { typeFishing: 'carretes' })).toHaveLength(1)
    expect(filterProducts([p], { typeFishing: 'anzuelos' })).toHaveLength(0)
  })
})
