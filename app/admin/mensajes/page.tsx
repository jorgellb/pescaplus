'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ContactMessage } from '@/lib/contact-store'
import Icon from '@/components/icons/Icon'
import { useConfirm, useToast } from '@/components/admin/AdminFeedback'
import { exportToCsv } from '@/lib/csv-export'

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todos' | 'pendientes' | 'resueltos'>('pendientes')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const confirm = useConfirm()
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/mensajes')
      const data = await res.json()
      if (data.success) setMessages(data.messages)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const toggleHandled = async (m: ContactMessage) => {
    const res = await fetch(`/api/admin/mensajes/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handled: !m.handled }) })
    if (res.ok) setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, handled: !x.handled } : x)))
    else toast('No se pudo actualizar el mensaje.', 'error')
  }

  const remove = async (m: ContactMessage) => {
    if (!(await confirm({ message: `¿Eliminar el mensaje de "${m.name || m.email}"?`, tone: 'danger' }))) return
    const res = await fetch(`/api/admin/mensajes/${m.id}`, { method: 'DELETE' })
    if (res.ok) { setMessages((prev) => prev.filter((x) => x.id !== m.id)); toast('Mensaje eliminado.') }
    else toast('No se pudo eliminar.', 'error')
  }

  const visible = messages.filter((m) => (filter === 'todos' ? true : filter === 'pendientes' ? !m.handled : m.handled))
  const pending = messages.filter((m) => !m.handled).length

  const toggleSel = (id: string) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const bulkMark = async (handled: boolean) => {
    const targets = messages.filter((m) => selected.has(m.id))
    if (targets.length === 0) return
    setBulkBusy(true)
    let ok = 0
    for (const m of targets) {
      const res = await fetch(`/api/admin/mensajes/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handled }) })
      if (res.ok) ok++
    }
    setBulkBusy(false)
    setSelected(new Set())
    load()
    toast(`${ok} de ${targets.length} mensaje(s) actualizados.`, ok === targets.length ? 'success' : 'error')
  }

  const bulkDelete = async () => {
    const targets = messages.filter((m) => selected.has(m.id))
    if (targets.length === 0) return
    const ok = await confirm({ title: 'Eliminar mensajes', message: `¿Eliminar ${targets.length} mensaje(s)? Esta acción no se puede deshacer.`, tone: 'danger' })
    if (!ok) return
    setBulkBusy(true)
    let okCount = 0
    for (const m of targets) {
      const res = await fetch(`/api/admin/mensajes/${m.id}`, { method: 'DELETE' })
      if (res.ok) okCount++
    }
    setBulkBusy(false)
    setSelected(new Set())
    load()
    toast(`${okCount} de ${targets.length} mensaje(s) eliminados.`, okCount === targets.length ? 'success' : 'error')
  }

  const exportCsv = () => {
    exportToCsv(`pescaplus-mensajes-${new Date().toISOString().slice(0, 10)}.csv`, visible, [
      { header: 'Nombre', value: (m) => m.name },
      { header: 'Email', value: (m) => m.email },
      { header: 'Asunto', value: (m) => m.subject },
      { header: 'Mensaje', value: (m) => m.message },
      { header: 'Estado', value: (m) => (m.handled ? 'Resuelto' : 'Pendiente') },
      { header: 'Fecha', value: (m) => new Date(m.createdAt).toISOString() },
    ])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ink/[0.07] pb-4">
        <div>
          <h1 className="font-display uppercase text-3xl md:text-4xl text-ink leading-none">Mensajes</h1>
          <p className="text-ink/60 text-sm mt-1">Consultas recibidas desde el formulario de contacto.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60 whitespace-nowrap">{pending} pendientes</span>
          {(['pendientes', 'resueltos', 'todos'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${filter === f ? 'bg-accent/10 text-accent border border-accent/40' : 'text-ink/60 border border-transparent hover:bg-ink/5'}`}
            >
              {f === 'pendientes' ? 'Pendientes' : f === 'resueltos' ? 'Resueltos' : 'Todos'}
            </button>
          ))}
          <button
            onClick={exportCsv}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/80 hover:text-accent bg-ink/5 border border-ink/10 px-3 py-2 rounded-lg disabled:opacity-40"
          >
            <Icon name="download" className="w-3.5 h-3.5" strokeWidth={2} />CSV
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-accent/40 bg-accent/5 px-4 py-3">
          <span className="font-bold text-sm text-ink">{selected.size} seleccionado{selected.size === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-ink/70 hover:text-ink px-3 py-2 rounded-lg border border-ink/10">Quitar selección</button>
            <button onClick={() => bulkMark(true)} disabled={bulkBusy} className="text-xs font-bold text-ink/80 hover:text-accent bg-ink/5 border border-ink/10 px-3 py-2 rounded-lg disabled:opacity-50">Marcar respondidos</button>
            <button onClick={() => bulkMark(false)} disabled={bulkBusy} className="text-xs font-bold text-ink/80 hover:text-accent bg-ink/5 border border-ink/10 px-3 py-2 rounded-lg disabled:opacity-50">Marcar pendientes</button>
            <button onClick={bulkDelete} disabled={bulkBusy} className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 border border-red-200 px-4 py-2 rounded-lg disabled:opacity-50">
              {bulkBusy ? 'Procesando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-ink/60 text-sm">Cargando mensajes…</div>
      ) : visible.length === 0 ? (
        <div className="border border-ink/10 rounded-xl bg-paper p-10 text-center text-ink/60 text-sm">
          {filter === 'pendientes' ? 'No hay mensajes pendientes.' : 'No hay mensajes.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((m) => (
            <li key={m.id} className={`border rounded-xl p-4 sm:p-5 space-y-2 ${m.handled ? 'border-ink/10 bg-paper' : 'border-accent/30 bg-accent/[0.03]'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="min-w-0 flex items-start gap-2">
                  <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSel(m.id)} aria-label={`Seleccionar mensaje de ${m.name || m.email}`} className="w-4 h-4 mt-0.5 accent-[#0a7d72] cursor-pointer shrink-0" />
                  <span>
                    <span className="font-bold text-ink">{m.name || 'Sin nombre'}</span>{' '}
                    <a href={`mailto:${m.email}`} className="text-accent underline text-sm break-all">{m.email}</a>
                    {m.handled && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Resuelto</span>}
                  </span>
                </div>
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink/60 whitespace-nowrap">{formatDate(m.createdAt)}</span>
              </div>
              {m.subject && <p className="font-bold text-sm text-ink/80 pl-6">{m.subject}</p>}
              <p className="text-sm text-ink/70 whitespace-pre-wrap break-words pl-6">{m.message}</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => toggleHandled(m)} className="text-xs font-semibold text-ink/80 hover:text-accent bg-ink/5 border border-ink/10 px-3 py-1.5 rounded-lg">
                  {m.handled ? 'Marcar pendiente' : 'Marcar respondido'}
                </button>
                <button onClick={() => remove(m)} className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && messages.length > 0 && (
        <p className="text-[11px] text-ink/60 inline-flex items-center gap-1.5">
          <Icon name="mail" className="w-3.5 h-3.5" strokeWidth={1.8} />{messages.length} mensajes en total
        </p>
      )}
    </div>
  )
}
