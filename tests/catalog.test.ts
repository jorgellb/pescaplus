import { describe, it, expect } from 'vitest'
import { filterProducts, slugify, withProductDefaults } from '@/lib/catalog'
import type { Product } from '@/types'

function make(partial: Partial<Product>): Product {
  return withProductDefaults({
    id: partial.id ?? 'x',
    aliexpressId: 'a',
    title: partial.title ?? 'Producto',
    description: partial.description ?? '',
    imageUrl: partial.imageUrl ?? 'https://img/x.jpg',
    price: partial.price ?? 10,
    currency: 'EUR',
    affiliateUrl: 'https://ali',
    category: 'fishing',
    typeFishing: partial.typeFishing ?? 'canas',
    rating: partial.rating ?? 4,
    reviews: 0,
    inStock: true,
  })
}

describe('slugify', () => {
  it('creates url-safe slugs and strips accents', () => {
    expect(slugify('Caña de Pesca Ñandú')).toBe('cana-de-pesca-nandu')
    expect(slugify('   ')).toBe('producto')
  })
})

describe('withProductDefaults', () => {
  it('fills media and SEO defaults', () => {
    const p = make({ imageUrl: 'https://img/a.jpg' })
    expect(p.images).toEqual(['https://img/a.jpg'])
    expect(p.imageAlts).toEqual([])
    expect(p.videoUrl).toBe('')
    expect(p.seoTitle).toBe('')
    expect(typeof p.aiOptimized).toBe('boolean')
  })
})

describe('filterProducts', () => {
  const items = [
    make({ id: '1', title: 'Caña de Carbono', typeFishing: 'canas' }),
    make({ id: '2', title: 'Carrete Spinning', typeFishing: 'carretes' }),
    make({ id: '3', title: 'Señuelo Minnow', typeFishing: 'senuelos' }),
  ]

  it('filters by modality', () => {
    expect(filterProducts(items, { typeFishing: 'carretes' }).map((p) => p.id)).toEqual(['2'])
  })

  it('search is case- and accent-insensitive', () => {
    expect(filterProducts(items, { search: 'cana' }).map((p) => p.id)).toEqual(['1'])
    expect(filterProducts(items, { search: 'SEÑUELO' }).map((p) => p.id)).toEqual(['3'])
  })

  it('matches all whitespace-separated terms', () => {
    expect(filterProducts(items, { search: 'carrete spinning' }).map((p) => p.id)).toEqual(['2'])
    expect(filterProducts(items, { search: 'carrete carbono' })).toHaveLength(0)
  })

  it('returns all when no filter', () => {
    expect(filterProducts(items)).toHaveLength(3)
  })
})
