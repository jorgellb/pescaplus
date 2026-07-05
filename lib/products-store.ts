import type { Product } from '@/types'
import { CATALOG, slugify, filterProducts, type ProductFilter } from '@/lib/catalog'

/**
 * Mutable product repository used by both the public site and the admin backend.
 *
 * Backends:
 *  - **Database** (Prisma/Neon) when `DATABASE_URL` is configured — real, shared
 *    persistence for production. Seeded from the catalog on first use.
 *  - **In-memory** otherwise — the app is fully usable (browse + admin CRUD) with
 *    zero configuration. Changes live for the lifetime of the server process, so
 *    it's ideal for local development and demos.
 *
 * Every database call is wrapped so a misconfigured/unreachable DB degrades to the
 * in-memory store instead of taking the whole app down.
 */

export type ProductInput = {
  title: string
  description: string
  imageUrl: string
  images?: string[]
  videoUrl?: string
  price: number
  currency?: string
  affiliateUrl: string
  category?: string
  typeFishing: string
  rating?: number
  reviews?: number
  inStock?: boolean
  seoDescription?: string
  aiOptimized?: boolean
  aliexpressId?: string
}

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL
  return Boolean(
    url &&
      /^postgres(ql)?:\/\//.test(url) &&
      !url.includes('user:password@host') &&
      !url.includes('dbname'),
  )
}

// ---------------------------------------------------------------------------
// In-memory backend (default)
// ---------------------------------------------------------------------------

const globalForStore = globalThis as unknown as {
  __pescaplusProducts?: Map<string, Product>
}

function memoryStore(): Map<string, Product> {
  if (!globalForStore.__pescaplusProducts) {
    globalForStore.__pescaplusProducts = new Map(CATALOG.map((p) => [p.id, { ...p }]))
  }
  return globalForStore.__pescaplusProducts
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueId(base: string, exists: (id: string) => boolean): string {
  let id = base
  let n = 2
  while (exists(id)) {
    id = `${base}-${n++}`
  }
  return id
}

function applyInput(input: ProductInput, id: string): Product {
  const imageUrl = input.imageUrl.trim()
  const images = (input.images ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
  // Ensure the primary image is first and images are unique.
  const gallery = Array.from(new Set([imageUrl, ...images].filter(Boolean)))
  const description = input.description.trim()
  return {
    id,
    aliexpressId: input.aliexpressId?.trim() || id,
    title: input.title.trim(),
    description,
    imageUrl,
    images: gallery,
    videoUrl: input.videoUrl?.trim() || '',
    price: Number(input.price) || 0,
    currency: input.currency?.trim() || 'EUR',
    affiliateUrl: input.affiliateUrl.trim(),
    category: input.category?.trim() || 'fishing',
    typeFishing: input.typeFishing,
    rating: input.rating ?? 0,
    reviews: input.reviews ?? 0,
    inStock: input.inStock ?? true,
    seoDescription: input.seoDescription?.trim() || description.slice(0, 160),
    aiOptimized: input.aiOptimized ?? false,
  }
}

async function withDb<T>(op: (prisma: any) => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  if (!isDatabaseConfigured()) return fallback()
  try {
    const { prisma } = await import('@/lib/prisma')
    await ensureSeeded(prisma)
    return await op(prisma)
  } catch (error) {
    console.warn('Database operation failed, using in-memory store instead:', error)
    return fallback()
  }
}

let seeded = false
async function ensureSeeded(prisma: any): Promise<void> {
  if (seeded) return
  const count = await prisma.product.count()
  if (count === 0) {
    for (const p of CATALOG) {
      await prisma.product.create({ data: { ...p } })
    }
  }
  seeded = true
}

function toProduct(row: any): Product {
  return {
    id: row.id,
    aliexpressId: row.aliexpressId,
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl,
    images: row.images?.length ? row.images : [row.imageUrl].filter(Boolean),
    videoUrl: row.videoUrl ?? '',
    price: row.price,
    currency: row.currency,
    affiliateUrl: row.affiliateUrl,
    category: row.category,
    typeFishing: row.typeFishing,
    rating: row.rating,
    reviews: row.reviews,
    inStock: row.inStock,
    seoDescription: row.seoDescription || row.description?.slice(0, 160) || '',
    aiOptimized: row.aiOptimized ?? false,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function listProducts(filter: ProductFilter = {}): Promise<Product[]> {
  const all = await withDb(
    async (prisma) => (await prisma.product.findMany({ orderBy: { title: 'asc' } })).map(toProduct),
    () => Array.from(memoryStore().values()),
  )
  return filterProducts(all, filter)
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return withDb(
    async (prisma) => {
      const row = await prisma.product.findUnique({ where: { id } })
      return row ? toProduct(row) : undefined
    },
    () => memoryStore().get(id),
  )
}

export async function createProduct(input: ProductInput): Promise<Product> {
  return withDb(
    async (prisma) => {
      const id = uniqueId(slugify(input.title), () => false)
      // Rely on the DB unique constraint; retry with a suffixed id on collision.
      let product = applyInput(input, id)
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const row = await prisma.product.create({ data: { ...product } })
          return toProduct(row)
        } catch {
          product = applyInput(input, `${id}-${Date.now().toString(36)}`)
        }
      }
      throw new Error('Could not create product')
    },
    () => {
      const store = memoryStore()
      const id = uniqueId(slugify(input.title), (candidate) => store.has(candidate))
      const product = applyInput(input, id)
      store.set(id, product)
      return product
    },
  )
}

export async function updateProduct(
  id: string,
  patch: Partial<ProductInput>,
): Promise<Product | undefined> {
  return withDb(
    async (prisma) => {
      const existing = await prisma.product.findUnique({ where: { id } })
      if (!existing) return undefined
      const merged = applyInput({ ...toProduct(existing), ...patch } as ProductInput, id)
      const row = await prisma.product.update({ where: { id }, data: { ...merged } })
      return toProduct(row)
    },
    () => {
      const store = memoryStore()
      const existing = store.get(id)
      if (!existing) return undefined
      const merged = applyInput({ ...existing, ...patch } as ProductInput, id)
      store.set(id, merged)
      return merged
    },
  )
}

export async function deleteProduct(id: string): Promise<boolean> {
  return withDb(
    async (prisma) => {
      try {
        await prisma.product.delete({ where: { id } })
        return true
      } catch {
        return false
      }
    },
    () => memoryStore().delete(id),
  )
}

/** Reset the store back to the shipped catalog (admin "danger zone"). */
export async function resetToCatalog(): Promise<number> {
  return withDb(
    async (prisma) => {
      await prisma.product.deleteMany({})
      for (const p of CATALOG) await prisma.product.create({ data: { ...p } })
      return CATALOG.length
    },
    () => {
      globalForStore.__pescaplusProducts = new Map(CATALOG.map((p) => [p.id, { ...p }]))
      return CATALOG.length
    },
  )
}

export async function countProducts(): Promise<number> {
  return (await listProducts()).length
}

export function activeBackend(): 'database' | 'memory' {
  return isDatabaseConfigured() ? 'database' : 'memory'
}
