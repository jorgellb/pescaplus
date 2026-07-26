'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface U { name: string; phone: string; bio: string; avatar: string; email: string }

export default function ProfileForm({ user, avatarChoices }: { user: U; avatarChoices: string[] }) {
  const router = useRouter()
  const [f, setF] = useState({ name: user.name, phone: user.phone, bio: user.bio, avatar: user.avatar || avatarChoices[0] })
  const [state, setState] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setState('saving'); setMsg('')
    try {
      const res = await fetch('/api/cuenta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
      const data = await res.json()
      if (!res.ok || !data.success) { setState('error'); setMsg(data.error || 'No se pudo guardar.'); return }
      setState('ok'); router.refresh()
    } catch { setState('error'); setMsg('Fallo de red.') }
  }

  const L = 'font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50'
  const I = 'mt-1 w-full border border-ink/12 rounded-xl bg-paper px-3 py-2 text-sm'
  return (
    <form onSubmit={save} className="border border-ink/10 rounded-2xl bg-paper p-5 space-y-4 max-w-xl">
      <div>
        <span className={L}>Avatar</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {avatarChoices.map((a) => (
            <button type="button" key={a} onClick={() => setF((s) => ({ ...s, avatar: a }))}
              className={`h-11 w-11 rounded-xl border text-xl flex items-center justify-center transition-colors ${f.avatar === a ? 'border-accent bg-accent/10' : 'border-ink/10 hover:border-ink/40'}`}>{a}</button>
          ))}
        </div>
      </div>
      <label className="block"><span className={L}>Nombre público</span>
        <input value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} maxLength={80} placeholder="Cómo te verán patrones y compañeros" className={I} /></label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block"><span className={L}>Teléfono (privado)</span>
          <input value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value }))} maxLength={40} className={I} /></label>
        <label className="block"><span className={L}>Email</span>
          <input value={user.email} disabled className={`${I} opacity-60`} /></label>
      </div>
      <label className="block"><span className={L}>Sobre ti (opcional)</span>
        <textarea value={f.bio} onChange={(e) => setF((s) => ({ ...s, bio: e.target.value }))} maxLength={600} rows={3} placeholder="Tu experiencia, modalidades favoritas…" className={I} /></label>
      {state === 'error' && <p className="text-sm text-red-700">{msg}</p>}
      {state === 'ok' && <p className="text-sm text-accent">✓ Guardado.</p>}
      <button type="submit" disabled={state === 'saving'} className="bg-accent text-paper px-5 py-2.5 text-sm font-semibold rounded-full hover:bg-ink disabled:opacity-60 transition-colors">{state === 'saving' ? 'Guardando…' : 'Guardar perfil'}</button>
    </form>
  )
}
