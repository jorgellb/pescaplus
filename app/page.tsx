import Link from 'next/link'
import Layout from '@/components/Layout'
import Marquee from '@/components/Marquee'
import ProductCard from '@/components/ProductCard'
import ProductImage from '@/components/ProductImage'
import CategoryIcon from '@/components/graphics/CategoryIcon'
import type { Metadata } from 'next'
import { FISHING_TYPES } from '@/lib/fishing'
import { listProducts } from '@/lib/products-store'
import { getTrendingProducts } from '@/lib/trending'
import { getTaxonomy, categoryName } from '@/lib/taxonomy-store'
import { proxiedImage } from '@/lib/img-proxy'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export const revalidate = 3600

export default async function Home() {
  const [all, featured, taxonomy] = await Promise.all([listProducts(), getTrendingProducts(8), getTaxonomy()])
  const withImg = all.filter((p) => p.imageUrl)
  const heroA = withImg[0]
  const heroB = withImg[1]

  return (
    <Layout>
      {/* HERO */}
      <section className="border-b border-ink/12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-5">
              ● Tienda especializada de pesca
            </p>
            <h1 className="font-display uppercase text-ink leading-[0.9] text-[2.5rem] sm:text-6xl md:text-7xl lg:text-8xl">
              Equípate
              <br />
              como un
              <br />
              <span className="text-accent">profesional</span>
            </h1>
            <p className="mt-6 text-lg text-ink/70 max-w-md leading-snug">
              Cañas, carretes, señuelos y aparejos seleccionados por nuestro equipo de
              pescadores. Calidad probada, al mejor precio.
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
                66 productos
              </span>
            </div>
          </div>
        </div>
      </section>

      <Marquee
        items={[
          'Envío internacional',
          'Selección experta',
          'Fichas detalladas',
          'Precios de fábrica',
          '11 categorías de pesca',
        ]}
      />

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8 gap-4 border-b border-ink/12 pb-4">
          <h2 className="font-display uppercase text-4xl md:text-5xl leading-none">Categorías</h2>
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
                <span className="font-mono text-xs font-bold text-ink/35">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <CategoryIcon id={type.id} className="w-8 h-8 text-ink/70 group-hover:text-accent transition-colors" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-2xl md:text-[1.7rem] leading-none text-ink group-hover:text-accent transition-colors mt-6">
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

      {/* VALUE PROPS */}
      <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-ink/15 rounded-xl shadow-hard-md">
          {[
            { n: '01', t: 'Fichas claras', d: 'Títulos y descripciones detallados y honestos, sin la jerga confusa de otros sitios.' },
            { n: '02', t: 'Selección real', d: 'Filtramos por ventas y valoraciones de compradores reales. Solo lo que merece la pena.' },
            { n: '03', t: 'Compra segura', d: 'Pago protegido y envío con seguimiento. Tu compra siempre respaldada, de forma rápida y sencilla.' },
          ].map((f, i) => (
            <div key={f.n} className={`p-7 ${i < 2 ? 'md:border-r border-ink/12 border-b-2 md:border-b-0' : ''}`}>
              <span className="font-display text-5xl text-accent leading-none">{f.n}</span>
              <h3 className="font-display uppercase text-2xl mt-4 leading-none">{f.t}</h3>
              <p className="text-sm text-ink/70 mt-3 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  )
}
