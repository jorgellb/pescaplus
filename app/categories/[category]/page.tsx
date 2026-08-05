import Link from 'next/link'
import { notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import CategoryIcon from '@/components/graphics/CategoryIcon'
import CategoryBrowser from './CategoryBrowser'
import { FISHING_TYPES, getFishingType } from '@/lib/fishing'
import { getTrendingRanked } from '@/lib/trending'
import { getTaxonomy, categoryName, subcategoriesOf } from '@/lib/taxonomy-store'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'
import { safeJsonLd } from '@/lib/json-ld'

type Params = { params: Promise<{ category: string }> }

// ISR: pre-render every category, refresh hourly (+ on-demand on admin edits).
export const revalidate = 3600

/**
 * Las modalidades son una lista fija del código (`FISHING_TYPES`), así que una
 * categoría que no salga de `generateStaticParams` no existe y debe dar un 404
 * de verdad.
 *
 * Tiene que ser `dynamicParams = false` y NO un `notFound()` en la página. Se
 * probaron las dos: con `notFound()`, Next PRERENDERIZA Y CACHEA la respuesta
 * como una entrada normal de 200. O sea, un "soft 404" que Google puede indexar
 * como página real de la tienda, y además un rastreador que pida URLs
 * inventadas va llenando el disco con una entrada por cada una.
 *
 * OJO AL EFECTO SECUNDARIO, que tumbó la tienda entera en producción: esta
 * bandera significa «fuera de esta lista no hay nada que servir», así que
 * cuando la copia prerenderizada CADUCA, Next no encuentra ningún respaldo que
 * mostrar mientras regenera y responde `NoFallbackError` — un 404 para TODAS
 * las categorías, incluidas las buenas. Pasó al poner `expireTime` igual al
 * `revalidate` (3600), con lo que la entrada caducaba en el mismo instante en
 * que quedaba obsoleta, sin margen ninguno.
 *
 * Regla, vigilada por tests/routing.test.ts: una página con esta bandera NUNCA
 * puede tener `expireTime` <= su `revalidate`.
 */
export function generateStaticParams() {
  return FISHING_TYPES.map((t) => ({ category: t.id }))
}

export default async function CategoryPage({ params }: Params) {
  const { category } = await params
  const fishingType = getFishingType(category)
  // Categoría inventada: 404 de verdad, antes de tocar la base de datos.
  if (!fishingType) notFound()
  const [products, taxonomy] = await Promise.all([getTrendingRanked(category), getTaxonomy()])
  const catName = categoryName(taxonomy, category)
  const subcategories = subcategoriesOf(taxonomy, category)
  const categoryDescription = fishingType?.tagline ?? 'Los mejores aparejos para tus salidas de pesca.'

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: catName },
  ])

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <section className="bg-paper border-b border-ink/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/60 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
            <span className="text-ink">{catName}</span>
          </nav>
          <div className="flex items-center gap-5">
            {fishingType && (
              <span className="inline-flex flex-shrink-0 text-ink p-4 border border-ink/10 rounded-xl shadow-hard bg-paper">
                <CategoryIcon id={fishingType.id} className="w-10 h-10" strokeWidth={1.6} />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="font-display uppercase text-[1.7rem] sm:text-4xl md:text-6xl leading-[1.05] text-ink break-words">{catName}</h1>
              <p className="text-ink/60 text-sm md:text-base mt-2 max-w-xl">{categoryDescription}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <CategoryBrowser category={category} initialProducts={products} subcategories={subcategories} />
      </section>
    </Layout>
  )
}
