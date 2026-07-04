'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import ProductCard from '@/components/ProductCard'

export default function CategoryPage({ params }: { params: { category: string } }) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const categoryNames: Record<string, string> = {
    spinning: 'Spinning',
    flyfishing: 'Fly Fishing',
    carp: 'Carp Fishing',
    sea: 'Sea Fishing',
    baitcasting: 'Baitcasting',
    accessories: 'Accesorios',
  }

  const categoryName = categoryNames[params.category] || params.category

  const fetchProducts = async (search?: string) => {
    setLoading(true)
    try {
      const url = search
        ? `/api/products?search=${encodeURIComponent(search)}&typeFishing=${params.category}`
        : `/api/products?typeFishing=${params.category}`
      
      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProducts(searchQuery)
  }

  return (
    <Layout>
      <div className="bg-blue-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">{categoryName}</h1>
          <p className="text-lg">
            Encuentra los mejores productos para {categoryName.toLowerCase()}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <form onSubmit={handleSearch} className="mb-8 flex gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar productos..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              fetchProducts()
            }}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
          >
            Ver todos
          </button>
        </form>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Cargando productos...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No hay productos disponibles en esta categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                {...product}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}