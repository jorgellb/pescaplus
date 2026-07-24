'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinMeetup({ id, full, kind = 'quedada' }: { id: string; full: boolean; kind?: 'quedada' | 'llamada' }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [waitlisted, setWaitlisted] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ name: '', contact: '', places: 1, website: '' })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('saving')
    setMsg('')
    try {
      const res = await fetch(`/api/quedadas/${id}/apuntarse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, contact: form.contact || undefined, places: Number(form.places), website: form.website || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setState('error')
        setMsg(data.error || 'No se pudo apuntar.')
        return
      }
      setWaitlisted(!!data.waitlisted)
      setState('done')
      router.refresh()
    } catch {
      setState('error')
      setMsg('Fallo de red. Inténtalo de nuevo.')
    }
  }

  if (state === 'done') {
    return (
      <div className={`border rounded-xl p-4 ${waitlisted ? 'border-amber-700/30 bg-amber-700/[0.06]' : 'border-accent/30 bg-accent/[0.06]'}`}>
        <p className="text-sm font-bold text-ink">
          {waitlisted
            ? '⏳ Estás en la lista de espera. Si se libera una plaza, subes automáticamente y el anfitrión te avisa.'
            : '✅ ¡Apuntado! Coordina el resto con el anfitrión por su contacto.'}
        </p>
      </div>
    )
  }

  const labelCls = 'font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50'
  const inputCls = 'mt-1 w-full border border-ink/20 rounded-xl bg-paper px-3 py-2 text-sm'
  const cta = full ? 'Unirme a la lista de espera' : kind === 'llamada' ? 'Me interesa' : 'Apuntarme'

  return (
    <form onSubmit={submit} className="space-y-3 border border-ink/15 rounded-2xl bg-paper p-4">
      <p className="font-display uppercase text-lg leading-none">{full ? 'Lista de espera' : kind === 'llamada' ? '¿Te sumas?' : 'Apúntate'}</p>
      {full && <p className="text-[13px] text-ink/60">No quedan plazas, pero puedes ponerte en espera: si alguien se cae, entras por orden de llegada.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block sm:col-span-1">
          <span className={labelCls}>Tu nombre *</span>
          <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={60} className={inputCls} />
        </label>
        <label className="block sm:col-span-1">
          <span className={labelCls}>Contacto (opcional)</span>
          <input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} maxLength={120} className={inputCls} />
        </label>
        <label className="block sm:col-span-1">
          <span className={labelCls}>Plazas</span>
          <input type="number" min={1} max={10} value={form.places} onChange={(e) => setForm((f) => ({ ...f, places: Number(e.target.value) }))} className={inputCls} />
        </label>
      </div>
      <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className="hidden" aria-hidden />
      {state === 'error' && <p className="text-sm text-red-700">{msg}</p>}
      <button type="submit" disabled={state === 'saving'} className="inline-flex items-center gap-2 bg-accent text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide border border-accent rounded-xl shadow-hard hover-shift hover:bg-ink hover:border-ink disabled:opacity-60 transition-colors">
        {state === 'saving' ? 'Enviando…' : cta}
      </button>
    </form>
  )
}
