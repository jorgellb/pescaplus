import { beforeAll, describe, it, expect } from 'vitest'
import { createProduct, getProduct, updateProduct, deleteProduct, listProducts } from '@/lib/products-store'

// Force the in-memory backend (no DATABASE_URL) for deterministic tests.
beforeAll(() => {
  delete process.env.DATABASE_URL
})

describe('products store (in-memory)', () => {
  it('creates, reads, updates and deletes a product', async () => {
    const created = await createProduct({
      title: 'Test Vitest Product',
      description: 'desc',
      price: 9.9,
      typeFishing: 'canas',
      affiliateUrl: 'https://ali/x',
      images: ['https://img/a.jpg', 'https://img/b.jpg'],
      imageAlts: ['alt a', 'alt b'],
    })
    expect(created.id).toContain('test-vitest-product')
    expect(created.imageUrl).toBe('https://img/a.jpg')
    expect(created.images).toHaveLength(2)
    expect(created.imageAlts).toEqual(['alt a', 'alt b'])

    expect((await getProduct(created.id))?.title).toBe('Test Vitest Product')

    const updated = await updateProduct(created.id, { price: 19.9 })
    expect(updated?.price).toBe(19.9)

    expect((await listProducts()).some((p) => p.id === created.id)).toBe(true)

    expect(await deleteProduct(created.id)).toBe(true)
    expect(await getProduct(created.id)).toBeUndefined()
  })

  it('scopes listProducts by modality', async () => {
    const list = await listProducts({ typeFishing: 'carretes' })
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((p) => p.typeFishing === 'carretes')).toBe(true)
  })
})
