'use client'

import { useState, useEffect, useCallback } from 'react'
import OperatorEditor, { type AdminOperator } from '@/components/admin/OperatorEditor'
import Icon from '@/components/icons/Icon'
import { useConfirm, useToast } from '@/components/admin/AdminFeedback'

export default function AdminOperatorsPage() {
  const [operators, setOperators] = useState<AdminOperator[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminOperator | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const confirm = useConfirm()
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/operadores')
      const data = await res.json()
      if (data.success) setOperators(data.operators)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const toggleVerified = async (o: AdminOperator) => {
    setBusy(o.id)
    try {
      const res = await fetch('/api/admin/operadores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: o.id, verified: !o.verified }) })
      if (res.ok) { load(); toast(o.verified ? 'Verificación revocada.' : 'Operador verificado.') }
      else toast('No se pudo actualizar.', 'error')
    } finally {
      setBusy(null)
    }
  }

  const remove = async (o: AdminOperator) => {
    const ok = await confirm({ title: 'Eliminar operador', message: `¿Eliminar a "${o.businessName || o.name}"? También se borrarán sus chárters publicados.`, tone: 'danger' })
    if (!ok) return
    const res = await fetch(`/api/admin/operadores/${o.id}`, { method: 'DELETE' })
    if (res.ok) { setOperators((prev) => prev.filter((x) => x.id !== o.id)); toast('Operador eliminado.') }
    else toast('No se pudo eliminar.', 'error')
  }

  const closeEditor = () => { setEditing(null); setCreating(false) }
  const onSaved = () => { closeEditor(); load() }

  const pending = operators.filter((o) => !o.verified).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ink/[0.07] pb-4">
        <div>
          <h1 className="font-display uppercase text-3xl md:text-4xl text-ink leading-none">Operadores</h1>
          <p className="text-ink/60 text-sm mt-1">Patrones profesionales: verifica titulación/seguro y gestiona su ficha.</p>
        </div>
        <div className="flex items-center gap-3">
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
        <p className="text-ink/60 text-sm">No hay operadores registrados todavía.</p>
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

      {(editing || creating) && <OperatorEditor initial={editing} onClose={closeEditor} onSaved={onSaved} />}
    </div>
  )
}
