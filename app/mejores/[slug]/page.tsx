import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import ProductImage from '@/components/ProductImage'
import CategoryIcon from '@/components/graphics/CategoryIcon'
import { getRoundup, roundupSlugs, ROUNDUP_YEAR } from '@/lib/roundups'
import { getFishingType } from '@/lib/fishing'
import { SITE_URL, absoluteUrl, breadcrumbJsonLd } from '@/lib/seo'

type Params = { params: Promise<{ slug: string }> }

// ISR: pre-render every roundup, refresh hourly (ranking follows clicks + catalog).
export const revalidate = 3600

export async function generateStaticParams() {
  return (await roundupSlugs()).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const roundup = await getRoundup(slug)
  if (!roundup) return {}
  const url = `/mejores/${slug}`
  return {
    title: roundup.h1,
    description: roundup.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: roundup.h1,
      description: roundup.metaDescription,
      url,
      type: 'article',
    },
  }
}

function priceLabel(price: number, currency: string) {
  return `${price.toFixed(2)} ${currency === 'EUR' ? '€' : currency}`
}

export default async function RoundupPage({ params }: Params) {
  const { slug } = await params
  const roundup = await getRoundup(slug)
  if (!roundup) notFound()

  const { type, h1, intro, items, howToChoose, faq } = roundup
  const others = (await roundupSlugs())
    .filter((s) => s !== slug)
    .slice(0, 6)
    .map((s) => ({ slug: s, name: getFishingType(s)?.name ?? s }))

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: h1,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: items.length,
    itemListElement: items.map((it) => ({
      '@type': 'ListItem',
      position: it.rank,
      url: absoluteUrl(`/products/${it.product.id}`),
      name: it.product.title,
      image: it.product.imageUrl || undefined,
    })),
  }

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: 'Mejores', url: absoluteUrl('/mejores') },
    { name: type.name },
  ])

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* HERO */}
      <section className="bg-paper border-b-2 border-ink">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
            <Link href="/mejores" className="hover:text-accent">Mejores</Link> <span className="mx-1">/</span>{' '}
            <span className="text-ink">{type.name}</span>
          </nav>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">● Guía de compra {ROUNDUP_YEAR}</p>
          <h1 className="font-display uppercase text-4xl md:text-6xl leading-[0.9] text-ink">{h1}</h1>
          <p className="text-ink/70 text-sm md:text-base max-w-2xl mt-4 leading-relaxed">{intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/categories/${slug}`} className="inline-flex items-center gap-2 bg-ink text-paper px-5 py-3 text-xs font-bold uppercase tracking-wide border-2 border-ink shadow-hard hover-shift">
              <CategoryIcon id={type.id} className="w-4 h-4" strokeWidth={1.9} /> Ver toda la categoría
            </Link>
            <Link href="/advice" className="bg-paper text-ink px-5 py-3 text-xs font-bold uppercase tracking-wide border-2 border-ink shadow-hard hover-shift">Asistente IA 🤖</Link>
          </div>
        </div>
      </section>

      {/* RANKING */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-5">
        {items.map((it) => (
          <article key={it.product.id} className="flex flex-col sm:flex-row gap-4 border-2 border-ink shadow-hard bg-paper p-4">
            <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:justify-start">
              <span className="font-display text-4xl md:text-5xl leading-none text-accent w-12 text-center">{String(it.rank).padStart(2, '0')}</span>
              <Link href={`/products/${it.product.id}`} className="relative block w-24 h-24 flex-shrink-0 bg-[#e6e2d6] border-2 border-ink overflow-hidden">
                <ProductImage src={it.product.imageUrl} alt={it.product.title} sizes="96px" className="absolute inset-0 w-full h-full object-cover" />
              </Link>
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <h2 className="font-display uppercase text-lg md:text-xl leading-tight text-ink">
                <Link href={`/products/${it.product.id}`} className="hover:text-accent">{it.product.title}</Link>
              </h2>
              <p className="text-sm text-ink/70 leading-relaxed mt-1.5 flex-1">{it.why}</p>
              <div className="flex items-center justify-between gap-3 mt-3">
                <span className="font-display text-2xl text-ink leading-none">{priceLabel(it.product.price, it.product.currency)}</span>
                <a
                  href={`/go/${it.product.id}`}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="bg-ink text-paper px-4 py-2.5 text-xs font-bold uppercase tracking-tight border-2 border-ink hover:bg-accent hover:border-accent transition-colors whitespace-nowrap"
                >
                  Ver oferta →
                </a>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* HOW TO CHOOSE */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-10">
        <div className="border-2 border-ink shadow-hard bg-paper p-6 md:p-8">
          <h2 className="font-display uppercase text-2xl md:text-3xl leading-none text-ink border-b-2 border-ink pb-3 mb-5">
            Cómo elegir {roundup.type.name.toLowerCase()}
          </h2>
          <ul className="space-y-3">
            {howToChoose.map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink/80 leading-relaxed">
                <span className="font-display text-accent text-lg leading-none flex-shrink-0">→</span>
                <span dangerouslySetInnerHTML={{ __html: boldify(tip) }} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-10">
        <h2 className="font-display uppercase text-2xl md:text-3xl leading-none text-ink mb-5">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {faq.map((f, i) => (
            <details key={i} className="border-2 border-ink bg-paper group">
              <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3 font-bold text-ink text-sm">
                <span>{f.q}</span>
                <span className="text-accent text-lg group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="px-5 pb-4 text-sm text-ink/70 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* OTHER ROUNDUPS */}
      {others.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50 mb-4">Otras guías de compra</h2>
          <div className="flex flex-wrap gap-2">
            {others.map((o) => (
              <Link key={o.slug} href={`/mejores/${o.slug}`} className="px-4 py-2 bg-paper border-2 border-ink text-xs font-bold uppercase tracking-tight text-ink hover:bg-ink hover:text-paper transition-colors">
                Mejores {o.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </Layout>
  )
}

/** Minimal, XSS-safe **bold** rendering for the templated buying tips. */
function boldify(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-ink">$1</strong>')
}
