'use client'

import { useState, useMemo } from 'react'
import type { Product } from '@/types'
import type { Subcategory } from '@/lib/fishing'
import ProductCard from '@/components/ProductCard'

type SortKey = 'relevance' | 'price-asc' | 'price-desc' | 'rating'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'relevance', label: 'Relevancia' },
  { key: 'price-asc', label: 'Precio: menor a mayor' },
  { key: 'price-desc', label: 'Precio: mayor a menor' },
  { key: 'rating', label: 'Mejor valorados' },
]

const inputCls =
  'w-full px-4 py-3 bg-paper border-2 border-ink text-ink placeholder-ink/40 focus:outline-none focus:border-accent text-sm transition-colors'

export default function CategoryBrowser({
  category,
  initialProducts,
  subcategories,
}: {
  category: string
  initialProducts: Product[]
  subcategories: Subcategory[]
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('relevance')
  const [sub, setSub] = useState('')

  // Subcategory chips: only those with at least one product in the full category.
  const subFilters = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of initialProducts) if (p.subcategory) counts.set(p.subcategory, (counts.get(p.subcategory) ?? 0) + 1)
    return subcategories
      .filter((s) => counts.has(s.id))
      .map((s) => ({ ...s, count: counts.get(s.id) ?? 0 }))
  }, [initialProducts, subcategories])

  const search = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) {
      setProducts(initialProducts)
      return
    }
    setLoading(true)
    try {
      const query = new URLSearchParams({ typeFishing: category, search: q })
      const res = await fetch(`/api/products?${query.toString()}`)
      const data = await res.json()
      setProducts(data.success ? data.products : [])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setSearchQuery('')
    setSort('relevance')
    setSub('')
    setProducts(initialProducts)
  }

  const sortedProducts = useMemo(() => {
    const copy = (sub ? products.filter((p) => p.subcategory === sub) : products).slice()
    switch (sort) {
      case 'price-asc':
        return copy.sort((a, b) => a.price - b.price)
      case 'price-desc':
        return copy.sort((a, b) => b.price - a.price)
      case 'rating':
        return copy.sort((a, b) => b.rating - a.rating)
      default:
        return copy
    }
  }, [products, sort, sub])

  return (
    <>
      <div className="mb-8 flex flex-col sm:flex-row gap-3">
        <form onSubmit={search} className="flex gap-2 flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en esta categoría…"
            className={inputCls}
          />
          <button type="submit" className="bg-ink text-paper px-5 py-3 text-sm font-bold uppercase tracking-wide border-2 border-ink shadow-hard hover:bg-accent hover:border-accent transition-colors whitespace-nowrap">
            Buscar
          </button>
        </form>
        <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-ink/60">
          <span className="font-bold whitespace-nowrap">Ordenar</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="bg-paper border-2 border-ink px-3 py-3 text-ink text-sm focus:outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {subFilters.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSub('')}
            className={`px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-tight border-2 border-ink transition-colors ${
              sub === '' ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink hover:text-paper'
            }`}
          >
            Todas
          </button>
          {subFilters.map((s) => (
            <button
              key={s.id}
              onClick={() => setSub(s.id)}
              className={`px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-tight border-2 border-ink transition-colors ${
                sub === s.id ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink hover:text-paper'
              }`}
            >
              {s.name} <span className="opacity-50">{s.count}</span>
            </button>
          ))}
        </div>
      )}

      {!loading && sortedProducts.length > 0 && (
        <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-6">
          <span className="font-bold text-ink">{sortedProducts.length}</span> {sortedProducts.length === 1 ? 'producto' : 'productos'}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-ink border-t-accent animate-spin" />
          <p className="font-mono text-xs uppercase tracking-widest text-ink/50">Buscando…</p>
        </div>
      ) : sortedProducts.length === 0 ? (
        <div className="text-center py-16 border-2 border-ink shadow-hard bg-paper max-w-lg mx-auto px-8 space-y-4">
          <span className="inline-block text-5xl">⚓</span>
          <h3 className="font-display uppercase text-2xl text-ink">Sin productos</h3>
          <p className="text-sm text-ink/60 max-w-sm mx-auto">Prueba con otras palabras clave o restablece el filtro.</p>
          <button onClick={reset} className="bg-ink text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide border-2 border-ink hover:bg-accent transition-colors">
            Ver todos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {sortedProducts.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      )}
    </>
  )
}
