'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@/lib/users-store'
import UserEditor from '@/components/admin/UserEditor'
import Icon from '@/components/icons/Icon'
import { useConfirm, useToast } from '@/components/admin/AdminFeedback'
import { exportToCsv } from '@/lib/csv-export'

export type AdminUser = User

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('es-ES', { dateStyle: 'medium' })
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const confirm = useConfirm()
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/usuarios')
      const data = await res.json()
      if (data.success) setUsers(data.users)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const remove = async (u: AdminUser) => {
    const ok = await confirm({
      title: 'Eliminar cuenta',
      message: `¿Eliminar la cuenta de "${u.name || u.email}"? Se borrarán sus sesiones, reseñas escritas, notas y rutas; sus reservas y quedadas quedarán sin cuenta asociada.`,
      tone: 'danger',
    })
    if (!ok) return
    const res = await fetch(`/api/admin/usuarios/${u.id}`, { method: 'DELETE' })
    if (res.ok) { setUsers((prev) => prev.filter((x) => x.id !== u.id)); toast('Usuario eliminado.') }
    else toast('No se pudo eliminar.', 'error')
  }

  const closeEditor = () => { setEditing(null); setCreating(false) }
  const onSaved = () => { closeEditor(); load() }

  const needle = q.trim().toLowerCase()
  const visible = needle ? users.filter((u) => u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle)) : users

  const toggleSel = (id: string) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const allVisibleSelected = visible.length > 0 && visible.every((u) => selected.has(u.id))
  const toggleAll = () => setSelected((prev) => {
    if (allVisibleSelected) {
      const next = new Set(prev)
      visible.forEach((u) => next.delete(u.id))
      return next
    }
    return new Set([...prev, ...visible.map((u) => u.id)])
  })

  const bulkDelete = async () => {
    const targets = users.filter((u) => selected.has(u.id))
    if (targets.length === 0) return
    const ok = await confirm({ title: 'Eliminar cuentas', message: `¿Eliminar ${targets.length} cuenta(s)? Esta acción no se puede deshacer.`, tone: 'danger' })
    if (!ok) return
    setBulkBusy(true)
    let okCount = 0
    for (const u of targets) {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, { method: 'DELETE' })
      if (res.ok) okCount++
    }
    setBulkBusy(false)
    setSelected(new Set())
    load()
    toast(`${okCount} de ${targets.length} cuenta(s) eliminadas.`, okCount === targets.length ? 'success' : 'error')
  }

  const exportCsv = () => {
    exportToCsv(`pescaplus-usuarios-${new Date().toISOString().slice(0, 10)}.csv`, visible, [
      { header: 'Nombre', value: (u) => u.name },
      { header: 'Email', value: (u) => u.email },
      { header: 'Teléfono', value: (u) => u.phone },
      { header: 'Reputación', value: (u) => (u.reviewCount > 0 ? u.avgRating.toFixed(1) : '') },
      { header: 'Nº reseñas', value: (u) => u.reviewCount },
      { header: 'Alta', value: (u) => new Date(u.createdAt).toISOString().slice(0, 10) },
    ])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ink/[0.07] pb-4">
        <div>
          <h1 className="font-display uppercase text-3xl md:text-4xl text-ink leading-none">Usuarios</h1>
          <p className="text-ink/60 text-sm mt-1">Cuentas de pescadores y patrones registrados.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="px-3 py-2 bg-paper border border-ink/25 rounded-lg text-ink placeholder-ink/60 focus:outline-none focus:border-accent text-sm w-full sm:w-64"
          />
          <button
            onClick={exportCsv}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/80 hover:text-accent bg-ink/5 border border-ink/10 px-3 py-2 rounded-lg disabled:opacity-40"
          >
            <Icon name="download" className="w-3.5 h-3.5" strokeWidth={2} />CSV
          </button>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 bg-ink text-paper hover:bg-accent font-extrabold text-sm px-4 py-2 border border-ink/10 rounded-xl transition-colors whitespace-nowrap"
          >
            <span className="text-base leading-none">＋</span> Nuevo usuario
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3">
          <span className="font-bold text-sm text-ink">{selected.size} seleccionado{selected.size === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-ink/70 hover:text-ink px-3 py-2 rounded-lg border border-ink/10">Quitar selección</button>
            <button onClick={bulkDelete} disabled={bulkBusy} className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 border border-red-200 px-4 py-2 rounded-lg disabled:opacity-50">
              {bulkBusy ? 'Eliminando…' : 'Eliminar seleccionados'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-ink/60 text-sm">Cargando usuarios…</div>
      ) : visible.length === 0 ? (
        <div className="py-20 text-center text-ink/60 text-sm border border-ink/10 bg-white rounded-2xl">No hay usuarios que coincidan.</div>
      ) : (
        <div className="overflow-x-auto border border-ink/10 rounded-2xl bg-white">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-ink/60 border-b border-ink/10">
                <th className="pl-4 pr-1 py-3 w-8">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Seleccionar todos" className="w-4 h-4 accent-[#0a7d72] cursor-pointer" />
                </th>
                <th className="px-4 py-3 font-bold">Usuario</th>
                <th className="px-4 py-3 font-bold">Contacto</th>
                <th className="px-4 py-3 font-bold">Reputación</th>
                <th className="px-4 py-3 font-bold">Alta</th>
                <th className="px-4 py-3 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id} className={`border-b border-ink/10 last:border-0 hover:bg-ink/[0.02] ${selected.has(u.id) ? 'bg-accent/5' : ''}`}>
                  <td className="pl-4 pr-1 py-3">
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSel(u.id)} aria-label={`Seleccionar ${u.name || u.email}`} className="w-4 h-4 accent-[#0a7d72] cursor-pointer" />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{u.avatar} {u.name || 'Sin nombre'}</p>
                    {u.bio && <p className="text-[11px] text-ink/60 max-w-[240px] truncate">{u.bio}</p>}
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    <a href={`mailto:${u.email}`} className="text-accent underline break-all">{u.email}</a>
                    {u.phone && <p className="text-[11px] text-ink/60">{u.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{u.reviewCount > 0 ? `★ ${u.avgRating.toFixed(1)} (${u.reviewCount})` : '—'}</td>
                  <td className="px-4 py-3 text-ink/60 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setEditing(u)} className="text-xs font-semibold text-ink/80 hover:text-accent bg-ink/5 border border-ink/10 px-3 py-1.5 rounded-lg">Editar</button>
                      <button onClick={() => remove(u)} className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && users.length > 0 && (
        <p className="text-[11px] text-ink/60 inline-flex items-center gap-1.5">
          <Icon name="person" className="w-3.5 h-3.5" strokeWidth={1.8} />{users.length} usuarios en total
        </p>
      )}

      {(editing || creating) && <UserEditor user={editing} onClose={closeEditor} onSaved={onSaved} />}
    </div>
  )
}
