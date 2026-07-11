import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import ProductImage from '@/components/ProductImage'
import CategoryIcon from '@/components/graphics/CategoryIcon'
import { getRoundupPreviews, ROUNDUP_YEAR } from '@/lib/roundups'

export const revalidate = 3600

export const metadata: Metadata = {
  title: `Mejores productos de pesca de ${ROUNDUP_YEAR} — Guías de compra`,
  description: `Guías de compra y comparativas de los mejores productos de pesca de ${ROUNDUP_YEAR}: cañas, carretes, señuelos, líneas y más, seleccionados por valoraciones reales.`,
  alternates: { canonical: '/mejores' },
}

export default async function MejoresHub() {
  const previews = await getRoundupPreviews()

  return (
    <Layout>
      <section className="bg-paper border-b-2 border-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4">● Guías de compra {ROUNDUP_YEAR}</p>
          <h1 className="font-display uppercase text-5xl md:text-7xl leading-[0.88] text-ink max-w-3xl">
            Los mejores productos de pesca
          </h1>
          <p className="text-ink/70 text-base max-w-2xl mt-5 leading-relaxed">
            Comparativas honestas por categoría, ordenadas por ventas y valoraciones reales de compradores. Elige mejor, compra más barato.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {previews.map((p) => (
            <Link
              key={p.slug}
              href={`/mejores/${p.slug}`}
              className="group flex flex-col border-2 border-ink shadow-hard bg-paper hover-shift overflow-hidden"
            >
              <div className="relative aspect-[16/10] bg-[#e6e2d6] border-b-2 border-ink overflow-hidden">
                <ProductImage src={p.cover} alt={p.name} sizes="(max-width: 640px) 100vw, 33vw" className="absolute inset-0 w-full h-full object-cover" />
                <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 bg-paper text-ink px-2.5 py-1 border-2 border-ink text-[11px] font-bold uppercase tracking-tight">
                  <CategoryIcon id={p.slug} className="w-3.5 h-3.5" strokeWidth={2} /> {p.count} modelos
                </span>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h2 className="font-display uppercase text-xl md:text-2xl leading-none text-ink group-hover:text-accent transition-colors">
                  Mejores {p.name}
                </h2>
                <p className="text-sm text-ink/60 mt-2 leading-snug flex-1">{p.tagline}</p>
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mt-4">
                  {p.priceFrom ? `Desde ${p.priceFrom.toFixed(2)} €` : 'Ver comparativa'} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </Layout>
  )
}
