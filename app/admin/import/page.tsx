'use client'

import { useState } from 'react'
import type { Product } from '@/types'
import { FISHING_TYPES, fishingLabel } from '@/lib/fishing'
import ProductImage from '@/components/ProductImage'

type ImportState = 'idle' | 'loading' | 'done' | 'error'

export default function AdminImportPage() {
  const [category, setCategory] = useState<string>(FISHING_TYPES[0].id)
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<Record<string, ImportState>>({})
  const [notConfigured, setNotConfigured] = useState(false)

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    setError('')
    setSearched(true)
    setStatus({})
    try {
      const q = new URLSearchParams({ category })
      if (keyword.trim()) q.set('keyword', keyword.trim())
      const res = await fetch(`/api/admin/aliexpress-search?${q}`)
      if (res.status === 503) {
        setNotConfigured(true)
        setResults([])
        return
      }
      const data = await res.json()
      setResults(data.success ? data.products : [])
      if (!data.success) setError(data.error || 'Error en la búsqueda')
    } catch {
      setError('Error de red al buscar en AliExpress')
    } finally {
      setLoading(false)
    }
  }

  const importProduct = async (product: Product) => {
    setStatus((s) => ({ ...s, [product.id]: 'loading' }))
    try {
      const res = await fetch('/api/admin/import-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          title: product.title,
          price: product.price,
          currency: product.currency,
          imageUrl: product.imageUrl,
          images: product.images,
          videoUrl: product.videoUrl,
          affiliateUrl: product.affiliateUrl,
          typeFishing: category,
          rating: product.rating,
          reviews: product.reviews,
        }),
      })
      const data = await res.json()
      setStatus((s) => ({ ...s, [product.id]: data.success ? 'done' : 'error' }))
    } catch {
      setStatus((s) => ({ ...s, [product.id]: 'error' }))
    }
  }

  if (notConfigured) {
    return (
      <div className="max-w-xl mx-auto text-center py-24 space-y-4">
        <span className="text-5xl">🔌</span>
        <h1 className="text-xl font-bold text-white">AliExpress no está configurado</h1>
        <p className="text-sm text-slate-400">
          Define <code className="font-mono text-cyan-400">ALIEXPRESS_APP_KEY</code> y{' '}
          <code className="font-mono text-cyan-400">ALIEXPRESS_APP_SECRET</code> en tu <code>.env</code> para
          importar productos reales.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Importar de AliExpress con IA</h1>
        <p className="text-sm text-slate-400 mt-1">
          Busca por modalidad y el agente NVIDIA generará una ficha SEO original (título y descripción propios),
          trayendo imágenes y vídeo del producto.
        </p>
      </div>

      {/* Search bar */}
      <form
        onSubmit={search}
        className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl border border-white/5 bg-slate-900/30"
      >
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2.5 bg-slate-950/80 border border-white/10 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50"
        >
          {FISHING_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.icon} {t.name}
            </option>
          ))}
        </select>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Palabra clave opcional (ej: carrete estanco)…"
          className="flex-1 px-3 py-2.5 bg-slate-950/80 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm px-6 py-2.5 rounded-lg active:scale-[0.98] transition-all disabled:opacity-40"
        >
          {loading ? 'Buscando…' : 'Buscar 🔍'}
        </button>
      </form>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Results */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm">Consultando AliExpress…</div>
      ) : searched && results.length === 0 && !error ? (
        <div className="py-20 text-center text-slate-400 text-sm border border-white/5 rounded-2xl bg-slate-900/20">
          Sin resultados. Prueba otra categoría o palabra clave.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((p) => {
            const st = status[p.id] ?? 'idle'
            return (
              <div
                key={p.id}
                className="rounded-xl overflow-hidden border border-white/5 bg-slate-900/30 flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-slate-950">
                  <ProductImage src={p.imageUrl} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
                  {p.videoUrl && (
                    <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      ▶ Vídeo
                    </span>
                  )}
                  <span className="absolute bottom-2 left-2 bg-slate-950/80 text-cyan-300 text-xs font-bold px-2 py-1 rounded-lg border border-cyan-500/20">
                    {p.price.toFixed(2)} {p.currency}
                  </span>
                </div>
                <div className="p-4 flex flex-col flex-1 gap-3">
                  <p className="text-xs text-slate-300 line-clamp-2 leading-snug flex-1" title={p.title}>
                    {p.title}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{fishingLabel(category)}</span>
                    <span>{p.reviews.toLocaleString('es-ES')} vendidos · {p.images.length} 📷</span>
                  </div>
                  {st === 'done' ? (
                    <span className="text-center text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-2">
                      ✓ Importado con IA
                    </span>
                  ) : st === 'error' ? (
                    <button
                      onClick={() => importProduct(p)}
                      className="text-xs font-bold text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg py-2"
                    >
                      ✕ Error · reintentar
                    </button>
                  ) : (
                    <button
                      onClick={() => importProduct(p)}
                      disabled={st === 'loading'}
                      className="text-xs font-extrabold text-slate-950 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 rounded-lg py-2 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {st === 'loading' ? 'Generando ficha SEO…' : 'Importar con IA ✨'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
