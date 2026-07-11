import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import ProductCard from '@/components/ProductCard'
import { listProducts } from '@/lib/products-store'

export const metadata: Metadata = {
  title: 'Buscar',
  // Search result pages should not be indexed.
  robots: { index: false, follow: true },
}

export const dynamic = 'force-dynamic'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  const results = query ? await listProducts({ search: query }) : []

  return (
    <Layout>
      <section className="bg-paper border-b-2 border-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-3">Búsqueda</p>
          <h1 className="font-display uppercase text-4xl md:text-5xl leading-none text-ink">
            {query ? `“${query}”` : 'Buscar productos'}
          </h1>
          <form action="/search" method="get" className="mt-6 flex gap-2 max-w-xl">
            <input
              type="text"
              name="q"
              defaultValue={query}
              autoFocus
              placeholder="Cañas, carretes, señuelos…"
              className="flex-1 px-4 py-3 bg-paper border-2 border-ink text-ink placeholder-ink/40 focus:outline-none focus:border-accent text-sm"
            />
            <button className="bg-ink text-paper px-6 py-3 text-sm font-bold uppercase tracking-wide border-2 border-ink shadow-hard hover:bg-accent hover:border-accent transition-colors">
              Buscar
            </button>
          </form>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {query && (
          <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-6">
            <span className="font-bold text-ink">{results.length}</span>{' '}
            {results.length === 1 ? 'resultado' : 'resultados'}
          </p>
        )}

        {!query ? (
          <p className="text-ink/60 text-sm">Escribe algo para buscar en todo el catálogo.</p>
        ) : results.length === 0 ? (
          <div className="text-center py-16 border-2 border-ink shadow-hard bg-paper max-w-lg mx-auto px-8 space-y-4">
            <span className="inline-block text-5xl">🔍</span>
            <h3 className="font-display uppercase text-2xl text-ink">Sin resultados</h3>
            <p className="text-sm text-ink/60">Prueba con otras palabras clave o explora por categorías.</p>
            <Link href="/" className="inline-block bg-ink text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide border-2 border-ink hover:bg-accent transition-colors">
              Volver al inicio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {results.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}
