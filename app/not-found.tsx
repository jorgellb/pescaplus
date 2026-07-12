import Link from 'next/link'
import Layout from '@/components/Layout'
import { FISHING_TYPES } from '@/lib/fishing'

export default function NotFound() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-20 sm:py-28 text-center space-y-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent">Error 404</p>
        <h1 className="font-display uppercase text-6xl sm:text-7xl md:text-8xl leading-[0.9] text-ink">
          Se escapó<br />el pez
        </h1>
        <p className="text-ink/60 text-sm max-w-md mx-auto">
          La página que buscas no existe o se movió de sitio. Prueba a buscar un aparejo o vuelve al inicio.
        </p>

        <form action="/search" method="get" className="flex gap-2 max-w-md mx-auto">
          <input
            type="text"
            name="q"
            placeholder="Buscar aparejos…"
            aria-label="Buscar productos"
            className="flex-1 px-4 py-3 bg-paper border border-ink/15 rounded-xl text-ink placeholder-ink/40 focus:outline-none focus:border-accent text-sm"
          />
          <button className="bg-ink text-paper px-6 py-3 text-sm font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover:bg-accent hover:border-accent transition-colors">
            Buscar
          </button>
        </form>

        <div className="flex flex-wrap gap-2 justify-center pt-2">
          <Link
            href="/"
            className="px-4 py-2 text-xs font-bold uppercase tracking-tight bg-ink text-paper border border-ink/15 rounded-full hover:bg-accent hover:border-accent transition-colors"
          >
            Inicio
          </Link>
          {FISHING_TYPES.slice(0, 6).map((t) => (
            <Link
              key={t.id}
              href={`/categories/${t.id}`}
              className="px-4 py-2 text-xs font-bold uppercase tracking-tight text-ink border border-ink/15 rounded-full hover:bg-ink hover:text-paper transition-colors"
            >
              {t.name}
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}
