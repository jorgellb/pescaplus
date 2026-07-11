import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import ProductCard from '@/components/ProductCard'
import { listProducts } from '@/lib/products-store'
import { retrieveProducts } from '@/lib/retrieval'

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

  // Semantic-ish retrieval first (ranks by keyword overlap + popularity, tolerant
  // of natural-language queries); fall back to the strict AND-term search only
  // when relevance scoring finds nothing.
  let results = query ? await retrieveProducts(query, undefined, 40) : []
  if (query && results.length === 0) results = await listProducts({ search: query })

  const askUrl = `/advice?ask=${encodeURIComponent(`Estoy buscando "${query}". ¿Qué me recomiendas y por qué?`)}`

  return (
    <Layout>
      <section className="bg-paper border-b-2 border-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-3">Búsqueda inteligente</p>
          <h1 className="font-display uppercase text-4xl md:text-5xl leading-none text-ink">
            {query ? `“${query}”` : 'Buscar productos'}
          </h1>
          <form action="/search" method="get" className="mt-6 flex gap-2 max-w-xl">
            <input
              type="text"
              name="q"
              defaultValue={query}
              autoFocus
              placeholder="Ej. algo barato para pescar de noche en el mar…"
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <p className="font-mono text-xs uppercase tracking-widest text-ink/60">
              <span className="font-bold text-ink">{results.length}</span>{' '}
              {results.length === 1 ? 'resultado' : 'resultados'} · por relevancia
            </p>
            <Link
              href={askUrl}
              className="inline-flex items-center gap-2 self-start bg-accent text-paper px-4 py-2.5 text-xs font-bold uppercase tracking-tight border-2 border-ink shadow-hard hover-shift"
            >
              🤖 Pregúntale al asistente IA
            </Link>
          </div>
        )}

        {!query ? (
          <p className="text-ink/60 text-sm">Escribe qué buscas —con tus palabras— y encontramos lo más relevante del catálogo.</p>
        ) : results.length === 0 ? (
          <div className="text-center py-16 border-2 border-ink shadow-hard bg-paper max-w-lg mx-auto px-8 space-y-4">
            <span className="inline-block text-5xl">🔍</span>
            <h3 className="font-display uppercase text-2xl text-ink">Sin resultados directos</h3>
            <p className="text-sm text-ink/60">
              No hemos encontrado una coincidencia exacta. Deja que el asistente IA te oriente según lo que necesitas.
            </p>
            <Link href={askUrl} className="inline-block bg-ink text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide border-2 border-ink hover:bg-accent transition-colors">
              🤖 Preguntar al asistente
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
