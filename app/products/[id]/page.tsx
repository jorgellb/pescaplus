import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import ProductCard from '@/components/ProductCard'
import ProductGallery from '@/components/ProductGallery'
import AsesorButton from '@/components/AsesorButton'
import FavoriteButton from '@/components/FavoriteButton'
import RecentTracker from '@/components/RecentTracker'
import RecentlyViewed from '@/components/RecentlyViewed'
import { getTaxonomy, categoryName } from '@/lib/taxonomy-store'
import { proxiedImage, absoluteProxiedImage } from '@/lib/img-proxy'
import { resolveProduct, relatedProducts } from '@/lib/product-service'
import { renderDescription } from '@/lib/markdown'
import { CATALOG } from '@/lib/catalog'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'

type Params = { params: Promise<{ id: string }> }

export const revalidate = 3600

export function generateStaticParams() {
  return CATALOG.map((p) => ({ id: p.id }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const product = await resolveProduct(id)
  if (!product) return { title: 'Aparejo no encontrado' }
  const description = product.seoDescription || product.description.slice(0, 160)
  return {
    title: product.seoTitle || product.title,
    description,
    alternates: { canonical: `/products/${product.id}` },
    openGraph: {
      title: product.title,
      description,
      type: 'website',
      images: product.images.length ? product.images.slice(0, 4).map((i) => proxiedImage(i, product.title)) : undefined,
    },
    twitter: { card: 'summary_large_image', title: product.title, description },
  }
}

export default async function ProductPage({ params }: Params) {
  const { id } = await params
  const product = await resolveProduct(id)

  if (!product) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-6">
          <span className="text-6xl inline-block">🪝</span>
          <h1 className="font-display uppercase text-4xl text-ink">Aparejo no encontrado</h1>
          <p className="text-ink/60 text-sm max-w-sm mx-auto">El producto no existe o ha sido retirado del catálogo.</p>
          <Link href="/" className="inline-block bg-ink text-paper px-6 py-3 text-sm font-bold uppercase border border-ink/15 rounded-xl shadow-hard hover-shift">
            Volver al inicio
          </Link>
        </div>
      </Layout>
    )
  }

  const related = await relatedProducts(product)
  const taxonomy = await getTaxonomy()
  const modalityLabel = categoryName(taxonomy, product.typeFishing)
  const productCategories = product.categories?.length ? product.categories : [product.typeFishing]

  const snapshot = {
    id: product.id,
    title: product.title,
    price: product.price,
    currency: product.currency,
    imageUrl: proxiedImage(product.imageUrl, product.title),
  }

  const specs: { label: string; value: string }[] = [
    { label: 'Modalidad', value: modalityLabel },
    { label: 'Categorías', value: productCategories.map((c) => categoryName(taxonomy, c)).join(', ') },
    { label: 'Valoración media', value: `${product.rating.toFixed(1)} / 5` },
    { label: 'Unidades vendidas', value: product.reviews.toLocaleString('es-ES') },
    { label: 'Disponibilidad', value: product.inStock ? 'Disponible' : 'No disponible' },
  ]

  const faqs: { q: string; a: string }[] = [
    {
      q: `¿Para qué tipo de pesca es ideal ${product.title}?`,
      a: `Está pensado principalmente para ${modalityLabel.toLowerCase()}. Si tienes dudas sobre si encaja con tu técnica o tu nivel, puedes preguntar gratis a nuestro asesor de pesca.`,
    },
    {
      q: '¿El precio incluye el envío?',
      a: 'El precio mostrado es orientativo. El importe final, los gastos de envío y los plazos dependen de la tienda del vendedor, que es donde se completa la compra.',
    },
    {
      q: '¿Cómo se realiza la compra?',
      a: 'Al pulsar «Comprar ahora» te llevamos a la tienda del vendedor, donde finalizas el pedido con su proceso de pago y envío. Algunos enlaces son de afiliados.',
    },
    {
      q: '¿Puedo pedir una recomendación antes de comprar?',
      a: 'Sí. Nuestro asesor de pesca resuelve tus dudas sobre este y otros aparejos y te ayuda a elegir según tu presupuesto y tu modalidad.',
    },
  ]

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const trustBadges: { icon: string; label: string }[] = [
    { icon: '🔒', label: 'Compra 100% segura' },
    { icon: '📦', label: 'Envío con seguimiento' },
    { icon: '🎣', label: 'Seleccionado por expertos' },
    { icon: '💬', label: 'Asesor de pesca gratis' },
  ]

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: modalityLabel, url: `${SITE_URL}/categories/${product.typeFishing}` },
    { name: product.title },
  ])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.images.map((i) => absoluteProxiedImage(i, product.title)),
    description: product.seoDescription || product.description,
    category: modalityLabel,
    offers: {
      '@type': 'Offer',
      price: product.price.toFixed(2),
      priceCurrency: product.currency,
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/products/${product.id}`,
    },
    ...(product.reviews > 0 && product.rating > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating.toFixed(1), reviewCount: product.reviews } }
      : {}),
  }

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <RecentTracker {...snapshot} />
      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-8">
          <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
          <Link href={`/categories/${product.typeFishing}`} className="hover:text-accent">{modalityLabel}</Link>{' '}
          <span className="mx-1">/</span> <span className="text-ink truncate">{product.title.slice(0, 40)}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 mb-20">
          <div className="lg:col-span-5">
            <ProductGallery
              images={product.images.map((i) => proxiedImage(i, product.title))}
              alts={product.imageAlts}
              videoUrl={proxiedImage(product.videoUrl, product.title)}
              title={product.title}
            />
          </div>

          <div className="lg:col-span-7 flex flex-col">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex bg-ink text-paper text-[11px] font-bold px-3 py-1.5 uppercase tracking-widest rounded-full">{modalityLabel}</span>
                {product.inStock ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 uppercase tracking-widest rounded-full border border-accent/40 text-accent">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" /> Disponible
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 uppercase tracking-widest rounded-full border border-ink/20 text-ink/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink/40" /> No disponible
                  </span>
                )}
              </div>

              <h1 className="font-display uppercase text-4xl md:text-5xl leading-[0.95] text-ink">{product.title}</h1>

              <div className="flex items-center gap-2 font-mono text-sm">
                <span className="text-accent">{'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}</span>
                <span className="font-bold text-ink">{product.rating.toFixed(1)}</span>
                <span className="text-ink/50">· {product.reviews.toLocaleString('es-ES')} vendidos</span>
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-baseline gap-2 border border-ink/15 rounded-xl shadow-hard px-5 py-3 bg-paper">
                  <span className="font-display text-5xl leading-none text-ink">{product.price.toFixed(2)}</span>
                  <span className="font-display text-2xl text-ink/60">{product.currency === 'EUR' ? '€' : product.currency}</span>
                </div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink/40">
                  Precio orientativo · puede variar en la tienda del vendedor
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Descripción</h2>
                <div
                  className="text-[15px] text-ink/80 leading-relaxed [&_strong]:text-ink [&_a]:text-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: renderDescription(product.description) }}
                />
              </div>

              {/* Internal linking: product → its categories */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/40">Categorías:</span>
                {productCategories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/categories/${cat}`}
                    className="px-3 py-1 text-xs font-bold text-ink border border-ink/15 rounded-full hover:bg-ink hover:text-paper transition-colors"
                  >
                    {categoryName(taxonomy, cat)}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-8 space-y-3">
              {product.inStock ? (
                <a
                  href={`/go/${product.id}`}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="w-full flex items-center justify-center gap-2 bg-ink text-paper px-8 py-5 font-display uppercase text-2xl border border-ink/15 rounded-xl shadow-hard-md hover-shift hover:bg-accent hover:border-accent"
                >
                  Comprar ahora →
                </a>
              ) : (
                <div className="w-full flex flex-col items-center justify-center gap-1 bg-ink/5 text-ink/50 px-8 py-5 border border-ink/15 rounded-xl cursor-not-allowed">
                  <span className="font-display uppercase text-2xl leading-none">No disponible</span>
                  <span className="font-mono text-[11px] uppercase tracking-wide">Vuelve a consultarlo pronto</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AsesorButton
                  ask={`¿Es buena opción el/la "${product.title}"? ¿Para qué tipo de pesca lo recomiendas y cómo lo uso?`}
                  className="w-full flex items-center justify-center gap-2 bg-paper text-ink px-6 py-3.5 font-bold uppercase text-sm tracking-tight border border-ink/15 rounded-xl hover:bg-ink hover:text-paper transition-colors"
                >
                  🎣 Preguntar
                </AsesorButton>
                <FavoriteButton product={snapshot} variant="full" className="w-full px-6 py-3.5 text-sm" />
              </div>
              <Link
                href={`/categories/${product.typeFishing}`}
                className="block text-center font-mono text-xs font-bold uppercase tracking-widest text-accent hover:underline"
              >
                Ver todo en {modalityLabel} →
              </Link>
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink/40 text-center">Compra 100% segura · Envío con seguimiento</p>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-14">
          {trustBadges.map((b) => (
            <div key={b.label} className="flex items-center gap-3 border border-ink/12 rounded-xl bg-paper px-4 py-3">
              <span className="text-2xl leading-none">{b.icon}</span>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink/70 leading-tight">{b.label}</span>
            </div>
          ))}
        </div>

        {/* Details + FAQ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 mb-20">
          <div className="space-y-4">
            <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3">Ficha técnica</h2>
            <dl className="divide-y divide-ink/10 border border-ink/12 rounded-xl overflow-hidden">
              {specs.map((s) => (
                <div key={s.label} className="flex items-baseline justify-between gap-4 px-4 py-3 bg-paper">
                  <dt className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50 flex-shrink-0">{s.label}</dt>
                  <dd className="text-sm font-semibold text-ink text-right break-words">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-4">
            <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3">Preguntas frecuentes</h2>
            <div className="space-y-2">
              {faqs.map((f) => (
                <details key={f.q} className="group border border-ink/12 rounded-xl bg-paper px-4 py-3 [&_summary]:list-none">
                  <summary className="flex items-center justify-between gap-3 cursor-pointer text-sm font-bold text-ink">
                    {f.q}
                    <span className="flex-shrink-0 text-accent transition-transform group-open:rotate-45 text-lg leading-none">+</span>
                  </summary>
                  <p className="text-sm text-ink/70 leading-relaxed mt-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4 border-b border-ink/12 pb-4">
              <h2 className="font-display uppercase text-2xl sm:text-3xl md:text-4xl leading-none break-words">Relacionados en {modalityLabel}</h2>
              <Link href={`/categories/${product.typeFishing}`} className="font-mono text-xs font-bold uppercase tracking-widest text-accent hover:underline whitespace-nowrap">Ver toda la categoría →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {related.map((rp) => (
                <ProductCard key={rp.id} {...rp} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-16">
          <RecentlyViewed excludeId={product.id} />
        </div>
      </div>
    </Layout>
  )
}
