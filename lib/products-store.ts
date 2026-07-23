import type { Product } from '@/types'
import { CATALOG, slugify, filterProducts, type ProductFilter } from '@/lib/catalog'
import { decodeEntities } from '@/lib/text'

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
  imageUrl?: string
  images?: string[]
  imageAlts?: string[]
  videoUrl?: string
  price: number
  currency?: string
  affiliateUrl: string
  category?: string
  typeFishing: string
  categories?: string[]
  subcategory?: string
  subcategories?: string[]
  rating?: number
  reviews?: number
  inStock?: boolean
  seoTitle?: string
  seoDescription?: string
  aiOptimized?: boolean
  sku?: string
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
  // Build (image, alt) pairs, keep the primary first, drop empties and duplicates
  // while keeping alt text aligned with its image.
  const rawImages = [...(input.images ?? [])]
  const primary = input.imageUrl?.trim()
  if (primary && !rawImages.map((s) => s.trim()).includes(primary)) rawImages.unshift(primary)

  const seen = new Set<string>()
  const gallery: string[] = []
  const alts: string[] = []
  rawImages.forEach((img, i) => {
    const url = (img ?? '').trim()
    if (!url || seen.has(url)) return
    seen.add(url)
    gallery.push(url)
    alts.push((input.imageAlts?.[i] ?? '').trim())
  })

  const description = input.description.trim()
  const title = input.title.trim()
  return {
    id,
    sku: input.sku?.trim() || id,
    title,
    description,
    imageUrl: gallery[0] ?? '',
    images: gallery,
    imageAlts: alts,
    videoUrl: input.videoUrl?.trim() || '',
    price: Number(input.price) || 0,
    currency: input.currency?.trim() || 'EUR',
    affiliateUrl: input.affiliateUrl.trim(),
    category: input.category?.trim() || 'fishing',
    typeFishing: input.typeFishing,
    // Ensure the primary category is always part of the categories set (deduped).
    categories: [...new Set([input.typeFishing, ...(input.categories ?? [])].filter(Boolean))],
    subcategory: (input.subcategories?.filter(Boolean)[0] ?? input.subcategory ?? '').trim(),
    subcategories: [...new Set((input.subcategories?.length ? input.subcategories : (input.subcategory ? [input.subcategory] : [])).filter(Boolean))],
    rating: input.rating ?? 0,
    reviews: input.reviews ?? 0,
    inStock: input.inStock ?? true,
    seoTitle: input.seoTitle?.trim() || '',
    seoDescription: input.seoDescription?.trim() || description.slice(0, 160),
    aiOptimized: input.aiOptimized ?? false,
  }
}

/**
 * READ helper. When no database is configured we use the in-memory store (local
 * dev / demos). When a database IS configured but the read fails, we degrade to
 * memory so the public site keeps serving the base catalog instead of 500-ing.
 */
async function withDb<T>(op: (prisma: any) => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  if (!isDatabaseConfigured()) return fallback()
  try {
    const { prisma } = await import('@/lib/prisma')
    await ensureSeeded(prisma)
    return await op(prisma)
  } catch (error) {
    console.warn('Database read failed, using in-memory store instead:', error)
    return fallback()
  }
}

/**
 * WRITE helper. Critically different from `withDb`: when a database is
 * configured but the write fails (e.g. Neon quota exhausted, connection down),
 * we DO NOT silently fall back to the volatile in-memory store — that store is
 * wiped on the next cold start, so a "successful" save would be lost. Instead
 * we throw, so the admin sees a real error and nothing is lost silently.
 * The in-memory path is used only when no database is configured at all.
 */
async function withDbWrite<T>(op: (prisma: any) => Promise<T>, memory: () => T | Promise<T>): Promise<T> {
  if (!isDatabaseConfigured()) return memory()
  const { prisma } = await import('@/lib/prisma')
  await ensureSeeded(prisma)
  try {
    return await op(prisma)
  } catch (error) {
    console.error('Database write failed — NOT falling back to memory to avoid silent data loss:', error)
    throw new Error('La base de datos no está disponible ahora mismo; el cambio no se ha guardado. Inténtalo de nuevo en unos minutos.')
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
    sku: row.sku,
    title: decodeEntities(row.title),
    description: decodeEntities(row.description),
    imageUrl: row.imageUrl,
    images: row.images?.length ? row.images : [row.imageUrl].filter(Boolean),
    imageAlts: (row.imageAlts ?? []).map(decodeEntities),
    videoUrl: row.videoUrl ?? '',
    price: row.price,
    currency: row.currency,
    affiliateUrl: row.affiliateUrl,
    category: row.category,
    typeFishing: row.typeFishing,
    categories: row.categories?.length ? row.categories : [row.typeFishing],
    subcategory: row.subcategory ?? (row.subcategories?.[0] ?? ''),
    subcategories: row.subcategories?.length ? row.subcategories : (row.subcategory ? [row.subcategory] : []),
    rating: row.rating,
    reviews: row.reviews,
    inStock: row.inStock,
    seoTitle: decodeEntities(row.seoTitle ?? ''),
    seoDescription: decodeEntities(row.seoDescription || row.description?.slice(0, 160) || ''),
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
  return withDbWrite(
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
  return withDbWrite(
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
  return withDbWrite(
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
  return withDbWrite(
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
