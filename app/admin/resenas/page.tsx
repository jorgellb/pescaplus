'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Review } from '@/lib/reviews-store'
import Icon from '@/components/icons/Icon'
import { useConfirm, useToast } from '@/components/admin/AdminFeedback'

type AdminReview = Review & { operatorName: string; subjectName: string }

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todas' | 'toOperator' | 'toAngler'>('todas')
  const confirm = useConfirm()
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/resenas')
      const data = await res.json()
      if (data.success) setReviews(data.reviews)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const remove = async (r: AdminReview) => {
    const ok = await confirm({ title: 'Eliminar reseña', message: `¿Eliminar la reseña de "${r.authorName}"? Esta acción no se puede deshacer.`, tone: 'danger' })
    if (!ok) return
    const res = await fetch(`/api/admin/resenas/${r.id}`, { method: 'DELETE' })
    if (res.ok) { setReviews((prev) => prev.filter((x) => x.id !== r.id)); toast('Reseña eliminada.') }
    else toast('No se pudo eliminar.', 'error')
  }

  const visible = filter === 'todas' ? reviews : reviews.filter((r) => r.direction === filter)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ink/[0.07] pb-4">
        <div>
          <h1 className="font-display uppercase text-3xl md:text-4xl text-ink leading-none">Reseñas</h1>
          <p className="text-ink/60 text-sm mt-1">Moderación: elimina reseñas ofensivas, spam o publicadas por error.</p>
        </div>
        <div className="flex items-center gap-2">
          {(['todas', 'toOperator', 'toAngler'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${filter === f ? 'bg-accent/10 text-accent border border-accent/40' : 'text-ink/60 border border-transparent hover:bg-ink/5'}`}
            >
              {f === 'todas' ? 'Todas' : f === 'toOperator' ? 'A patrones' : 'A pescadores'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-ink/60 text-sm">Cargando reseñas…</div>
      ) : visible.length === 0 ? (
        <div className="py-20 text-center text-ink/60 text-sm border border-ink/10 bg-white rounded-2xl">No hay reseñas que coincidan.</div>
      ) : (
        <ul className="space-y-3">
          {visible.map((r) => (
            <li key={r.id} className="border border-ink/10 rounded-xl bg-paper p-4 sm:p-5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="text-lg leading-none">{r.authorAvatar}</span>
                  <span className="font-bold text-ink">{r.authorName}</span>
                  <span className="text-ink/60 text-sm">→ {r.direction === 'toOperator' ? r.operatorName : r.subjectName}</span>
                  <span className="inline-flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Icon key={i} name={i < r.rating ? 'star' : 'starOutline'} className="w-3.5 h-3.5" strokeWidth={1.8} />
                    ))}
                  </span>
                  {r.pending && <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Ciega</span>}
                </div>
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink/60 whitespace-nowrap">{formatDate(r.createdAt)}</span>
              </div>
              {r.text && <p className="text-sm text-ink/70 whitespace-pre-wrap break-words">{r.text}</p>}
              <div className="flex justify-end">
                <button onClick={() => remove(r)} className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && reviews.length > 0 && (
        <p className="text-[11px] text-ink/60">{reviews.length} reseñas en total</p>
      )}
    </div>
  )
}
