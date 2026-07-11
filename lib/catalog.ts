import type { Product } from '@/types'
import { CATALOG_SEED } from '@/lib/catalog-data'
import { decodeEntities } from '@/lib/text'

/**
 * Catalog logic. The product data lives in `catalog-data.ts`, which is generated
 * from real AliExpress products with AI-written SEO copy (see scripts/gen-catalog).
 * This keeps generated data separate from the query helpers below.
 */

type SeedOptional = 'images' | 'imageAlts' | 'videoUrl' | 'seoTitle' | 'seoDescription' | 'aiOptimized' | 'subcategory'
export type CatalogSeed = Omit<Product, SeedOptional> & Partial<Pick<Product, SeedOptional>>

/** Fill media/SEO defaults so catalog seeds satisfy the full Product shape. */
export function withProductDefaults(p: CatalogSeed): Product {
  const images = p.images?.length ? p.images : [p.imageUrl].filter(Boolean)
  return {
    ...p,
    title: decodeEntities(p.title),
    description: decodeEntities(p.description),
    subcategory: p.subcategory ?? '',
    images,
    imageAlts: (p.imageAlts?.length ? p.imageAlts : []).map(decodeEntities),
    videoUrl: p.videoUrl ?? '',
    seoTitle: decodeEntities(p.seoTitle ?? ''),
    seoDescription: decodeEntities(p.seoDescription || p.description.slice(0, 160)),
    aiOptimized: p.aiOptimized ?? false,
  }
}

export const CATALOG: readonly Product[] = CATALOG_SEED.map(withProductDefaults)

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Build a URL-safe, human-readable id from a product title. */
export function slugify(title: string): string {
  const base = normalizeText(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
  return base || 'producto'
}

export interface ProductFilter {
  search?: string
  typeFishing?: string
}

/**
 * Pure product filter: optional modality scope plus a case/diacritic-insensitive
 * search across title and description that matches every whitespace-separated term.
 */
export function filterProducts(products: Product[], filter: ProductFilter = {}): Product[] {
  let result = products
  if (filter.typeFishing) {
    result = result.filter((p) => p.typeFishing === filter.typeFishing)
  }

  const terms = filter.search ? normalizeText(filter.search).split(/\s+/).filter(Boolean) : []
  if (terms.length === 0) return result

  return result.filter((product) => {
    const haystack = normalizeText(`${product.title} ${product.description}`)
    return terms.every((term) => haystack.includes(term))
  })
}
