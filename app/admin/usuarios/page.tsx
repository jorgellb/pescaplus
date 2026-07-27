'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@/lib/users-store'
import UserEditor from '@/components/admin/UserEditor'
import Icon from '@/components/icons/Icon'

export type AdminUser = User

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('es-ES', { dateStyle: 'medium' })
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [q, setQ] = useState('')

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
    if (!confirm(`¿Eliminar la cuenta de "${u.name || u.email}"? Se borrarán sus sesiones, reseñas escritas, notas y rutas; sus reservas y quedadas quedarán sin cuenta asociada.`)) return
    const res = await fetch(`/api/admin/usuarios/${u.id}`, { method: 'DELETE' })
    if (res.ok) setUsers((prev) => prev.filter((x) => x.id !== u.id))
    else alert('No se pudo eliminar.')
  }

  const closeEditor = () => setEditing(null)
  const onSaved = () => { closeEditor(); load() }

  const needle = q.trim().toLowerCase()
  const visible = needle ? users.filter((u) => u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle)) : users

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ink/[0.07] pb-4">
        <div>
          <h1 className="font-display uppercase text-3xl md:text-4xl text-ink leading-none">Usuarios</h1>
          <p className="text-ink/60 text-sm mt-1">Cuentas de pescadores y patrones registrados.</p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className="px-3 py-2 bg-paper border border-ink/25 rounded-lg text-ink placeholder-ink/60 focus:outline-none focus:border-accent text-sm w-full sm:w-64"
        />
      </div>

      {loading ? (
        <div className="py-24 text-center text-ink/60 text-sm">Cargando usuarios…</div>
      ) : visible.length === 0 ? (
        <div className="py-20 text-center text-ink/60 text-sm border border-ink/10 bg-white rounded-2xl">No hay usuarios que coincidan.</div>
      ) : (
        <div className="overflow-x-auto border border-ink/10 rounded-2xl bg-white">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-ink/60 border-b border-ink/10">
                <th className="px-4 py-3 font-bold">Usuario</th>
                <th className="px-4 py-3 font-bold">Contacto</th>
                <th className="px-4 py-3 font-bold">Reputación</th>
                <th className="px-4 py-3 font-bold">Alta</th>
                <th className="px-4 py-3 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id} className="border-b border-ink/10 last:border-0 hover:bg-ink/[0.02]">
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

      {editing && <UserEditor user={editing} onClose={closeEditor} onSaved={onSaved} />}
    </div>
  )
}
