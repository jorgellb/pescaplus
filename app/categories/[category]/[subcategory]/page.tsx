import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import ProductCard from '@/components/ProductCard'
import CategoryIcon from '@/components/graphics/CategoryIcon'
import { getFishingType, isValidSubcategory } from '@/lib/fishing'
import { listProducts } from '@/lib/products-store'
import { getTrendingRanked } from '@/lib/trending'
import { getTaxonomy, categoryName, subcategoriesOf } from '@/lib/taxonomy-store'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'

type Params = { params: Promise<{ category: string; subcategory: string }> }

// ISR: pre-render every subcategory that has products, refresh hourly.
export const revalidate = 3600

export async function generateStaticParams() {
  const products = await listProducts()
  const seen = new Set<string>()
  const params: { category: string; subcategory: string }[] = []
  for (const p of products) {
    for (const cat of p.categories) {
      for (const sub of p.subcategories) {
        if (!isValidSubcategory(cat, sub)) continue
        const key = `${cat}/${sub}`
        if (seen.has(key)) continue
        seen.add(key)
        params.push({ category: cat, subcategory: sub })
      }
    }
  }
  return params
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category, subcategory } = await params
  const tax = await getTaxonomy()
  const cat = categoryName(tax, category)
  const sub = subcategoriesOf(tax, category).find((s) => s.id === subcategory)
  if (!getFishingType(category) || !sub) return {}
  const url = `/categories/${category}/${subcategory}`
  return {
    title: `${sub.name} · ${cat}`,
    description:
      `${sub.name} para ${cat.toLowerCase()}: los mejores modelos seleccionados al mejor precio, con envío rápido. Compra ${sub.name.toLowerCase()} en PescaPlus.`.slice(0, 160),
    alternates: { canonical: url },
    openGraph: { title: `${sub.name} · ${cat}`, url, type: 'website' },
  }
}

export default async function SubcategoryPage({ params }: Params) {
  const { category, subcategory } = await params
  const fishingType = getFishingType(category)
  if (!fishingType) notFound()

  const [ranked, tax] = await Promise.all([getTrendingRanked(category), getTaxonomy()])
  const catName = categoryName(tax, category)
  const subs = subcategoriesOf(tax, category)
  const sub = subs.find((s) => s.id === subcategory)
  if (!sub) notFound()

  const products = ranked.filter((p) => p.subcategories.includes(subcategory))
  const description = `${sub.name} para ${catName.toLowerCase()}. ${fishingType.tagline} Encuentra el modelo ideal al mejor precio y con envío rápido.`

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: catName, url: `${SITE_URL}/categories/${category}` },
    { name: sub.name },
  ])

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
            <Link href={`/categories/${category}`} className="hover:text-accent">{catName}</Link>{' '}
            <span className="mx-1">/</span> <span className="text-ink">{sub.name}</span>
          </nav>
          <div className="flex items-center gap-5">
            <span className="inline-flex flex-shrink-0 text-ink p-4 border border-ink/15 rounded-xl shadow-hard bg-paper">
              <CategoryIcon id={fishingType.id} className="w-10 h-10" strokeWidth={1.6} />
            </span>
            <div className="min-w-0">
              <h1 className="font-display uppercase text-[1.7rem] sm:text-4xl md:text-5xl leading-[1.05] text-ink break-words">{sub.name}</h1>
              <p className="text-ink/60 text-sm md:text-base mt-2 max-w-2xl">{description}</p>
            </div>
          </div>
          <Link href={`/categories/${category}`} className="inline-block mt-5 font-mono text-xs font-bold uppercase tracking-widest text-accent hover:underline">
            ← Ver toda la categoría {catName}
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        {/* Sibling subcategories (real pages) */}
        {subs.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center font-mono text-[11px] font-bold uppercase tracking-widest text-ink/40 mr-1">Subcategorías:</span>
            <Link href={`/categories/${category}`} className="px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-tight border border-ink/15 rounded-full text-ink hover:bg-ink hover:text-paper transition-colors">Todas</Link>
            {subs.map((s) => (
              <Link
                key={s.id}
                href={`/categories/${category}/${s.id}`}
                className={`px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-tight border rounded-full transition-colors ${
                  s.id === subcategory ? 'bg-ink text-paper border-ink' : 'border-ink/15 text-ink hover:bg-ink hover:text-paper'
                }`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        )}

        <p className="font-mono text-xs uppercase tracking-widest text-ink/60">
          <span className="font-bold text-ink">{products.length}</span> {products.length === 1 ? 'producto' : 'productos'}
        </p>

        {products.length === 0 ? (
          <div className="text-center py-16 border border-ink/15 rounded-xl shadow-hard bg-paper max-w-lg mx-auto px-8 space-y-4">
            <span className="inline-block text-5xl">⚓</span>
            <h2 className="font-display uppercase text-2xl text-ink">Sin productos por ahora</h2>
            <p className="text-sm text-ink/60">Vuelve pronto o explora el resto de la categoría.</p>
            <Link href={`/categories/${category}`} className="inline-block bg-ink text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide border border-ink/15 rounded-xl hover:bg-accent transition-colors">
              Ver {catName}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}
