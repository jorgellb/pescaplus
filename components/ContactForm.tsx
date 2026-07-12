'use client'

import { useState } from 'react'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status === 'sending') return
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'No se pudo enviar.')
      setStatus('sent')
      form.reset()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'No se pudo enviar.')
    }
  }

  if (status === 'sent') {
    return (
      <div className="border border-ink/15 rounded-xl shadow-hard bg-paper p-8 text-center space-y-3">
        <span className="inline-block text-4xl">✅</span>
        <h2 className="font-display uppercase text-2xl text-ink">Mensaje enviado</h2>
        <p className="text-ink/60 text-sm">Gracias por escribirnos. Te responderemos lo antes posible.</p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-2 inline-block bg-paper text-ink px-5 py-2.5 text-xs font-bold uppercase tracking-wide border border-ink/15 rounded-xl hover:bg-ink hover:text-paper transition-colors"
        >
          Enviar otro
        </button>
      </div>
    )
  }

  const inputCls =
    'w-full px-4 py-3 bg-paper border border-ink/15 rounded-xl text-ink placeholder-ink/40 focus:outline-none focus:border-accent text-sm transition-colors'

  return (
    <form onSubmit={handleSubmit} className="border border-ink/15 rounded-xl shadow-hard bg-paper p-5 sm:p-7 space-y-4">
      {/* Honeypot — hidden from humans */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Nombre</label>
          <input id="name" name="name" required minLength={2} maxLength={120} placeholder="Tu nombre" className={inputCls} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Email</label>
          <input id="email" name="email" type="email" required maxLength={160} placeholder="tucorreo@ejemplo.com" className={inputCls} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="subject" className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Asunto</label>
        <input id="subject" name="subject" maxLength={160} placeholder="¿En qué podemos ayudarte?" className={inputCls} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Mensaje</label>
        <textarea id="message" name="message" required minLength={5} maxLength={4000} rows={6} placeholder="Cuéntanos tu consulta…" className={`${inputCls} resize-y`} />
      </div>

      {status === 'error' && <p className="text-sm text-red-700" role="alert">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="bg-ink text-paper px-6 py-3 text-sm font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover:bg-accent hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'sending' ? 'Enviando…' : 'Enviar mensaje'}
        </button>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40">Respuesta en 24-48 h laborables</p>
      </div>
    </form>
  )
}
