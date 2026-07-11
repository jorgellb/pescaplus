import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import ProductCard from '@/components/ProductCard'
import ProductGallery from '@/components/ProductGallery'
import { getTaxonomy, categoryName } from '@/lib/taxonomy-store'
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
      images: product.images.length ? product.images.slice(0, 4) : undefined,
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
  const modalityLabel = categoryName(await getTaxonomy(), product.typeFishing)

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: modalityLabel, url: `${SITE_URL}/categories/${product.typeFishing}` },
    { name: product.title },
  ])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.images,
    description: product.seoDescription || product.description,
    category: modalityLabel,
    offers: {
      '@type': 'Offer',
      price: product.price.toFixed(2),
      priceCurrency: product.currency,
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: product.affiliateUrl,
    },
    ...(product.reviews > 0 && product.rating > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating.toFixed(1), reviewCount: product.reviews } }
      : {}),
  }

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-8">
          <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
          <Link href={`/categories/${product.typeFishing}`} className="hover:text-accent">{modalityLabel}</Link>{' '}
          <span className="mx-1">/</span> <span className="text-ink truncate">{product.title.slice(0, 40)}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 mb-20">
          <div className="lg:col-span-5">
            <ProductGallery images={product.images} alts={product.imageAlts} videoUrl={product.videoUrl} title={product.title} />
          </div>

          <div className="lg:col-span-7 flex flex-col">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex bg-ink text-paper text-[11px] font-bold px-3 py-1.5 uppercase tracking-widest rounded-full">{modalityLabel}</span>
                {product.aiOptimized && (
                  <span className="inline-flex bg-accent text-paper text-[11px] font-bold px-3 py-1.5 uppercase tracking-widest rounded-full">✨ Optimizado con IA</span>
                )}
              </div>

              <h1 className="font-display uppercase text-4xl md:text-5xl leading-[0.95] text-ink">{product.title}</h1>

              <div className="flex items-center gap-2 font-mono text-sm">
                <span className="text-accent">{'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}</span>
                <span className="font-bold text-ink">{product.rating.toFixed(1)}</span>
                <span className="text-ink/50">· {product.reviews.toLocaleString('es-ES')} vendidos</span>
              </div>

              <div className="inline-flex items-baseline gap-2 border border-ink/15 rounded-xl shadow-hard px-5 py-3 bg-paper">
                <span className="font-display text-5xl leading-none text-ink">{product.price.toFixed(2)}</span>
                <span className="font-display text-2xl text-ink/60">{product.currency === 'EUR' ? '€' : product.currency}</span>
              </div>

              <div className="space-y-2 pt-2">
                <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Descripción</h2>
                <div
                  className="text-[15px] text-ink/80 leading-relaxed [&_strong]:text-ink [&_a]:text-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: renderDescription(product.description) }}
                />
              </div>
            </div>

            <div className="mt-auto pt-8 space-y-3">
              <a
                href={`/go/${product.id}`}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="w-full flex items-center justify-center gap-2 bg-ink text-paper px-8 py-5 font-display uppercase text-2xl border border-ink/15 rounded-xl shadow-hard-md hover-shift hover:bg-accent hover:border-accent"
              >
                Comprar en AliExpress →
              </a>
              <Link
                href={`/advice?ask=${encodeURIComponent(`¿Es buena opción el/la "${product.title}"? ¿Para qué tipo de pesca lo recomiendas y cómo lo uso?`)}`}
                className="w-full flex items-center justify-center gap-2 bg-paper text-ink px-8 py-3.5 font-bold uppercase text-sm tracking-tight border border-ink/15 rounded-xl hover:bg-ink hover:text-paper transition-colors"
              >
                🤖 Preguntar a la IA sobre este producto
              </Link>
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink/40 text-center">Redirección segura a la tienda oficial</p>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="space-y-6">
            <h2 className="font-display uppercase text-3xl md:text-4xl leading-none border-b border-ink/12 pb-4">Relacionados</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {related.map((rp) => (
                <ProductCard key={rp.id} {...rp} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
