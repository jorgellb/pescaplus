'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Guide } from '@/types'
import { fishingLabel } from '@/lib/fishing'
import GuideEditor from '@/components/admin/GuideEditor'

export default function AdminGuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Guide | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/guides')
      const data = await res.json()
      if (data.success) setGuides(data.guides)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const remove = async (g: Guide) => {
    if (!confirm(`¿Eliminar la guía "${g.title}"?`)) return
    const res = await fetch(`/api/admin/guides/${g.id}`, { method: 'DELETE' })
    if (res.ok) setGuides((prev) => prev.filter((x) => x.id !== g.id))
    else alert('No se pudo eliminar.')
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Guías y blog</h1>
          <p className="text-sm text-ink/60 mt-1">Crea guías de compra y artículos, manualmente o con IA.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 bg-ink text-paper hover:bg-accent font-extrabold text-sm px-5 py-2.5 border border-ink/15 rounded-xl transition-colors"
        >
          <span className="text-base leading-none">＋</span> Nueva guía
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-ink/60 text-sm">Cargando guías…</div>
      ) : guides.length === 0 ? (
        <div className="py-20 text-center text-ink/60 text-sm border border-ink/15 bg-white rounded-2xl">
          Aún no hay guías. Crea la primera con IA ✨
        </div>
      ) : (
        <div className="overflow-x-auto border border-ink/15 rounded-2xl bg-white">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-ink/50 border-b border-ink/15">
                <th className="px-4 py-3 font-bold">Título</th>
                <th className="px-4 py-3 font-bold">Categoría</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {guides.map((g) => (
                <tr key={g.id} className="border-b border-ink/10 last:border-0 hover:bg-ink/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink truncate max-w-[320px]">{g.title}</p>
                    <p className="text-[11px] text-ink/40">{new Date(g.createdAt).toLocaleDateString('es-ES')}</p>
                  </td>
                  <td className="px-4 py-3 text-ink/70">{g.typeFishing ? fishingLabel(g.typeFishing) : 'General'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${g.published ? 'bg-emerald-100 text-emerald-700' : 'bg-ink/10 text-ink/60'}`}>
                      {g.published ? 'Publicada' : 'Borrador'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`/guias/${g.id}`} target="_blank" className="text-xs font-semibold text-ink/70 hover:text-accent px-3 py-1.5">Ver</a>
                      <button onClick={() => setEditing(g)} className="text-xs font-semibold text-ink/80 hover:text-accent bg-ink/5 border border-ink/15 px-3 py-1.5 rounded-lg">Editar</button>
                      <button onClick={() => remove(g)} className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(editing || creating) && <GuideEditor initial={editing} onClose={closeEditor} onSaved={onSaved} />}
    </div>
  )
}
