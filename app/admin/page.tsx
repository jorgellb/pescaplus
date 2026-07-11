'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Product } from '@/types'
import { fishingLabel } from '@/lib/fishing'
import ProductImage from '@/components/ProductImage'
import ProductEditor from '@/components/admin/ProductEditor'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [backend, setBackend] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [prodRes, cfgRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/admin/settings'),
      ])
      const prodData = await prodRes.json()
      if (prodData.success) setProducts(prodData.products)
      const cfgData = await cfgRes.json().catch(() => null)
      if (cfgData?.success) setBackend(cfgData.integrations.database.backend)
    } catch (error) {
      console.error('Error loading admin products:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const remove = async (product: Product) => {
    if (!confirm(`¿Eliminar "${product.title}"? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
    } else {
      alert('No se pudo eliminar el producto.')
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.title.toLowerCase().includes(q))
  }, [products, query])

  const stats = useMemo(() => {
    const total = products.length
    const avgRating = total
      ? products.reduce((sum, p) => sum + p.rating, 0) / total
      : 0
    const categories = new Set(products.map((p) => p.typeFishing)).size
    const avgPrice = total ? products.reduce((sum, p) => sum + p.price, 0) / total : 0
    return { total, avgRating, categories, avgPrice }
  }, [products])

  const closeEditor = () => {
    setEditing(null)
    setCreating(false)
  }
  const onSaved = () => {
    closeEditor()
    load()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Productos</h1>
          <p className="text-sm text-ink/60 mt-1">
            Crea, edita y elimina productos manualmente o con ayuda de la IA.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 bg-ink text-paper hover:bg-accent font-extrabold text-sm px-5 py-2.5 rounded-xl shadow-md  active:scale-[0.98] transition-all"
        >
          <span className="text-base leading-none">＋</span> Nuevo producto
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Productos" value={String(stats.total)} icon="📦" />
        <StatCard label="Modalidades" value={String(stats.categories)} icon="🎯" />
        <StatCard label="Valoración media" value={stats.avgRating.toFixed(2)} icon="⭐" />
        <StatCard label="Precio medio" value={`${stats.avgPrice.toFixed(2)} €`} icon="💶" />
      </div>

      {backend && (
        <p className="text-xs text-ink/50">
          Almacenamiento activo:{' '}
          <span className={backend === 'database' ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
            {backend === 'database' ? 'Base de datos (persistente)' : 'En memoria (demo, se reinicia con el servidor)'}
          </span>
        </p>
      )}

      {/* Search */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filtrar por título…"
        className="w-full sm:max-w-xs px-4 py-2.5 bg-paper border border-ink/15 rounded-xl text-ink placeholder-ink/40 focus:outline-none focus:border-accent text-sm transition-all"
      />

      {/* Table */}
      {loading ? (
        <div className="py-24 text-center text-ink/60 text-sm">Cargando productos…</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-ink/60 text-sm border border-ink/15 rounded-2xl bg-white">
          No hay productos que coincidan.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink/15 bg-white">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-ink/50 border-b border-ink/15">
                <th className="px-4 py-3 font-bold">Producto</th>
                <th className="px-4 py-3 font-bold">Modalidad</th>
                <th className="px-4 py-3 font-bold">Precio</th>
                <th className="px-4 py-3 font-bold">Valoración</th>
                <th className="px-4 py-3 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-ink/15 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-paper border border-ink/15 flex-shrink-0">
                        <ProductImage src={p.imageUrl} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink truncate max-w-[280px]">{p.title}</p>
                        <p className="text-[11px] text-ink/50">{p.inStock ? 'En stock' : 'Sin stock'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-accent bg-accent/10 border border-accent/40 px-2 py-0.5 rounded-full">
                      {fishingLabel(p.typeFishing)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-accent">
                    {p.price.toFixed(2)} <span className="text-xs text-ink/60 font-medium">{p.currency}</span>
                  </td>
                  <td className="px-4 py-3 text-ink/80">
                    <span className="text-amber-400">★</span> {p.rating.toFixed(1)}{' '}
                    <span className="text-xs text-ink/50">({p.reviews})</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditing(p)}
                        className="text-xs font-semibold text-ink/80 hover:text-accent bg-ink/5 hover:bg-ink/10 border border-ink/15 px-3 py-1.5 rounded-lg transition-all"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => remove(p)}
                        className="text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg transition-all"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(editing || creating) && (
        <ProductEditor initial={editing} onClose={closeEditor} onSaved={onSaved} />
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-ink/15 bg-white p-4 flex items-center gap-3">
      <span className="text-2xl p-2.5 bg-paper rounded-xl border border-ink/15">{icon}</span>
      <div>
        <p className="text-xl font-extrabold text-ink leading-none">{value}</p>
        <p className="text-[11px] uppercase tracking-widest text-ink/50 mt-1">{label}</p>
      </div>
    </div>
  )
}
