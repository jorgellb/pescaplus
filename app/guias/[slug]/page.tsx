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

type Params = { params: Promise<{ slug: string }> }

export const revalidate = 3600

export async function generateStaticParams() {
  const guides = await listGuides({ publishedOnly: true })
  return guides.map((g) => ({ slug: g.id }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const guide = await getGuide(slug)
  if (!guide) return { title: 'Guía no encontrada' }
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <article className="max-w-3xl mx-auto px-4 py-12 sm:px-6">
        <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-6">
          <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
          <Link href="/guias" className="hover:text-accent">Guías</Link>
        </nav>

        <div className="flex items-center gap-3 mb-4">
          {guide.typeFishing && (
            <span className="bg-ink text-paper text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
              {fishingLabel(guide.typeFishing)}
            </span>
          )}
          <time className="font-mono text-[11px] uppercase tracking-widest text-ink/40">
            {new Date(guide.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
          </time>
        </div>

        <h1 className="font-display uppercase text-4xl md:text-5xl leading-[0.95] text-ink">{guide.title}</h1>
        <p className="text-lg text-ink/70 mt-4 leading-snug">{guide.excerpt}</p>

        {guide.coverImage && (
          <div className="relative aspect-[16/9] mt-8 border border-ink/15 rounded-xl shadow-hard overflow-hidden bg-[#e6e2d6]">
            <ProductImage src={proxiedImage(guide.coverImage, guide.title)} alt={guide.coverImageAlt || guide.title} priority sizes="(max-width: 768px) 100vw, 768px" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        )}

        <div
          className="mt-8 text-[16px] text-ink/85 leading-relaxed [&_strong]:text-ink [&_strong]:font-display [&_strong]:uppercase [&_strong]:text-xl [&_strong]:block [&_strong]:mt-6 [&_strong]:mb-1 [&_a]:text-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3 [&_ul]:space-y-1"
          dangerouslySetInnerHTML={{ __html: renderDescription(guide.content) }}
        />

        <div className="mt-12 pt-6 border-t border-ink/12 flex flex-wrap gap-3">
          <Link href="/guias" className="bg-paper text-ink px-5 py-3 text-sm font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift">
            ← Más guías
          </Link>
          {guide.typeFishing && (
            <Link href={`/categories/${guide.typeFishing}`} className="bg-ink text-paper px-5 py-3 text-sm font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift hover:bg-accent hover:border-accent">
              Ver {fishingLabel(guide.typeFishing)} →
            </Link>
          )}
        </div>
      </article>
    </Layout>
  )
}
