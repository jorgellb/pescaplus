import { describe, it, expect } from 'vitest'
import { buildGoogleFeed, buildMetaFeed } from '@/lib/feeds'
import { withProductDefaults } from '@/lib/catalog'
import type { Product } from '@/types'

const products: Product[] = [
  withProductDefaults({
    id: 'carrete-x',
    sku: '1005001',
    title: 'Carrete de Spinning <Pro> "2500"',
    description: 'Un **carrete** con [enlace](https://x).',
    imageUrl: 'https://img/a.jpg',
    images: ['https://img/a.jpg', 'https://img/b.jpg'],
    price: 12.75,
    currency: 'EUR',
    affiliateUrl: 'https://s.click.aliexpress.com/x',
    category: 'fishing',
    typeFishing: 'carretes',
    rating: 4.7,
    reviews: 100,
    inStock: true,
  }),
]

describe('buildGoogleFeed', () => {
  const xml = buildGoogleFeed(products, 'https://pescaplus.com')
  it('is a valid RSS feed with the g: namespace', () => {
    expect(xml).toContain('<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">')
    expect(xml).toContain('<g:id>carrete-x</g:id>')
    expect(xml).toContain('<g:price>12.75 EUR</g:price>')
    expect(xml).toContain('<g:availability>in_stock</g:availability>')
    expect(xml).toContain('<g:link>https://pescaplus.com/products/carrete-x</g:link>')
    expect(xml).toContain('<g:additional_image_link>https://img/b.jpg</g:additional_image_link>')
  })
  it('escapes XML special characters in the title', () => {
    expect(xml).toContain('&lt;Pro&gt;')
    expect(xml).not.toContain('<Pro>')
  })
})

describe('buildMetaFeed', () => {
  const csv = buildMetaFeed(products, 'https://pescaplus.com')
  const lines = csv.split('\n')
  it('has a header and one quoted row', () => {
    expect(lines[0]).toContain('"id","title","description"')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('"carrete-x"')
    expect(lines[1]).toContain('"12.75 EUR"')
    expect(lines[1]).toContain('"in stock"')
  })
  it('escapes embedded quotes by doubling them', () => {
    expect(lines[1]).toContain('""2500""')
  })
})
