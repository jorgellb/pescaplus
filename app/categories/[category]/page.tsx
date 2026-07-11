import Link from 'next/link'
import Layout from '@/components/Layout'
import CategoryIcon from '@/components/graphics/CategoryIcon'
import CategoryBrowser from './CategoryBrowser'
import { FISHING_TYPES, getFishingType } from '@/lib/fishing'
import { getTrendingRanked } from '@/lib/trending'
import { getTaxonomy, categoryName, subcategoriesOf } from '@/lib/taxonomy-store'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'

type Params = { params: Promise<{ category: string }> }

// ISR: pre-render every category, refresh hourly (+ on-demand on admin edits).
export const revalidate = 3600

export function generateStaticParams() {
  return FISHING_TYPES.map((t) => ({ category: t.id }))
}

export default async function CategoryPage({ params }: Params) {
  const { category } = await params
  const fishingType = getFishingType(category)
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
            <span className="text-ink">{catName}</span>
          </nav>
          <div className="flex items-center gap-5">
            {fishingType && (
              <span className="inline-flex flex-shrink-0 text-ink p-4 border border-ink/15 rounded-xl shadow-hard bg-paper">
                <CategoryIcon id={fishingType.id} className="w-10 h-10" strokeWidth={1.6} />
              </span>
            )}
            <div>
              <h1 className="font-display uppercase text-5xl md:text-6xl leading-none text-ink">{catName}</h1>
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
