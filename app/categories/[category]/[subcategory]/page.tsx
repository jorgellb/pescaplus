import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import ProductCard from '@/components/ProductCard'
import CategoryIcon from '@/components/graphics/CategoryIcon'
import { getFishingType, isValidSubcategory } from '@/lib/fishing'
import { listProducts } from '@/lib/products-store'
import { getTrendingRanked } from '@/lib/trending'
import { getTaxonomy, categoryName, subcategoriesOf, seoText, seoMeta } from '@/lib/taxonomy-store'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'
import { safeJsonLd } from '@/lib/json-ld'
import Icon from '@/components/icons/Icon'
import ExploraCategoria from '@/components/ExploraCategoria'
import { listGuides } from '@/lib/guides-store'
import { descripcionDeTipo, nombreDeTipo, resumenDeTipo, tipoSeo, tituloDeTipo } from '@/lib/seo-categorias'
import type { Product } from '@/types'

/** El precio más bajo de una lista, o null si no hay ninguno. */
function precioDesde(productos: Product[]): number | null {
  const precios = productos.map((p) => p.price).filter((n) => n > 0)
  return precios.length ? Math.min(...precios) : null
}

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
  if (!getFishingType(category) || !sub) return { robots: { index: false, follow: false } }
  const url = `/categories/${category}/${subcategory}`
  const [propio, ranked] = await Promise.all([
    // Meta propios desde el admin; si no hay, los generados con datos reales.
    seoMeta(category, subcategory),
    getTrendingRanked(category).catch((): Product[] => []),
  ])
  const productos = ranked.filter((p) => p.subcategories.includes(subcategory))
  const nombre = nombreDeTipo(category, sub, cat)
  /*
   * `title.absolute`: el layout de la categoría fija su propio título y eso
   * cortaba la plantilla del sitio, así que los tipos salían sin la marca
   * («Trenzado · Líneas de pesca»). Aquí el título se compone entero.
   */
  const titulo = propio.title ?? tituloDeTipo(nombre, productos.length, precioDesde(productos))
  const descripcion =
    propio.description ?? descripcionDeTipo(nombre, productos.length, precioDesde(productos), productos.slice(0, 2).map((p) => p.title))
  return {
    title: { absolute: titulo },
    description: descripcion,
    alternates: { canonical: url },
    // Un tipo que se ha quedado sin productos es una página vacía: fuera del
    // índice hasta que vuelva a tener, pero sus enlaces se siguen.
    ...(ranked.length > 0 && productos.length === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: titulo, description: descripcion, url, type: 'website' },
  }
}

export default async function SubcategoryPage({ params }: Params) {
  const { category, subcategory } = await params
  const fishingType = getFishingType(category)
  if (!fishingType) notFound()

  const [ranked, tax, guias] = await Promise.all([
    getTrendingRanked(category),
    getTaxonomy(),
    listGuides({ publishedOnly: true }).catch(() => []),
  ])
  const catName = categoryName(tax, category)
  const subs = subcategoriesOf(tax, category)
  const sub = subs.find((s) => s.id === subcategory)
  if (!sub) notFound()

  const products = ranked.filter((p) => p.subcategories.includes(subcategory))
  const cuantos = (id: string) => ranked.filter((p) => p.subcategories.includes(id)).length
  // Solo se enlazan los tipos con productos: uno vacío es una página sin nada
  // que Google indexaría como contenido pobre.
  const subsConProductos = subs.filter((s) => s.id === subcategory || cuantos(s.id) > 0)
  const nombre = nombreDeTipo(category, sub, catName)
  const tipo = tipoSeo(category, subcategory)
  const desde = precioDesde(products)
  const description = products.length ? `${resumenDeTipo(products.length, desde)}. ${fishingType.tagline}` : fishingType.tagline
  // El texto del admin manda; si no hay, la guía escrita para este tipo.
  const texto = (await seoText(category, subcategory)) || tipo?.guia || ''

  const listadoLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: nombre,
    url: `${SITE_URL}/categories/${category}/${subcategory}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.slice(0, 30).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/products/${p.id}`,
        name: p.title,
      })),
    },
  }

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: catName, url: `${SITE_URL}/categories/${category}` },
    { name: sub.name },
  ])

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(listadoLd) }} />

      <section className="bg-paper border-b border-ink/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/60 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
            <Link href={`/categories/${category}`} className="hover:text-accent">{catName}</Link>{' '}
            <span className="mx-1">/</span> <span className="text-ink">{sub.name}</span>
          </nav>
          <div className="flex items-center gap-5">
            <span className="inline-flex flex-shrink-0 text-ink p-4 border border-ink/10 rounded-xl shadow-hard bg-paper">
              <CategoryIcon id={fishingType.id} className="w-10 h-10" strokeWidth={1.6} />
            </span>
            <div className="min-w-0">
              <h1 className="font-display uppercase text-[1.7rem] sm:text-4xl md:text-5xl leading-[1.05] text-ink break-words">{nombre}</h1>
              <p className="text-ink/60 text-sm md:text-base mt-2 max-w-2xl">{description}</p>
              {/* Texto propio de la subcategoría (del admin, o la guía del tipo). */}
              {texto && (
                <div className="mt-4 max-w-2xl space-y-2">
                  {texto.split('\n').filter(Boolean).map((parrafo, i) => (
                    <p key={i} className="text-ink/75 text-[15px] leading-relaxed">{parrafo}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Link href={`/categories/${category}`} className="inline-block mt-5 text-xs font-semibold text-accent hover:underline">
            ← Ver toda la categoría {catName}
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        {/* Sibling subcategories (real pages) */}
        {subsConProductos.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60 mr-1">Subcategorías:</span>
            <Link href={`/categories/${category}`} className="px-3.5 py-1.5 text-[11px] font-semibold border border-ink/10 rounded-full text-ink hover:bg-ink hover:text-paper transition-colors">Todas</Link>
            {subsConProductos.map((s) => (
              <Link
                key={s.id}
                href={`/categories/${category}/${s.id}`}
                className={`px-3.5 py-1.5 text-[11px] font-semibold border rounded-full transition-colors ${
                  s.id === subcategory ? 'bg-ink text-paper border-ink' : 'border-ink/10 text-ink hover:bg-ink hover:text-paper'
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
          <div className="text-center py-16 border border-ink/10 rounded-xl shadow-hard bg-paper max-w-lg mx-auto px-8 space-y-4">
            <Icon name="anchor" className="w-12 h-12 mx-auto text-ink/40" strokeWidth={1.5} />
            <h2 className="font-display uppercase text-2xl text-ink">Sin productos por ahora</h2>
            <p className="text-sm text-ink/60">Vuelve pronto o explora el resto de la categoría.</p>
            <Link href={`/categories/${category}`} className="inline-block bg-ink text-paper px-5 py-2.5 text-sm font-semibold border border-ink/10 rounded-full hover:bg-accent transition-colors">
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

        <div className="pt-6">
          <ExploraCategoria
            categoria={category}
            nombre={catName}
            nombres={Object.fromEntries(tax.map((c) => [c.id, c.name]))}
            subcategorias={subs.map((s) => ({ ...s, count: cuantos(s.id) }))}
            actual={subcategory}
            hayRanking={ranked.length > 0}
            guias={guias.filter((g) => g.typeFishing === category)}
            tecnica={tipo?.tecnica}
          />
        </div>
      </section>
    </Layout>
  )
}
