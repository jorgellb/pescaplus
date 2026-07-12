import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import FavoritesList from '@/components/FavoritesList'

export const metadata: Metadata = {
  title: 'Mis favoritos',
  description: 'Los aparejos de pesca que has guardado en PescaPlus.',
  alternates: { canonical: '/favoritos' },
  robots: { index: false, follow: true },
}

export default function FavoritesPage() {
  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span> <span className="text-ink">Favoritos</span>
          </nav>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">Mis favoritos</h1>
          <p className="text-ink/60 text-sm max-w-xl mt-3">Los aparejos que has guardado. Se conservan en este navegador.</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <FavoritesList />
      </section>
    </Layout>
  )
}
