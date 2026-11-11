import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import ProductImage from '@/components/ProductImage'
import { listGuides, getGuide } from '@/lib/guides-store'
import { fishingLabel } from '@/lib/fishing'
import { renderDescription } from '@/lib/markdown'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'
import { proxiedImage, absoluteProxiedImage } from '@/lib/img-proxy'
import { safeJsonLd } from '@/lib/json-ld'
import ProductCard from '@/components/ProductCard'
import { listProducts } from '@/lib/products-store'
import { especiesDeGuia, productosParaGuia } from '@/lib/enlazado'
import { tituloDeRanking } from '@/lib/roundups'

type Params = { params: Promise<{ slug: string }> }

export const revalidate = 3600

export async function generateStaticParams() {
  const guides = await listGuides({ publishedOnly: true })
  return guides.map((g) => ({ slug: g.id }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const guide = await getGuide(slug)
  if (!guide) return { title: 'Guía no encontrada', robots: { index: false, follow: false } }
  const description = guide.seoDescription || guide.excerpt
  return {
    title: guide.seoTitle || guide.title,
    description,
    alternates: { canonical: `/guias/${guide.id}` },
    openGraph: {
      type: 'article',
      title: guide.title,
      description,
      images: guide.coverImage ? [proxiedImage(guide.coverImage, guide.title)] : undefined,
      publishedTime: guide.createdAt,
      modifiedTime: guide.updatedAt,
    },
    twitter: { card: 'summary_large_image', title: guide.title, description },
  }
}

export default async function GuidePage({ params }: Params) {
  const { slug } = await params
  const guide = await getGuide(slug)
  if (!guide || !guide.published) notFound()

  // Lo que la guía enlaza: las especies de las que habla y el material de su
  // categoría que encaja con lo que cuenta (lib/enlazado.ts). Es un extra: si
  // el catálogo no responde, la guía sale igual.
  const productos = await listProducts().catch(() => [])
  const especies = especiesDeGuia(guide)
  const material = productosParaGuia(guide, productos, 4)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.seoDescription || guide.excerpt,
    image: guide.coverImage ? [absoluteProxiedImage(guide.coverImage, guide.title)] : undefined,
    datePublished: guide.createdAt,
    dateModified: guide.updatedAt,
    author: { '@type': 'Organization', name: 'PescaPlus' },
    publisher: { '@type': 'Organization', name: 'PescaPlus' },
    mainEntityOfPage: `${SITE_URL}/guias/${guide.id}`,
  }
  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: 'Guías', url: `${SITE_URL}/guias` },
    { name: guide.title },
  ])

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />

      <article className="max-w-3xl mx-auto px-4 py-12 sm:px-6">
        <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/60 mb-6">
          <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
          <Link href="/guias" className="hover:text-accent">Guías</Link>
        </nav>

        <div className="flex items-center gap-3 mb-4">
          {guide.typeFishing && (
            <span className="bg-ink text-paper text-[11px] font-semibold st px-3 py-1.5 rounded-full">
              {fishingLabel(guide.typeFishing)}
            </span>
          )}
          <time className="font-mono text-[11px] uppercase tracking-widest text-ink/60">
            {new Date(guide.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
          </time>
        </div>

        <h1 className="font-display uppercase text-4xl md:text-5xl leading-[0.95] text-ink">{guide.title}</h1>
        <p className="text-lg text-ink/70 mt-4 leading-snug">{guide.excerpt}</p>

        {guide.coverImage && (
          <div className="relative aspect-[16/9] mt-8 border border-ink/10 rounded-xl shadow-hard overflow-hidden bg-ink/[0.05]">
            <ProductImage src={proxiedImage(guide.coverImage, guide.title)} alt={guide.coverImageAlt || guide.title} priority sizes="(max-width: 768px) 100vw, 768px" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        )}

        <div
          className="mt-8 text-[16px] text-ink/85 leading-relaxed [&_strong]:text-ink [&_strong]:font-display [&_strong]:uppercase [&_strong]:text-xl [&_strong]:block [&_strong]:mt-6 [&_strong]:mb-1 [&_a]:text-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3 [&_ul]:space-y-1"
          dangerouslySetInnerHTML={{ __html: renderDescription(guide.content) }}
        />

        {especies.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">Especies de esta guía:</span>
            {especies.map((e) => (
              <Link key={e.especie.id} href={`/especies/${e.especie.id}`} className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-ink border border-ink/10 rounded-full hover:bg-ink hover:text-paper transition-colors">
                <span aria-hidden>{e.especie.emoji}</span> {e.especie.name}
              </Link>
            ))}
          </div>
        )}

        {material.length > 0 && (
          <section className="mt-10 space-y-4" aria-labelledby="material-guia">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between border-b border-ink/[0.07] pb-3">
              <h2 id="material-guia" className="font-display uppercase text-2xl leading-none">Material de la guía</h2>
              <Link href={`/mejores/${guide.typeFishing}`} className="text-xs font-semibold text-accent hover:underline">
                {tituloDeRanking(guide.typeFishing)} →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {material.map((p) => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-12 pt-6 border-t border-ink/[0.07] flex flex-wrap gap-3">
          <Link href="/guias" className="bg-paper text-ink px-5 py-3 text-sm font-semibold border border-ink/10 rounded-full shadow-hard hover-shift">
            ← Más guías
          </Link>
          {guide.typeFishing && (
            <Link href={`/categories/${guide.typeFishing}`} className="bg-ink text-paper px-5 py-3 text-sm font-semibold border border-ink/10 rounded-full shadow-hard hover-shift hover:bg-accent hover:border-accent">
              Ver {fishingLabel(guide.typeFishing)} →
            </Link>
          )}
        </div>
      </article>
    </Layout>
  )
}
