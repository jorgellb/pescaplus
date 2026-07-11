import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import ProductImage from '@/components/ProductImage'
import ProductGallery from '@/components/ProductGallery'
import { fishingLabel } from '@/lib/fishing'
import { resolveProduct, relatedProducts } from '@/lib/product-service'
import { renderDescription } from '@/lib/markdown'
import { CATALOG } from '@/lib/catalog'

type Params = { params: Promise<{ id: string }> }

// Incremental Static Regeneration: pre-render catalog products, refresh hourly.
// Imported / live AliExpress products render on demand (dynamicParams default).
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
          <span className="text-5xl inline-block">🪝</span>
          <h1 className="text-2xl font-bold text-slate-900">Aparejo no encontrado</h1>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            El producto solicitado no existe o ha sido retirado del catálogo.
          </p>
          <Link
            href="/"
            className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
          >
            Volver al inicio
          </Link>
        </div>
      </Layout>
    )
  }

  const related = await relatedProducts(product)
  const modalityLabel = fishingLabel(product.typeFishing)

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
      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-6">
          <Link href="/" className="hover:text-sky-600 transition-colors">Inicio</Link>
          <span>/</span>
          <Link href={`/categories/${product.typeFishing}`} className="hover:text-sky-600 transition-colors">
            {modalityLabel}
          </Link>
          <span>/</span>
          <span className="text-slate-600 truncate max-w-[200px]">{product.title}</span>
        </nav>

        {/* Product panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 p-5 md:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm mb-16">
          <div className="lg:col-span-5">
            <ProductGallery
              images={product.images}
              alts={product.imageAlts}
              videoUrl={product.videoUrl}
              title={product.title}
            />
          </div>

          <div className="lg:col-span-7 flex flex-col">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex bg-sky-50 text-sky-700 border border-sky-100 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
                  {modalityLabel}
                </span>
                {product.aiOptimized && (
                  <span className="inline-flex bg-violet-50 text-violet-600 border border-violet-100 text-xs font-bold px-3 py-1.5 rounded-full">
                    ✨ Ficha optimizada con IA
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {product.title}
              </h1>

              <div className="flex items-center gap-2">
                <div className="flex text-amber-400" aria-hidden>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span key={idx} className={idx < Math.round(product.rating) ? 'text-amber-400' : 'text-slate-300'}>★</span>
                  ))}
                </div>
                <span className="text-sm font-semibold text-slate-700">{product.rating.toFixed(1)}</span>
                <span className="text-xs text-slate-400">· {product.reviews.toLocaleString('es-ES')} vendidos</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-slate-900">{product.price.toFixed(2)}</span>
                <span className="text-lg font-bold text-slate-400">{product.currency}</span>
              </div>

              <div className="space-y-2 pt-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Descripción</h2>
                <div
                  className="text-sm text-slate-600 leading-relaxed [&_strong]:text-slate-800 [&_ul]:text-slate-600"
                  dangerouslySetInnerHTML={{ __html: renderDescription(product.description) }}
                />
              </div>
            </div>

            <div className="mt-auto pt-6 space-y-3">
              <a
                href={product.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all"
              >
                Comprar en AliExpress 🛒
              </a>
              <p className="text-center text-xs text-slate-400 max-w-md mx-auto">
                Serás redirigido a la tienda oficial de AliExpress para pagar de forma segura.
              </p>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Productos Relacionados</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {related.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/products/${rp.id}`}
                  className="group rounded-2xl overflow-hidden bg-white border border-slate-200 hover:border-sky-300 hover:shadow-lg hover:shadow-slate-900/5 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                >
                  <div className="relative aspect-square bg-slate-50 overflow-hidden">
                    <ProductImage src={rp.imageUrl} alt={rp.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4 flex flex-col justify-between flex-1 gap-2">
                    <h3 className="font-semibold text-slate-800 group-hover:text-sky-600 line-clamp-2 transition-colors text-sm leading-snug">
                      {rp.title}
                    </h3>
                    <span className="text-lg font-extrabold text-slate-900">
                      {rp.price.toFixed(2)} <span className="text-xs font-semibold text-slate-400">{rp.currency}</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
