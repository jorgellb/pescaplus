import type { MetadataRoute } from 'next'
import { FISHING_TYPES, isValidSubcategory } from '@/lib/fishing'
import { listProducts } from '@/lib/products-store'
import { listGuides } from '@/lib/guides-store'
import { roundupSlugs } from '@/lib/roundups'
import { FISHING_SPOTS } from '@/lib/fishing-spots'
import { SEA_SPECIES } from '@/lib/fishing-species'
import { FRESHWATER_SPECIES } from '@/lib/freshwater-species'
import { allSpeciesZonePairs } from '@/lib/species-zones'
import { getSpeciesGuide } from '@/lib/species-guides'
import { getZoneGuide } from '@/lib/zone-guides'

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://pescaplus.es'

/**
 * `lastmod` solo se pone cuando es VERDAD.
 *
 * Antes todas las URLs llevaban `lastModified: now`, la hora del build: 1.768
 * páginas anunciando que habían cambiado cada vez que se desplegaba. Google
 * documenta que un `lastmod` que no se corresponde con cambios reales acaba
 * ignorándose para TODO el sitio — y entonces deja de servir justo cuando de
 * verdad reescribes algo, que es el caso de las fichas de especie y de la malla.
 *
 * Tres casos, y ninguno inventa fechas:
 *
 *  1. Se sabe la fecha real  → se usa (guías de especie y de zona, artículos).
 *  2. Cambia de verdad a diario → `now` es cierto (previsión, quedadas, puntos).
 *  3. No se sabe → NO se pone. `lastModified` es opcional; omitirlo es una
 *     respuesta honrada, y Google se apaña con el resto de señales.
 *
 * El caso 3 cubre fichas de producto y categorías: la base de datos tiene
 * `updatedAt`, pero `listProducts()` no lo expone, y prefiero omitir el dato a
 * fabricarlo. Si algún día se expone, entra en el caso 1.
 */
function fechaDeGuia(iso: string | undefined): Date | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Solo para lo que cambia a diario de verdad.
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    // Cambian de verdad todos los días: la portada abre con las condiciones del
    // día, y las otras cuatro son previsión, quedadas y salidas.
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/mejores-horas`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/donde-pescar`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/quedadas`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${base}/charters`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },

    // Sin `lastmod`: cambian cuando se toca el contenido, y esa fecha no la sé.
    { url: `${base}/mejores`, changeFrequency: 'weekly', priority: 0.8 },
    // La carta cambia poco: sus fuentes son batimetría y balizamiento, no el
    // tiempo. Las variantes con zona canonican a esta, así que va una sola vez.
    { url: `${base}/carta`, changeFrequency: 'monthly', priority: 0.7 },
    // Índice de la malla especie × zona: prioridad de cabecera de sección.
    { url: `${base}/pesca`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/diario`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/calendario`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/especies`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/rio`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/guias`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/advice`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contacto`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/aviso-legal`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/privacidad`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/cookies`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = FISHING_TYPES.map((t) => ({
    url: `${base}/categories/${t.id}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Aquí sí hay fecha real: la de la guía escrita para cada especie.
  // Mar y agua dulce comparten la ruta /especies/[slug], así que van juntas.
  const speciesRoutes: MetadataRoute.Sitemap = [...SEA_SPECIES, ...FRESHWATER_SPECIES].map((sp) => ({
    url: `${base}/especies/${sp.id}`,
    lastModified: fechaDeGuia(getSpeciesGuide(sp.id)?.generatedAt),
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
  // Cada página mezcla la guía de la especie con la prosa de la zona, así que
  // su fecha es la más reciente de las dos.
  const speciesZoneRoutes: MetadataRoute.Sitemap = allSpeciesZonePairs().map(({ especie, zona }) => {
    const fechas = [
      fechaDeGuia(getSpeciesGuide(especie)?.generatedAt),
      fechaDeGuia(getZoneGuide(zona)?.generatedAt),
    ].filter((d): d is Date => d !== undefined)
    return {
      url: `${base}/pesca/${especie}/${zona}`,
      lastModified: fechas.length ? new Date(Math.max(...fechas.map((d) => d.getTime()))) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.55,
    }
  })

  let roundupRoutes: MetadataRoute.Sitemap = []
  try {
    const slugs = await roundupSlugs()
    roundupRoutes = slugs.map((slug) => ({
      url: `${base}/mejores/${slug}`,
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
