import type { MetadataRoute } from 'next'
import { FISHING_TYPES, isValidSubcategory } from '@/lib/fishing'
import { listProducts } from '@/lib/products-store'
import { listGuides } from '@/lib/guides-store'
import { roundupSlugs } from '@/lib/roundups'
import { FISHING_SPOTS } from '@/lib/fishing-spots'
import { SEA_SPECIES } from '@/lib/fishing-species'
import { allSpeciesZonePairs } from '@/lib/species-zones'

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://pescaplus.es'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/mejores`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/mejores-horas`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/donde-pescar`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/diario`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/quedadas`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${base}/calendario`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/especies`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/guias`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/advice`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contacto`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/aviso-legal`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/privacidad`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = FISHING_TYPES.map((t) => ({
    url: `${base}/categories/${t.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const speciesRoutes: MetadataRoute.Sitemap = SEA_SPECIES.map((sp) => ({
    url: `${base}/especies/${sp.id}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  const spotRoutes: MetadataRoute.Sitemap = FISHING_SPOTS.map((s) => ({
    url: `${base}/mejores-horas/${s.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.6,
  }))

  // Species × zone landing mesh ("pescar lubina en Cádiz"): ~1.1k pages.
  const speciesZoneRoutes: MetadataRoute.Sitemap = allSpeciesZonePairs().map(({ especie, zona }) => ({
    url: `${base}/pesca/${especie}/${zona}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.55,
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
  let subcategoryRoutes: MetadataRoute.Sitemap = []
  try {
    const products = await listProducts()
    productRoutes = products.map((p) => ({
      url: `${base}/products/${p.id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))
    const seen = new Set<string>()
    for (const p of products) {
      for (const cat of p.categories) {
        for (const sub of p.subcategories) {
          if (!isValidSubcategory(cat, sub)) continue
          const key = `${cat}/${sub}`
          if (seen.has(key)) continue
          seen.add(key)
          subcategoryRoutes.push({
            url: `${base}/categories/${cat}/${sub}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.75,
          })
        }
      }
    }
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

  return [...staticRoutes, ...categoryRoutes, ...speciesRoutes, ...spotRoutes, ...speciesZoneRoutes, ...subcategoryRoutes, ...roundupRoutes, ...productRoutes, ...guideRoutes]
}
