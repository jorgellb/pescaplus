'use client'

import { useState } from 'react'
import Icon from '@/components/icons/Icon'
import type { AdminUser } from '@/app/admin/usuarios/page'

interface UserEditorProps {
  user: AdminUser | null
  onClose: () => void
  onSaved: () => void
}

const field = 'w-full px-3 py-2.5 bg-paper border border-ink/25 rounded-lg text-ink placeholder-ink/60 focus:outline-none focus:border-accent text-sm transition-colors'
const labelCls = 'text-[11px] font-bold uppercase tracking-widest text-ink/60'

export default function UserEditor({ user, onClose, onSaved }: UserEditorProps) {
  const [email, setEmail] = useState(user?.email ?? '')
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setError('')
    if (!user && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Email no válido.')
    setSaving(true)
    try {
      const res = user
        ? await fetch(`/api/admin/usuarios/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), phone: phone.trim(), bio: bio.trim() }) })
        : await fetch('/api/admin/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), name: name.trim(), phone: phone.trim(), bio: bio.trim() }) })
      const data = await res.json()
      if (data.success) onSaved()
      else setError(data.error || 'No se pudo guardar')
    } catch {
      setError('Error de red al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/30 backdrop-blur-sm p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-md my-4 bg-white border border-ink/10 rounded-xl shadow-hard-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/[0.07]">
          <div>
            <h2 className="font-display uppercase text-xl text-ink">{user ? 'Editar usuario' : 'Nuevo usuario'}</h2>
            {user && <p className="text-xs text-ink/60 mt-0.5">{user.email}</p>}
          </div>
          <button onClick={onClose} className="text-ink/60 hover:text-ink"><Icon name="close" className="w-5 h-5" strokeWidth={2} /></button>
        </div>

        <div className="p-6 space-y-4">
          {!user && (
            <div className="space-y-1">
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pescador@ejemplo.com" className={field} />
            </div>
          )}
          <div className="space-y-1">
            <label className={labelCls}>Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Teléfono</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={`${field} resize-y`} />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink/[0.07]">
          <button onClick={onClose} className="text-sm font-semibold text-ink/60 hover:text-ink px-4 py-2.5">Cancelar</button>
          <button onClick={save} disabled={saving} className="bg-ink text-paper hover:bg-accent font-bold text-sm px-6 py-2.5 border border-ink/10 rounded-xl transition-colors disabled:opacity-40">
            {saving ? 'Guardando…' : user ? 'Guardar' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  )
}
