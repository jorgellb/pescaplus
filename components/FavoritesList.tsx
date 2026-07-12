'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProductImage from '@/components/ProductImage'
import FavoriteButton from '@/components/FavoriteButton'
import { getFavorites, onFavoritesChanged, type ProductSnapshot } from '@/lib/product-history'

export default function FavoritesList() {
  const [items, setItems] = useState<ProductSnapshot[] | null>(null)

  useEffect(() => {
    const load = () => setItems(getFavorites())
    load()
    return onFavoritesChanged(load)
  }, [])

  if (items === null) {
    return <div className="py-16 text-center text-ink/50 text-sm">Cargando tus favoritos…</div>
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 border border-ink/15 rounded-xl shadow-hard bg-paper max-w-lg mx-auto px-8 space-y-4">
        <span className="inline-block text-5xl">💚</span>
        <h2 className="font-display uppercase text-2xl text-ink">Aún no tienes favoritos</h2>
        <p className="text-sm text-ink/60">Pulsa el corazón en cualquier producto para guardarlo aquí y encontrarlo fácilmente.</p>
        <Link href="/categories/canas" className="inline-block bg-ink text-paper px-6 py-3 text-sm font-bold uppercase border border-ink/15 rounded-xl shadow-hard hover-shift">
          Explorar catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {items.map((p) => (
        <div key={p.id} className="group relative flex flex-col h-full bg-paper border border-ink/10 rounded-2xl overflow-hidden shadow-hard hover-shift">
          <div className="relative aspect-square overflow-hidden bg-[#e6e2d6]">
            <ProductImage src={p.imageUrl} alt={p.title} sizes="(max-width: 640px) 50vw, 22vw" className="absolute inset-0 w-full h-full object-cover" />
            <Link href={`/products/${p.id}`} className="absolute inset-0 z-10" aria-label={p.title} />
            <FavoriteButton product={p} className="absolute top-2.5 right-2.5 z-20" />
          </div>
          <div className="p-4 flex flex-col flex-1">
            <Link href={`/products/${p.id}`} className="block flex-1">
              <h3 className="text-[15px] font-semibold text-ink group-hover:text-accent line-clamp-2 leading-snug transition-colors">{p.title}</h3>
            </Link>
            <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-ink/10">
              <span className="font-display text-[26px] leading-none text-ink">
                {p.price.toFixed(2)}<span className="text-sm align-top">{p.currency === 'EUR' ? '€' : ` ${p.currency}`}</span>
              </span>
              <a href={`/go/${p.id}`} target="_blank" rel="noopener noreferrer sponsored" className="relative z-20 inline-flex items-center text-xs font-bold uppercase tracking-wide text-paper bg-ink hover:bg-accent px-3.5 py-2 rounded-lg transition-colors">
                Comprar
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
