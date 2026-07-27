'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Charter } from '@/lib/charters-store'
import { getSpot } from '@/lib/fishing-spots'
import CharterEditor, { type OperatorOption } from '@/components/admin/CharterEditor'
import Icon from '@/components/icons/Icon'
import { useConfirm, useToast } from '@/components/admin/AdminFeedback'

export type AdminCharter = Charter

const STATUS_LABEL: Record<AdminCharter['status'], string> = { open: 'Abierto', confirmed: 'Confirmado', cancelled: 'Cancelado' }
const STATUS_CLASS: Record<AdminCharter['status'], string> = {
  open: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-ink/10 text-ink/60',
}

export default function AdminChartersPage() {
  const [charters, setCharters] = useState<AdminCharter[]>([])
  const [operators, setOperators] = useState<OperatorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminCharter | null>(null)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<'todos' | AdminCharter['status']>('todos')
  const confirm = useConfirm()
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, oRes] = await Promise.all([fetch('/api/admin/charters'), fetch('/api/admin/operadores')])
      const cData = await cRes.json()
      if (cData.success) setCharters(cData.charters)
      const oData = await oRes.json()
      if (oData.success) setOperators(oData.operators.filter((o: { verified: boolean }) => o.verified))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const remove = async (c: AdminCharter) => {
    const ok = await confirm({
      title: 'Eliminar chárter',
      message: `¿Eliminar este chárter de ${c.operator?.businessName || c.operator?.name || 'operador'} (${c.dateISO})? Se borrarán también sus reservas.`,
      tone: 'danger',
    })
    if (!ok) return
    const res = await fetch(`/api/admin/charters/${c.id}`, { method: 'DELETE' })
    if (res.ok) { setCharters((prev) => prev.filter((x) => x.id !== c.id)); toast('Chárter eliminado.') }
    else toast('No se pudo eliminar.', 'error')
  }

  const closeEditor = () => { setEditing(null); setCreating(false) }
  const onSaved = () => { const wasCreating = creating; closeEditor(); load(); toast(wasCreating ? 'Chárter creado.' : 'Cambios guardados.') }

  const visible = filter === 'todos' ? charters : charters.filter((c) => c.status === filter)

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ink/[0.07] pb-4">
        <div>
          <h1 className="font-display uppercase text-3xl md:text-4xl text-ink leading-none">Chárters</h1>
          <p className="text-ink/60 text-sm mt-1">Todas las salidas publicadas por los patrones, de cualquier zona y estado.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
        <p className="text-[11px] text-ink/60 inline-flex items-center gap-1.5">
          <Icon name="anchor" className="w-3.5 h-3.5" strokeWidth={1.8} />{charters.length} chárters en total
        </p>
      )}

      {(editing || creating) && <CharterEditor charter={editing} operators={operators} onClose={closeEditor} onSaved={onSaved} />}
    </div>
  )
}
