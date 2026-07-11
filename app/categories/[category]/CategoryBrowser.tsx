'use client'

import { useState, useMemo } from 'react'
import type { Product } from '@/types'
import ProductCard from '@/components/ProductCard'

type SortKey = 'relevance' | 'price-asc' | 'price-desc' | 'rating'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'relevance', label: 'Relevancia' },
  { key: 'price-asc', label: 'Precio: menor a mayor' },
  { key: 'price-desc', label: 'Precio: mayor a menor' },
  { key: 'rating', label: 'Mejor valorados' },
]

const inputCls =
  'w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 text-sm transition-all'

export default function CategoryBrowser({
  category,
  initialProducts,
}: {
  category: string
  initialProducts: Product[]
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('relevance')

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
    setProducts(initialProducts)
  }

  const sortedProducts = useMemo(() => {
    const copy = [...products]
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
  }, [products, sort])

  return (
    <>
      <div className="mb-8 flex flex-col sm:flex-row gap-3">
        <form onSubmit={search} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en esta categoría..."
              className={`${inputCls} pl-10`}
            />
          </div>
          <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm active:scale-[0.98] transition-all">
            Buscar
          </button>
        </form>
        <label className="flex items-center gap-2 text-xs text-slate-500 sm:justify-end">
          <span className="font-semibold uppercase tracking-wide whitespace-nowrap">Ordenar</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-700 text-sm focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {!loading && products.length > 0 && (
        <p className="text-sm text-slate-500 mb-6">
          <span className="font-bold text-slate-800">{products.length}</span> {products.length === 1 ? 'producto' : 'productos'}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-sky-500 animate-spin" />
          <p className="text-slate-400 text-sm">Buscando...</p>
        </div>
      ) : sortedProducts.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-white border border-slate-200 max-w-lg mx-auto px-8 space-y-5">
          <span className="inline-block text-5xl">⚓</span>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-800">No hay productos</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">Prueba con otras palabras clave o restablece el filtro.</p>
          </div>
          <button onClick={reset} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all">
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
