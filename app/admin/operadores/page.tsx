'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import OperatorEditor, { type AdminOperator } from '@/components/admin/OperatorEditor'
import Icon from '@/components/icons/Icon'
import { useConfirm, useToast } from '@/components/admin/AdminFeedback'

const PAGE_SIZE = 50

export default function AdminOperatorsPage() {
  const [operators, setOperators] = useState<AdminOperator[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [pending, setPending] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [editing, setEditing] = useState<AdminOperator | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
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
      const [res, pendingRes] = await Promise.all([
        fetch(`/api/admin/operadores?${params}`),
        append ? Promise.resolve(null) : fetch('/api/admin/operadores?limit=1&verified=false'),
      ])
      const data = await res.json()
      if (data.success) {
        setOperators((prev) => (append ? [...prev, ...data.operators] : data.operators))
        setTotal(data.total)
        setHasMore(data.hasMore)
      }
      if (pendingRes) {
        const pendingData = await pendingRes.json()
        if (pendingData.success) setPending(pendingData.total)
      }
    } finally {
      if (append) setLoadingMore(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPage('', 0, false)
  }, [loadPage])

  const onSearchChange = (value: string) => {
    setQ(value)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => loadPage(value, 0, false), 300)
  }

  const toggleVerified = async (o: AdminOperator) => {
    setBusy(o.id)
    try {
      const res = await fetch('/api/admin/operadores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: o.id, verified: !o.verified }) })
      if (res.ok) { loadPage(q, 0, false); toast(o.verified ? 'Verificación revocada.' : 'Operador verificado.') }
      else toast('No se pudo actualizar.', 'error')
    } finally {
      setBusy(null)
    }
  }

  const remove = async (o: AdminOperator) => {
    const ok = await confirm({ title: 'Eliminar operador', message: `¿Eliminar a "${o.businessName || o.name}"? También se borrarán sus chárters publicados.`, tone: 'danger' })
    if (!ok) return
    const res = await fetch(`/api/admin/operadores/${o.id}`, { method: 'DELETE' })
    if (res.ok) { setOperators((prev) => prev.filter((x) => x.id !== o.id)); setTotal((t) => Math.max(0, t - 1)); toast('Operador eliminado.') }
    else toast('No se pudo eliminar.', 'error')
  }

  const closeEditor = () => { setEditing(null); setCreating(false) }
  const onSaved = () => { closeEditor(); loadPage(q, 0, false); toast('Cambios guardados.') }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ink/[0.07] pb-4">
        <div>
          <h1 className="font-display uppercase text-3xl md:text-4xl text-ink leading-none">Operadores</h1>
          <p className="text-ink/60 text-sm mt-1">Patrones profesionales: verifica titulación/seguro y gestiona su ficha.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, email o zona…"
            className="px-3 py-1.5 bg-paper border border-ink/25 rounded-lg text-ink placeholder-ink/60 focus:outline-none focus:border-accent text-sm w-full sm:w-56"
          />
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60 whitespace-nowrap">{pending} pendientes</span>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 bg-ink text-paper hover:bg-accent font-extrabold text-sm px-5 py-2.5 border border-ink/10 rounded-xl transition-colors"
          >
            <span className="text-base leading-none">＋</span> Nuevo operador
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-ink/60 text-sm">Cargando operadores…</div>
      ) : operators.length === 0 ? (
        <p className="text-ink/60 text-sm">No hay operadores que coincidan.</p>
      ) : (
        <div className="space-y-3">
          {operators.map((o) => (
            <div key={o.id} className={`border rounded-2xl p-4 ${o.verified ? 'border-accent/30 bg-accent/[0.04]' : 'border-amber-700/30 bg-amber-700/[0.05]'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-ink">
                    {o.businessName || o.name}{' '}
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink/60 inline-flex items-center gap-1">
                      {o.verified ? <><Icon name="checkCircle" className="w-3 h-3" strokeWidth={2.2} />verificado</> : 'pendiente'}
                    </span>
                  </p>
                  <p className="text-[13px] text-ink/65">{o.name} · {o.email}{o.phone ? ` · ${o.phone}` : ''} · {o.spotSlug} · {o.boatName} {o.boatType} ({o.capacity} plazas)</p>
                  <p className="text-[12px] text-ink/60 mt-1">Licencia: <strong>{o.licenseRef}</strong> · Seguro: <strong>{o.insuranceRef}</strong></p>
                  {o.bio && <p className="text-[12px] text-ink/60 mt-1">{o.bio}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setEditing(o)} className="text-xs font-semibold text-ink/80 hover:text-accent bg-ink/5 border border-ink/10 px-3 py-2 rounded-full">Editar</button>
                  {!o.verified
                    ? <button onClick={() => toggleVerified(o)} disabled={busy === o.id} className="bg-accent text-paper px-4 py-2 text-sm font-semibold rounded-full hover:bg-ink disabled:opacity-60">Verificar</button>
                    : <button onClick={() => toggleVerified(o)} disabled={busy === o.id} className="bg-paper text-amber-700 border border-amber-700/40 px-4 py-2 text-sm font-semibold rounded-full hover:bg-amber-700 hover:text-paper disabled:opacity-60">Revocar</button>}
                  <button onClick={() => remove(o)} className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-full">Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && operators.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-[11px] text-ink/60">{operators.length} de {total} operadores cargados</p>
          {hasMore && (
            <button
              onClick={() => loadPage(q, operators.length, true)}
              disabled={loadingMore}
              className="text-xs font-bold text-ink/80 hover:text-accent bg-ink/5 border border-ink/10 px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {loadingMore ? 'Cargando…' : 'Cargar más'}
            </button>
          )}
        </div>
      )}

      {(editing || creating) && <OperatorEditor initial={editing} onClose={closeEditor} onSaved={onSaved} />}
    </div>
  )
}
