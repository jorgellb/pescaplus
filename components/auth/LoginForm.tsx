'use client'

import { useState } from 'react'

/** Passwordless login: submit email → receive a magic link. In dev (no email
 * configured) the API returns the link directly so you can log in locally. */
export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [devLink, setDevLink] = useState('')
  const [dryRun, setDryRun] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('loading'); setMsg('')
    try {
      const res = await fetch('/api/auth/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, website }) })
      const data = await res.json()
      if (!res.ok || !data.success) { setState('error'); setMsg(data.error || 'No se pudo enviar el enlace.'); return }
      setDevLink(data.devLink || ''); setDryRun(!!data.dryRun); setState('sent')
    } catch { setState('error'); setMsg('Fallo de red.') }
  }

  if (state === 'sent') {
    return (
      <div className="border border-accent/30 rounded-2xl bg-accent/[0.06] p-5 space-y-2">
        <p className="font-display uppercase text-xl leading-none">📬 Revisa tu correo</p>
        <p className="text-sm text-ink/75">Te hemos enviado un enlace de acceso a <strong>{email}</strong>. Caduca en 15 minutos y solo funciona una vez.</p>
        {dryRun && <p className="text-[13px] text-amber-800 bg-amber-500/10 border border-amber-600/30 rounded-lg p-2">El envío de emails aún no está configurado (RESEND). En producción el enlace no llegará hasta activarlo.</p>}
        {devLink && <p className="text-[13px] text-ink/70">Enlace de desarrollo: <a href={devLink} className="text-accent font-bold underline break-all">entrar ahora →</a></p>}
      </div>
    )
  }

  const inputCls = 'mt-1 w-full border border-ink/12 rounded-xl bg-paper px-3 py-2.5 text-sm'
  return (
    <form onSubmit={submit} className="border border-ink/10 rounded-2xl bg-paper p-5 space-y-3 max-w-md">
      <label className="block"><span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Tu email</span>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} placeholder="tu@email.com" className={inputCls} autoFocus /></label>
      <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden />
      {state === 'error' && <p className="text-sm text-red-700">{msg}</p>}
      <button type="submit" disabled={state === 'loading'} className="w-full bg-accent text-paper px-5 py-2.5 text-sm font-semibold rounded-full hover:bg-ink disabled:opacity-60 transition-colors">
        {state === 'loading' ? 'Enviando…' : 'Enviarme enlace de acceso'}
      </button>
      <p className="text-[12px] text-ink/50">Sin contraseñas. Te enviamos un enlace seguro para entrar. Si es tu primera vez, se crea tu cuenta automáticamente.</p>
    </form>
  )
}
