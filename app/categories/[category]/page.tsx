'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
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
  const category = Array.isArray(params?.category)
    ? params.category[0]
    : params?.category || ''

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('relevance')

  const fishingType = getFishingType(category)
  const categoryName = fishingType?.name ?? category
  const categoryDescription =
    fishingType?.tagline ?? 'Los mejores aparejos para tus salidas de pesca.'

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
    // Legitimate external sync: (re)fetch the products API when the category changes.
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

  return (
    <Layout>
      {/* Category Banner */}
      <section className="relative overflow-hidden py-16 bg-gradient-to-r from-slate-900 via-[#0B1528] to-slate-900 border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(14,116,144,0.1),rgba(255,255,255,0))]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center gap-4">
            {fishingType && (
              <span className="inline-flex flex-shrink-0 text-cyan-400 p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/15">
                <CategoryIcon id={fishingType.id} className="w-9 h-9" strokeWidth={1.4} />
              </span>
            )}
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Categoría</span>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-none">
                {categoryName}
              </h1>
            </div>
          </div>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mt-4">{categoryDescription}</p>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Search & Actions Toolbar */}
        <div className="mb-8 p-4 rounded-2xl bg-slate-900/20 border border-white/5 backdrop-blur-md">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 text-base">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar carretes, cañas, señuelos..."
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 text-sm transition-all"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 sm:flex-none bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 px-6 py-3 rounded-xl font-bold text-sm shadow-md shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer"
              >
                Buscar
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="bg-slate-800/80 hover:bg-slate-800 border border-white/5 hover:border-white/10 text-slate-300 hover:text-white px-5 py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                Ver todos
              </button>
            </div>
          </form>
        </div>

        {/* Result summary + sorting */}
        {!loading && products.length > 0 && (
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-slate-400">
              <span className="font-bold text-slate-200">{products.length}</span>{' '}
              {products.length === 1 ? 'producto encontrado' : 'productos encontrados'}
            </p>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <span className="uppercase tracking-widest font-bold">Ordenar</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 cursor-pointer"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* Product Grid / States */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            </div>
            <p className="text-slate-400 font-medium text-sm">Cargando aparejos seleccionados...</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-20 p-8 rounded-2xl bg-slate-900/10 border border-white/5 max-w-lg mx-auto space-y-6">
            <span className="inline-block text-5xl">⚓</span>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-200">No hay productos disponibles</h3>
              <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                No encontramos productos que coincidan con la búsqueda. Intenta usar otras palabras
                clave o restablecer el filtro.
              </p>
            </div>
            <button
              onClick={resetFilters}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl font-semibold text-xs border border-white/5 transition-all"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}
