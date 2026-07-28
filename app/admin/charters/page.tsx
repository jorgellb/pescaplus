'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Charter } from '@/lib/charters-store'
import { getSpot } from '@/lib/fishing-spots'
import CharterEditor, { type OperatorOption } from '@/components/admin/CharterEditor'
import Icon from '@/components/icons/Icon'
import { useConfirm, useToast } from '@/components/admin/AdminFeedback'

export type AdminCharter = Charter

const PAGE_SIZE = 50

const STATUS_LABEL: Record<AdminCharter['status'], string> = { open: 'Abierto', confirmed: 'Confirmado', cancelled: 'Cancelado' }
const STATUS_CLASS: Record<AdminCharter['status'], string> = {
  open: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-ink/10 text-ink/60',
}

export default function AdminChartersPage() {
  const [charters, setCharters] = useState<AdminCharter[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [operators, setOperators] = useState<OperatorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [editing, setEditing] = useState<AdminCharter | null>(null)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<'todos' | AdminCharter['status']>('todos')
  const [q, setQ] = useState('')
  const confirm = useConfirm()
  const toast = useToast()
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadPage = useCallback(async (query: string, offset: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const params = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE) })
      if (query.trim()) params.set('q', query.trim())
      const res = await fetch(`/api/admin/charters?${params}`)
      const data = await res.json()
      if (data.success) {
        setCharters((prev) => (append ? [...prev, ...data.charters] : data.charters))
        setTotal(data.total)
        setHasMore(data.hasMore)
      }
    } finally {
      if (append) setLoadingMore(false)
      else setLoading(false)
    }
  }, [])

  const loadOperators = useCallback(async () => {
    const res = await fetch('/api/admin/operadores')
    const data = await res.json()
    if (data.success) setOperators(data.operators.filter((o: { verified: boolean }) => o.verified))
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPage('', 0, false)
    loadOperators()
  }, [loadPage, loadOperators])

  const onSearchChange = (value: string) => {
    setQ(value)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => loadPage(value, 0, false), 300)
  }

  const remove = async (c: AdminCharter) => {
    const ok = await confirm({
      title: 'Eliminar chárter',
      message: `¿Eliminar este chárter de ${c.operator?.businessName || c.operator?.name || 'operador'} (${c.dateISO})? Se borrarán también sus reservas.`,
      tone: 'danger',
    })
    if (!ok) return
    const res = await fetch(`/api/admin/charters/${c.id}`, { method: 'DELETE' })
    if (res.ok) { setCharters((prev) => prev.filter((x) => x.id !== c.id)); setTotal((t) => Math.max(0, t - 1)); toast('Chárter eliminado.') }
    else toast('No se pudo eliminar.', 'error')
  }

  const closeEditor = () => { setEditing(null); setCreating(false) }
  const onSaved = () => { const wasCreating = creating; closeEditor(); loadPage(q, 0, false); toast(wasCreating ? 'Chárter creado.' : 'Cambios guardados.') }

  const visible = filter === 'todos' ? charters : charters.filter((c) => c.status === filter)

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ink/[0.07] pb-4">
        <div>
          <h1 className="font-display uppercase text-3xl md:text-4xl text-ink leading-none">Chárters</h1>
          <p className="text-ink/60 text-sm mt-1">Todas las salidas publicadas por los patrones, de cualquier zona y estado.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por zona, operador o notas…"
            className="px-3 py-1.5 bg-paper border border-ink/25 rounded-lg text-ink placeholder-ink/60 focus:outline-none focus:border-accent text-sm w-full sm:w-56"
          />
          {(['todos', 'open', 'confirmed', 'cancelled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${filter === f ? 'bg-accent/10 text-accent border border-accent/40' : 'text-ink/60 border border-transparent hover:bg-ink/5'}`}
            >
              {f === 'todos' ? 'Todos' : STATUS_LABEL[f]}
            </button>
          ))}
          <button
            onClick={() => setCreating(true)}
            disabled={operators.length === 0}
            title={operators.length === 0 ? 'Necesitas al menos un operador verificado' : undefined}
            className="inline-flex items-center gap-2 bg-ink text-paper hover:bg-accent font-extrabold text-sm px-4 py-2 border border-ink/10 rounded-xl transition-colors disabled:opacity-40"
          >
            <span className="text-base leading-none">＋</span> Nuevo chárter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-ink/60 text-sm">Cargando chárters…</div>
      ) : visible.length === 0 ? (
        <div className="py-20 text-center text-ink/60 text-sm border border-ink/10 bg-white rounded-2xl">No hay chárters que coincidan.</div>
      ) : (
        <div className="overflow-x-auto border border-ink/10 rounded-2xl bg-white">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-ink/60 border-b border-ink/10">
                <th className="px-4 py-3 font-bold">Fecha</th>
                <th className="px-4 py-3 font-bold">Zona</th>
                <th className="px-4 py-3 font-bold">Operador</th>
                <th className="px-4 py-3 font-bold">Plazas</th>
                <th className="px-4 py-3 font-bold">Precio</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className="border-b border-ink/10 last:border-0 hover:bg-ink/[0.02]">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-semibold text-ink">{new Date(`${c.dateISO}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
                    <p className="text-[11px] text-ink/60">{c.timeStart}</p>
                  </td>
                  <td className="px-4 py-3 text-ink/70">{getSpot(c.spotSlug)?.name || c.spotSlug}</td>
                  <td className="px-4 py-3 text-ink/70 max-w-[180px] truncate">{c.operator?.businessName || c.operator?.name || '—'}</td>
                  <td className="px-4 py-3 text-ink/70">{c.placesTaken}/{c.maxPlaces}</td>
                  <td className="px-4 py-3 text-ink/70">{c.pricePerPerson} €</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_CLASS[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`/charters/${c.id}`} target="_blank" className="text-xs font-semibold text-ink/70 hover:text-accent px-3 py-1.5">Ver</a>
                      <button onClick={() => setEditing(c)} className="text-xs font-semibold text-ink/80 hover:text-accent bg-ink/5 border border-ink/10 px-3 py-1.5 rounded-lg">Editar</button>
                      <button onClick={() => remove(c)} className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && charters.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-[11px] text-ink/60 inline-flex items-center gap-1.5">
            <Icon name="anchor" className="w-3.5 h-3.5" strokeWidth={1.8} />{charters.length} de {total} chárters cargados
          </p>
          {hasMore && (
            <button
              onClick={() => loadPage(q, charters.length, true)}
              disabled={loadingMore}
              className="text-xs font-bold text-ink/80 hover:text-accent bg-ink/5 border border-ink/10 px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {loadingMore ? 'Cargando…' : 'Cargar más'}
            </button>
          )}
        </div>
      )}

      {(editing || creating) && <CharterEditor charter={editing} operators={operators} onClose={closeEditor} onSaved={onSaved} />}
    </div>
  )
}
