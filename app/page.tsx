import Link from 'next/link'
import type { Metadata } from 'next'
import Layout from '@/components/Layout'
import Marquee from '@/components/Marquee'
import ProductCard from '@/components/ProductCard'
import ProductImage from '@/components/ProductImage'
import CategoryIcon from '@/components/graphics/CategoryIcon'
import { FISHING_TYPES } from '@/lib/fishing'
import { listProducts } from '@/lib/products-store'
import { listGuides } from '@/lib/guides-store'
import { getTrendingProducts } from '@/lib/trending'
import { getRoundupPreviews } from '@/lib/roundups'
import { getTaxonomy, categoryName } from '@/lib/taxonomy-store'
import { proxiedImage } from '@/lib/img-proxy'

export const metadata: Metadata = {
  title: { absolute: 'PescaPlus | Tienda de pesca online en España al mejor precio' },
  description:
    'Tienda de pesca online en España: cañas, carretes, señuelos y aparejos al mejor precio. Material de pesca barato para spinning, carpfishing y surfcasting, con envío rápido y selección experta.',
  alternates: { canonical: '/' },
}

export const revalidate = 3600

const FAQS = [
  {
    q: '¿Cuál es la mejor tienda de pesca online en España?',
    a: 'PescaPlus es una tienda de pesca online pensada para el pescador de España: cañas, carretes, señuelos y todo tipo de aparejos seleccionados por pescadores, con los mejores precios y envío a toda España.',
  },
  {
    q: '¿Dónde comprar material de pesca barato sin perder calidad?',
    a: 'En PescaPlus reunimos material de pesca barato sin renunciar a la calidad: comparamos precios y valoraciones reales de compradores para ofrecerte los mejores precios en pesca online, solo con lo que de verdad merece la pena.',
  },
  {
    q: '¿Qué productos de pesca puedo comprar?',
    a: 'Cañas, carretes, señuelos, líneas, anzuelos, plomos, minutería, electrónica (sondas), embarcaciones, herramientas y equipo, organizados en 11 categorías para spinning, carpfishing, surfcasting y pesca en el mar.',
  },
  {
    q: '¿Hacéis envíos a toda España?',
    a: 'Sí. Enviamos a toda España —y a nivel internacional— con seguimiento del pedido y compra protegida, de forma rápida y sencilla.',
  },
  {
    q: '¿Cómo sé que compro al mejor precio?',
    a: 'Filtramos el catálogo por relación calidad-precio y por ventas y valoraciones reales, y lo actualizamos con las mejores ofertas para que consigas los mejores precios en pesca online.',
  },
]

export default async function Home() {
  const [all, featured, taxonomy, guides, roundups] = await Promise.all([
    listProducts(),
    getTrendingProducts(8),
    getTaxonomy(),
    listGuides({ publishedOnly: true }),
    getRoundupPreviews(),
  ])
  const withImg = all.filter((p) => p.imageUrl)
  const heroA = withImg[0]
  const heroB = withImg[1]
  const collage = withImg.slice(2, 4)
  const bestPrice = withImg.filter((p) => p.price > 0).sort((a, b) => a.price - b.price).slice(0, 8)
  const latestGuides = guides.slice(0, 3)
  const topRoundups = roundups.slice(0, 6)

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* HERO */}
      <section className="border-b border-ink/12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-5">
              ● Tienda de pesca online · España
            </p>
            <h1 className="font-display uppercase text-ink leading-[0.9] text-[2.5rem] sm:text-6xl md:text-7xl lg:text-8xl">
              Equípate
              <br />
              como un
              <br />
              <span className="text-accent">profesional</span>
            </h1>
            <p className="mt-6 text-lg text-ink/70 max-w-lg leading-snug">
              Tu tienda de pesca online en España: cañas, carretes, señuelos y aparejos
              seleccionados por nuestro equipo de pescadores, al mejor precio y con envío rápido.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/categories/canas" className="bg-ink text-paper px-7 py-4 text-sm font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift hover:bg-accent hover:border-accent">
                Ver catálogo →
              </Link>
              <Link href="/advice" className="bg-paper text-ink px-7 py-4 text-sm font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift">
                Asesor de pesca
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative">
              {heroA && (
                <div className="relative aspect-[4/5] border border-ink/15 rounded-xl shadow-hard-lg overflow-hidden bg-[#e6e2d6]">
                  <ProductImage src={proxiedImage(heroA.imageUrl, heroA.title)} alt={heroA.title} priority sizes="(max-width: 1024px) 90vw, 40vw" className="absolute inset-0 w-full h-full object-cover" />
                  <Link href={`/products/${heroA.id}`} className="absolute inset-0" aria-label={heroA.title} />
                </div>
              )}
              {heroB && (
                <div className="hidden sm:block absolute -bottom-8 -left-8 w-40 aspect-square border border-ink/15 rounded-xl shadow-hard bg-[#e6e2d6] overflow-hidden">
                  <ProductImage src={proxiedImage(heroB.imageUrl, heroB.title)} alt={heroB.title} sizes="200px" className="absolute inset-0 w-full h-full object-cover" />
                </div>
              )}
              <span className="absolute -top-5 -right-3 rotate-6 bg-accent text-paper font-display text-lg uppercase px-4 py-2 border border-ink/15 rounded-xl shadow-hard">
                {all.length} productos
              </span>
            </div>
          </div>
        </div>
      </section>

      <Marquee
        items={[
          'Envío a toda España',
          'Los mejores precios',
          'Material de pesca barato',
          'Selección experta',
          '11 categorías de pesca',
        ]}
      />

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8 gap-4 border-b border-ink/12 pb-4">
          <h2 className="font-display uppercase text-4xl md:text-5xl leading-none">Categorías de pesca</h2>
          <span className="font-mono text-xs uppercase tracking-widest text-ink/50 hidden sm:block">Elige tu aparejo</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {FISHING_TYPES.map((type, i) => (
            <Link
              key={type.id}
              href={`/categories/${type.id}`}
              className="group relative flex flex-col justify-between p-6 min-h-[10.5rem] border border-ink/12 -ml-px -mt-px bg-paper hover:bg-ink/[0.03] transition-colors"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs font-bold text-ink/35">{String(i + 1).padStart(2, '0')}</span>
                <CategoryIcon id={type.id} className="w-12 h-12 md:w-16 md:h-16 text-ink/70 group-hover:text-accent transition-colors" strokeWidth={1.4} />
              </div>
              <h3 className="font-display text-xl md:text-[1.7rem] leading-[1.05] text-ink group-hover:text-accent transition-colors mt-6 hyphens-none">
                {categoryName(taxonomy, type.id)}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      {featured.length > 0 && (
        <section className="bg-ink text-paper border-y border-ink/12 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8 gap-4 border-b-2 border-paper/30 pb-4">
              <h2 className="font-display uppercase text-4xl md:text-5xl leading-none">Lo más buscado</h2>
              <Link href="/mejores" className="font-mono text-xs font-bold uppercase tracking-widest text-accent hover:underline whitespace-nowrap">Guías de compra →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {featured.map((p) => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SEO INTRO / EDITORIAL */}
      <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4">● Sobre PescaPlus</p>
            <h2 className="font-display uppercase text-3xl md:text-5xl leading-[1.05] text-ink">
              Tu tienda de pesca online en España
            </h2>
            <div className="mt-5 space-y-4 text-ink/75 leading-relaxed max-w-2xl">
              <p>
                En <strong>PescaPlus</strong> somos una <strong>tienda de pesca online</strong> pensada para el
                pescador de España. Reunimos cañas, carretes, señuelos, líneas, plomos y todos los aparejos que
                necesitas, <strong>al mejor precio</strong> y con envío rápido a toda la península.
              </p>
              <p>
                Queremos que comprar <strong>material de pesca barato</strong> sea fácil y fiable: filtramos miles de
                productos por ventas y valoraciones reales para dejarte solo lo que merece la pena, tanto si empiezas
                en el <strong>spinning</strong> como si eres un veterano del <strong>carpfishing</strong> o el{' '}
                <strong>surfcasting</strong>.
              </p>
              <p>
                Explora nuestras <Link href="/categories/carretes" className="text-accent underline">categorías de pesca</Link>,
                descubre <Link href="/mejores" className="text-accent underline">las mejores ofertas del año</Link> en las guías
                de compra o pide consejo a nuestro <Link href="/advice" className="text-accent underline">asesor de pesca</Link>.
              </p>
            </div>
          </div>
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            {collage.map((p, i) => (
              <div key={p.id} className={`relative aspect-[3/4] border border-ink/15 rounded-xl overflow-hidden bg-[#e6e2d6] shadow-hard ${i === 1 ? 'mt-8' : ''}`}>
                <ProductImage src={proxiedImage(p.imageUrl, p.title)} alt={p.title} sizes="(max-width: 1024px) 45vw, 20vw" className="absolute inset-0 w-full h-full object-cover" />
                <Link href={`/products/${p.id}`} className="absolute inset-0" aria-label={p.title} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BEST PRICE / OFFERS */}
      {bestPrice.length > 0 && (
        <section className="border-y border-ink/12 bg-[#eae6db]/60">
          <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8 gap-4 border-b border-ink/15 pb-4">
              <div>
                <h2 className="font-display uppercase text-4xl md:text-5xl leading-none">Los mejores precios en pesca</h2>
                <p className="text-sm text-ink/60 mt-2">Chollos y ofertas en material de pesca online — calidad probada, sin pagar de más.</p>
              </div>
              <Link href="/search?q=oferta" className="font-mono text-xs font-bold uppercase tracking-widest text-accent hover:underline whitespace-nowrap hidden sm:block">Ver más →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {bestPrice.map((p) => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GUÍAS DE COMPRA (roundups) */}
      {topRoundups.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8 gap-4 border-b border-ink/12 pb-4">
            <h2 className="font-display uppercase text-4xl md:text-5xl leading-none">Guías de compra</h2>
            <Link href="/mejores" className="font-mono text-xs font-bold uppercase tracking-widest text-accent hover:underline whitespace-nowrap">Ver todas →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {topRoundups.map((r) => (
              <Link key={r.slug} href={`/mejores/${r.slug}`} className="group flex flex-col border border-ink/12 rounded-xl overflow-hidden bg-paper shadow-hard hover-shift">
                <div className="relative aspect-[16/10] bg-[#e6e2d6] border-b border-ink/10 overflow-hidden">
                  <ProductImage src={r.cover} alt={`Mejores ${r.name}`} sizes="(max-width: 768px) 50vw, 33vw" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="font-display uppercase text-lg md:text-xl leading-tight text-ink group-hover:text-accent transition-colors">Mejores {r.name}</h3>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mt-1.5">{r.priceFrom ? `Desde ${r.priceFrom.toFixed(2)} €` : `${r.count} modelos`} →</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* VALUE PROPS */}
      <section className="max-w-7xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-ink/15 rounded-xl shadow-hard-md overflow-hidden">
          {[
            { n: '01', t: 'Mejores precios', d: 'Material de pesca barato y ofertas reales: comparamos para que compres siempre al mejor precio.' },
            { n: '02', t: 'Envío a España', d: 'Enviamos a toda España con seguimiento del pedido. Pago protegido de principio a fin.' },
            { n: '03', t: 'Selección experta', d: 'Filtramos por ventas y valoraciones reales. Solo lo que de verdad merece la pena.' },
            { n: '04', t: 'Asesor de pesca', d: 'Resolvemos tus dudas de aparejos, técnicas y montajes por modalidad, gratis.' },
          ].map((f, i) => (
            <div key={f.n} className={`p-7 border-ink/12 ${i < 3 ? 'border-b md:border-b-0 md:border-r' : ''}`}>
              <span className="font-display text-5xl text-accent leading-none">{f.n}</span>
              <h3 className="font-display uppercase text-xl mt-4 leading-none">{f.t}</h3>
              <p className="text-sm text-ink/70 mt-3 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BLOG */}
      {latestGuides.length > 0 && (
        <section className="border-t border-ink/12 bg-ink text-paper py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8 gap-4 border-b-2 border-paper/30 pb-4">
              <h2 className="font-display uppercase text-4xl md:text-5xl leading-none">Consejos y guías de pesca</h2>
              <Link href="/guias" className="font-mono text-xs font-bold uppercase tracking-widest text-accent hover:underline whitespace-nowrap">Ver blog →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {latestGuides.map((g) => (
                <Link key={g.id} href={`/guias/${g.id}`} className="group flex flex-col bg-paper text-ink rounded-xl overflow-hidden border border-paper/10 hover-shift">
                  <div className="relative aspect-[16/9] bg-[#e6e2d6] overflow-hidden">
                    <ProductImage src={proxiedImage(g.coverImage, g.title)} alt={g.coverImageAlt || g.title} sizes="(max-width: 768px) 100vw, 33vw" className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-display uppercase text-xl leading-tight group-hover:text-accent transition-colors">{g.title}</h3>
                    <p className="text-sm text-ink/65 mt-2 leading-relaxed line-clamp-3 flex-1">{g.excerpt}</p>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-accent mt-4">Leer guía →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 py-16 sm:px-6">
        <h2 className="font-display uppercase text-4xl md:text-5xl leading-none mb-8">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <details key={i} className="border border-ink/12 rounded-xl bg-paper group">
              <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3 font-bold text-ink">
                <span>{f.q}</span>
                <span className="text-accent text-xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="px-5 pb-4 text-sm text-ink/70 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </Layout>
  )
}
