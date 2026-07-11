import Link from 'next/link'
import Layout from '@/components/Layout'
import Marquee from '@/components/Marquee'
import ProductCard from '@/components/ProductCard'
import ProductImage from '@/components/ProductImage'
import CategoryIcon from '@/components/graphics/CategoryIcon'
import { FISHING_TYPES } from '@/lib/fishing'
import { listProducts } from '@/lib/products-store'

export const revalidate = 3600

export default async function Home() {
  const all = await listProducts()
  const withImg = all.filter((p) => p.imageUrl)
  const heroA = withImg[0]
  const heroB = withImg[1]
  const featured = withImg.slice(0, 8)

  return (
    <Layout>
      {/* HERO */}
      <section className="border-b-2 border-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-5">
              ● Tienda de pesca · Curada con IA
            </p>
            <h1 className="font-display uppercase text-ink leading-[0.86] text-6xl sm:text-7xl md:text-8xl">
              Equípate
              <br />
              como un
              <br />
              <span className="text-accent">profesional</span>
            </h1>
            <p className="mt-6 text-lg text-ink/70 max-w-md leading-snug">
              Cañas, carretes, señuelos y aparejos de AliExpress, seleccionados y con fichas
              redactadas por inteligencia artificial.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/categories/canas" className="bg-ink text-paper px-7 py-4 text-sm font-bold uppercase tracking-wide border-2 border-ink shadow-hard hover-shift hover:bg-accent hover:border-accent">
                Ver catálogo →
              </Link>
              <Link href="/advice" className="bg-paper text-ink px-7 py-4 text-sm font-bold uppercase tracking-wide border-2 border-ink shadow-hard hover-shift">
                Asistente IA 🤖
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative">
              {heroA && (
                <div className="relative aspect-[4/5] border-2 border-ink shadow-hard-lg overflow-hidden bg-[#e6e2d6]">
                  <ProductImage src={heroA.imageUrl} alt={heroA.title} priority sizes="(max-width: 1024px) 90vw, 40vw" className="absolute inset-0 w-full h-full object-cover" />
                  <Link href={`/products/${heroA.id}`} className="absolute inset-0" aria-label={heroA.title} />
                </div>
              )}
              {heroB && (
                <div className="hidden sm:block absolute -bottom-8 -left-8 w-40 aspect-square border-2 border-ink shadow-hard bg-[#e6e2d6] overflow-hidden">
                  <ProductImage src={heroB.imageUrl} alt={heroB.title} sizes="200px" className="absolute inset-0 w-full h-full object-cover" />
                </div>
              )}
              <span className="absolute -top-5 -right-3 rotate-6 bg-accent text-paper font-display text-lg uppercase px-4 py-2 border-2 border-ink shadow-hard">
                66 productos
              </span>
            </div>
          </div>
        </div>
      </section>

      <Marquee
        items={[
          'Envío internacional',
          '66 productos seleccionados',
          'Fichas optimizadas con IA',
          'Comisión segura',
          '11 categorías de pesca',
        ]}
      />

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8 gap-4 border-b-2 border-ink pb-4">
          <h2 className="font-display uppercase text-4xl md:text-5xl leading-none">Categorías</h2>
          <span className="font-mono text-xs uppercase tracking-widest text-ink/50 hidden sm:block">Elige tu aparejo</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {FISHING_TYPES.map((type, i) => (
            <Link
              key={type.id}
              href={`/categories/${type.id}`}
              className="group relative flex flex-col justify-between p-5 min-h-[10rem] border-2 border-ink -ml-[2px] -mt-[2px] bg-paper hover:bg-ink transition-colors"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs font-bold text-ink/40 group-hover:text-paper/50">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <CategoryIcon id={type.id} className="w-8 h-8 text-ink group-hover:text-accent transition-colors" strokeWidth={1.6} />
              </div>
              <h3 className="font-display uppercase text-xl md:text-2xl leading-none text-ink group-hover:text-paper transition-colors mt-6">
                {type.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      {featured.length > 0 && (
        <section className="bg-ink text-paper border-y-2 border-ink py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8 gap-4 border-b-2 border-paper/30 pb-4">
              <h2 className="font-display uppercase text-4xl md:text-5xl leading-none">Lo más buscado</h2>
              <Link href="/categories/canas" className="font-mono text-xs font-bold uppercase tracking-widest text-accent hover:underline whitespace-nowrap">Ver todo →</Link>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-ink shadow-hard-md">
          {[
            { n: '01', t: 'Fichas con IA', d: 'Títulos y descripciones redactados por IA, claros y honestos, sin la jerga confusa de los marketplaces.' },
            { n: '02', t: 'Selección real', d: 'Filtramos por ventas y valoraciones de compradores reales. Solo lo que merece la pena.' },
            { n: '03', t: 'Compra segura', d: 'Enlaces oficiales de AliExpress. Pagas en su tienda, de forma rápida y protegida.' },
          ].map((f, i) => (
            <div key={f.n} className={`p-7 ${i < 2 ? 'md:border-r-2 border-ink border-b-2 md:border-b-0' : ''}`}>
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
