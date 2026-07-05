'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Layout from '@/components/Layout'
import ProductImage from '@/components/ProductImage'
import type { Product } from '@/types'
import { fishingLabel } from '@/lib/fishing'

export default function ProductPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || ''

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])

  const fetchRelatedProducts = useCallback(
    async (typeFishing: string, currentId: string) => {
      try {
        const response = await fetch(`/api/products?typeFishing=${typeFishing}`)
        const data = await response.json()
        if (data.success) {
          setRelatedProducts(
            data.products.filter((p: Product) => p.id !== currentId).slice(0, 4),
          )
        }
      } catch (error) {
        console.error('Error fetching related products:', error)
      }
    },
    [],
  )

  const fetchProduct = useCallback(async () => {
    setLoading(true)
    setRelatedProducts([])
    try {
      const response = await fetch(`/api/products/${id}`)
      const data = await response.json()
      if (data.success) {
        setProduct(data.product)
        fetchRelatedProducts(data.product.typeFishing, data.product.id)
      } else {
        setProduct(null)
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }, [id, fetchRelatedProducts])

  useEffect(() => {
    if (!id) return
    // Legitimate external sync: load the product from the API when the id changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProduct()
  }, [id, fetchProduct])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-32 text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          </div>
          <p className="text-slate-400 text-sm">Cargando detalles del aparejo...</p>
        </div>
      </Layout>
    )
  }

  if (!product) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-6">
          <span className="text-5xl inline-block">🪝</span>
          <h1 className="text-2xl font-bold text-white">Aparejo no encontrado</h1>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            El producto solicitado no existe o ha sido retirado del catálogo.
          </p>
          <Link
            href="/"
            className="inline-block bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-200 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
          >
            Volver al inicio
          </Link>
        </div>
      </Layout>
    )
  }

  const modalityLabel = fishingLabel(product.typeFishing)

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-8 uppercase tracking-wider">
          <Link href="/" className="hover:text-cyan-400 transition-colors">Inicio</Link>
          <span>/</span>
          <Link
            href={`/categories/${product.typeFishing}`}
            className="hover:text-cyan-400 transition-colors"
          >
            {modalityLabel}
          </Link>
          <span>/</span>
          <span className="text-slate-300 truncate max-w-[200px]">{product.title}</span>
        </div>

        {/* Product Grid Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 p-6 md:p-8 rounded-2xl bg-slate-900/30 border border-white/5 backdrop-blur-md mb-16">
          {/* Left Column: Image */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative overflow-hidden rounded-xl bg-slate-950 aspect-square border border-white/5 group">
              <ProductImage
                src={product.imageUrl}
                alt={product.title}
                priority
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Right Column: Info */}
          <div className="lg:col-span-7 flex flex-col justify-between py-2">
            <div className="space-y-6">
              <span className="inline-flex bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider">
                {modalityLabel}
              </span>

              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {product.title}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex text-amber-400 text-base">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={idx < Math.round(product.rating) ? 'text-amber-400' : 'text-slate-600'}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-sm font-semibold text-slate-200 ml-1">
                  {product.rating.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400">
                  ({product.reviews.toLocaleString('es-ES')} valoraciones de compradores)
                </span>
              </div>

              {/* Price block */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 inline-block">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Precio Recomendado en AliExpress
                </span>
                <span className="text-3xl md:text-4xl font-black text-cyan-300">
                  {product.price.toFixed(2)}{' '}
                  <span className="text-lg font-bold text-slate-400">{product.currency}</span>
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Descripción del Producto
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                  {product.description}
                </p>
              </div>
            </div>

            {/* CTA action */}
            <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
              <a
                href={product.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-slate-950 px-8 py-4 rounded-xl font-black text-lg tracking-wide shadow-lg shadow-green-500/10 hover:shadow-green-500/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                Comprar en AliExpress 🛒
              </a>

              <div className="text-center">
                <span className="text-xs text-slate-500 leading-relaxed block max-w-md mx-auto">
                  Al hacer clic en este botón serás redirigido a la tienda oficial de AliExpress para
                  procesar el pago de forma 100% segura.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="space-y-8">
            <div className="border-l-4 border-cyan-400 pl-3">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Productos Relacionados
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Otros aparejos recomendados para la modalidad de {modalityLabel}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  href={`/products/${relatedProduct.id}`}
                  className="group rounded-xl overflow-hidden bg-slate-900/30 border border-white/5 hover:border-cyan-500/25 shadow-md hover:shadow-cyan-500/5 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                >
                  <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                    <ProductImage
                      src={relatedProduct.imageUrl}
                      alt={relatedProduct.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                    <h3 className="font-bold text-slate-200 group-hover:text-cyan-400 line-clamp-2 transition-colors duration-200 text-sm leading-snug">
                      {relatedProduct.title}
                    </h3>
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Precio</span>
                      <span className="font-extrabold text-cyan-300 text-base">
                        {relatedProduct.price.toFixed(2)}{' '}
                        <span className="text-xs font-semibold text-slate-400">
                          {relatedProduct.currency}
                        </span>
                      </span>
                    </div>
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
