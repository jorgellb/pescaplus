import type { MetadataRoute } from 'next'
import { FISHING_TYPES } from '@/lib/fishing'
import { listProducts } from '@/lib/products-store'
import { listGuides } from '@/lib/guides-store'
import { roundupSlugs } from '@/lib/roundups'

const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/mejores`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/guias`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/advice`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = FISHING_TYPES.map((t) => ({
    url: `${base}/categories/${t.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  let roundupRoutes: MetadataRoute.Sitemap = []
  try {
    const slugs = await roundupSlugs()
    roundupRoutes = slugs.map((slug) => ({
      url: `${base}/mejores/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.75,
    }))
  } catch {
    /* store unavailable — ship the rest */
  }

  let productRoutes: MetadataRoute.Sitemap = []
  try {
    const products = await listProducts()
    productRoutes = products.map((p) => ({
      url: `${base}/products/${p.id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))
  } catch {
    /* store unavailable — ship static + category routes only */
  }

  let guideRoutes: MetadataRoute.Sitemap = []
  try {
    const guides = await listGuides({ publishedOnly: true })
    guideRoutes = guides.map((g) => ({
      url: `${base}/guias/${g.id}`,
      lastModified: new Date(g.updatedAt),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))
  } catch {
    /* guides store unavailable */
  }

  return [...staticRoutes, ...categoryRoutes, ...roundupRoutes, ...productRoutes, ...guideRoutes]
}
