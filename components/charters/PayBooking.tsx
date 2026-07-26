'use client'

import { useState } from 'react'

/** Reserve and pay a charter place online. Sends the buyer's data to the
 * checkout route, which returns a Stripe Checkout URL; we then redirect there.
 * The place is only created (as 'paid') once Stripe confirms via webhook. */
export default function PayBooking({ id, full, price }: { id: string; full: boolean; price: number }) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ name: '', contact: '', people: 1, message: '', website: '' })

  const total = Math.max(1, Number(form.people) || 1) * price

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('loading')
    setMsg('')
    try {
      const res = await fetch(`/api/charters/${id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, contact: form.contact, people: Number(form.people), message: form.message || undefined, website: form.website || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.success || !data.url) { setState('error'); setMsg(data.error || 'No se pudo iniciar el pago.'); return }
      window.location.href = data.url
    } catch { setState('error'); setMsg('Fallo de red.') }
  }

  const labelCls = 'font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50'
  const inputCls = 'mt-1 w-full border border-ink/12 rounded-xl bg-paper px-3 py-2 text-sm'

  if (full) {
    return (
      <div className="border border-ink/10 rounded-2xl bg-paper p-4">
        <p className="font-display uppercase text-lg leading-none">Chárter completo</p>
        <p className="text-[13px] text-ink/60 mt-1">Ya no quedan plazas para esta salida. Echa un vistazo a otros chárters disponibles.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3 border border-accent/30 rounded-2xl bg-accent/[0.04] p-4">
      <p className="font-display uppercase text-lg leading-none">💳 Reservar y pagar plaza</p>
      <p className="text-[13px] text-ink/60">
        Pago seguro con tarjeta a través de <strong>Stripe</strong>. Reservas tu plaza al instante y el patrón recibe tu reserva confirmada.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block"><span className={labelCls}>Tu nombre *</span>
          <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={80} className={inputCls} /></label>
        <label className="block"><span className={labelCls}>Email o teléfono *</span>
          <input required value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} maxLength={120} className={inputCls} /></label>
        <label className="block"><span className={labelCls}>Personas</span>
          <input type="number" min={1} max={20} value={form.people} onChange={(e) => setForm((f) => ({ ...f, people: Number(e.target.value) }))} className={inputCls} /></label>
      </div>
      <label className="block"><span className={labelCls}>Mensaje (opcional)</span>
        <input value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} maxLength={400} placeholder="nivel, dudas…" className={inputCls} /></label>
      <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className="hidden" aria-hidden />
      {state === 'error' && <p className="text-sm text-red-700">{msg}</p>}
      <button type="submit" disabled={state === 'loading'} className="inline-flex items-center gap-2 bg-accent text-paper px-5 py-2.5 text-sm font-semibold border border-accent rounded-full shadow-hard hover-shift hover:bg-ink hover:border-ink disabled:opacity-60 transition-colors">
        {state === 'loading' ? 'Redirigiendo a pago…' : `Reservar y pagar ${total} €`}
      </button>
      <p className="font-mono text-[10px] uppercase tracking-wide text-ink/40">{price} €/persona · pago procesado por Stripe</p>
    </form>
  )
}
