'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Layout from '@/components/Layout'

export default function ProductPage() {
  const params = useParams()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])

  useEffect(() => {
    fetchProduct()
  }, [params.id])

  const fetchProduct = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/products/${params.id}`)
      const data = await response.json()
      if (data.success) {
        setProduct(data.product)
        fetchRelatedProducts(data.product.typeFishing)
      }
    } catch (error) {
      console.error('Error fetching product:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedProducts = async (typeFishing: string) => {
    try {
      const response = await fetch(`/api/products?typeFishing=${typeFishing}`)
      const data = await response.json()
      if (data.success) {
        setRelatedProducts(data.products.filter((p: any) => p.id !== params.id))
      }
    } catch (error) {
      console.error('Error fetching related products:', error)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando producto...</p>
        </div>
      </Layout>
    )
  }

  if (!product) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Producto no encontrado</h1>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-96 object-cover"
            />
          </div>

          <div>
            <span className="text-sm font-semibold text-blue-600 uppercase">
              {product.typeFishing}
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mt-2 mb-4">
              {product.title}
            </h1>

            <div className="flex items-center mb-4">
              <span className="text-yellow-500 text-xl">★</span>
              <span className="ml-2 text-gray-600">
                {product.rating.toFixed(1)} ({product.reviews} reseñas)
              </span>
            </div>

            <div className="text-4xl font-bold text-gray-900 mb-6">
              {product.price} {product.currency}
            </div>

            <p className="text-gray-600 mb-6">{product.description}</p>

            <a
              href={product.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-600 text-white text-center px-8 py-4 rounded-lg font-semibold text-lg hover:bg-green-700 transition"
            >
              Comprar en AliExpress
            </a>

            <p className="text-sm text-gray-500 mt-4 text-center">
              Serás redirigido a AliExpress para completar tu compra
            </p>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Productos Relacionados
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.slice(0, 4).map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  href={`/products/${relatedProduct.id}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition"
                >
                  <img
                    src={relatedProduct.imageUrl}
                    alt={relatedProduct.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">
                      {relatedProduct.title}
                    </h3>
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      {relatedProduct.price} {relatedProduct.currency}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}