'use client'

import { useState } from 'react'

/** "Avísame de quedadas en {zona}" — email signup for new-meetup alerts. */
export default function ZoneAlertSignup({ spotSlug, spotName }: { spotSlug: string; spotName: string }) {
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [msg, setMsg] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('saving')
    setMsg('')
    try {
      const res = await fetch('/api/quedadas/alertas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, spotSlug, website: website || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setState('error')
        setMsg(data.error || 'No se pudo guardar.')
        return
      }
      setState('done')
    } catch {
      setState('error')
      setMsg('Fallo de red. Inténtalo de nuevo.')
    }
  }

  if (state === 'done') {
    return <p className="text-sm text-ink/70 border border-accent/30 rounded-xl bg-accent/[0.06] p-3">🔔 Hecho. Te avisaremos por email cuando alguien organice una salida en {spotName}.</p>
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="flex-1 min-w-[200px]">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">🔔 Avísame de quedadas en {spotName}</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          maxLength={160}
          className="mt-1 w-full border border-ink/20 rounded-xl bg-paper px-3 py-2 text-sm"
        />
      </label>
      <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden />
      <button
        type="submit"
        disabled={state === 'saving'}
        className="bg-ink text-paper px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-accent disabled:opacity-60 transition-colors"
      >
        {state === 'saving' ? 'Guardando…' : 'Avisarme'}
      </button>
      {state === 'error' && <p className="w-full text-sm text-red-700">{msg}</p>}
    </form>
  )
}
