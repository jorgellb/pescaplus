'use client'

import { useState } from 'react'

/** Request a place on a charter. No online payment yet — the operator confirms
 * and you pay them directly. The Stripe checkout will slot in here later. */
export default function RequestBooking({ id, full, price }: { id: string; full: boolean; price: number }) {
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ name: '', contact: '', people: 1, message: '', website: '' })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('saving')
    setMsg('')
    try {
      const res = await fetch(`/api/charters/${id}/reservar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, contact: form.contact, people: Number(form.people), message: form.message || undefined, website: form.website || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setState('error'); setMsg(data.error || 'No se pudo enviar.'); return }
      setState('done')
    } catch { setState('error'); setMsg('Fallo de red.') }
  }

  if (state === 'done') {
    return (
      <div className="border border-accent/30 rounded-xl bg-accent/[0.06] p-4">
        <p className="text-sm font-bold text-ink">✅ Solicitud enviada. El patrón la revisará y te contactará para confirmar la plaza y el pago.</p>
      </div>
    )
  }

  const labelCls = 'font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50'
  const inputCls = 'mt-1 w-full border border-ink/20 rounded-xl bg-paper px-3 py-2 text-sm'

  return (
    <form onSubmit={submit} className="space-y-3 border border-ink/15 rounded-2xl bg-paper p-4">
      <p className="font-display uppercase text-lg leading-none">{full ? 'Solicitar plaza (completo — lista de interés)' : 'Solicitar plaza'}</p>
      <p className="text-[13px] text-ink/60">
        Envías una solicitud; el patrón confirma y coordináis el pago. <strong>El pago online con tarjeta llegará muy pronto.</strong>
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
      <button type="submit" disabled={state === 'saving'} className="inline-flex items-center gap-2 bg-accent text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide border border-accent rounded-xl shadow-hard hover-shift hover:bg-ink hover:border-ink disabled:opacity-60 transition-colors">
        {state === 'saving' ? 'Enviando…' : `Solicitar (${price} €/persona)`}
      </button>
    </form>
  )
}
