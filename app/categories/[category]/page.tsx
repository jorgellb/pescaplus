'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Layout from '@/components/Layout'
import ProductCard from '@/components/ProductCard'
import type { Product } from '@/types'
import { getFishingType } from '@/lib/fishing'
import CategoryIcon from '@/components/graphics/CategoryIcon'

type SortKey = 'relevance' | 'price-asc' | 'price-desc' | 'rating'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'relevance', label: 'Relevancia' },
  { key: 'price-asc', label: 'Precio: menor a mayor' },
  { key: 'price-desc', label: 'Precio: mayor a menor' },
  { key: 'rating', label: 'Mejor valorados' },
]

export default function CategoryPage() {
  const params = useParams()
  const category = Array.isArray(params?.category) ? params.category[0] : params?.category || ''

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('relevance')

  const fishingType = getFishingType(category)
  const categoryName = fishingType?.name ?? category
  const categoryDescription = fishingType?.tagline ?? 'Los mejores aparejos para tus salidas de pesca.'

  const fetchProducts = useCallback(
    async (search?: string) => {
      setLoading(true)
      try {
        const query = new URLSearchParams({ typeFishing: category })
        if (search) query.set('search', search)
        const response = await fetch(`/api/products?${query.toString()}`)
        const data = await response.json()
        setProducts(data.success ? data.products : [])
      } catch (error) {
        console.error('Error fetching products:', error)
        setProducts([])
      } finally {
        setLoading(false)
      }
    },
    [category],
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProducts(searchQuery)
  }

  const resetFilters = () => {
    setSearchQuery('')
    setSort('relevance')
    fetchProducts()
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts()
  }, [fetchProducts])

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

  const inputCls =
    'w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 text-sm transition-all'

  return (
    <Layout>
      {/* Banner */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="text-xs text-slate-400 mb-4">
            <Link href="/" className="hover:text-sky-600">Inicio</Link> <span className="mx-1">/</span>{' '}
            <span className="text-slate-600 font-medium">{categoryName}</span>
          </nav>
          <div className="flex items-center gap-4">
            {fishingType && (
              <span className={`inline-flex flex-shrink-0 text-slate-700 p-3.5 rounded-2xl bg-gradient-to-br ${fishingType.color} ring-1 ring-slate-900/5`}>
                <CategoryIcon id={fishingType.id} className="w-9 h-9" strokeWidth={1.5} />
              </span>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">{categoryName}</h1>
              <p className="text-slate-500 text-sm md:text-base mt-1 max-w-xl">{categoryDescription}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {/* Toolbar */}
        <div className="mb-8 flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
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
            <button
              type="submit"
              className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm active:scale-[0.98] transition-all"
            >
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
              {SORT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        {!loading && products.length > 0 && (
          <p className="text-sm text-slate-500 mb-6">
            <span className="font-bold text-slate-800">{products.length}</span>{' '}
            {products.length === 1 ? 'producto' : 'productos'}
          </p>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-sky-500 animate-spin" />
            <p className="text-slate-400 text-sm">Cargando productos...</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-20 rounded-2xl bg-white border border-slate-200 max-w-lg mx-auto px-8 space-y-5">
            <span className="inline-block text-5xl">⚓</span>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-800">No hay productos</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                No encontramos resultados. Prueba con otras palabras clave o restablece el filtro.
              </p>
            </div>
            <button
              onClick={resetFilters}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
            >
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
      </section>
    </Layout>
  )
}
