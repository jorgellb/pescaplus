'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Opt { slug: string; name: string; region: string }

export default function OperatorRegister({ spots }: { spots: Opt[] }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [f, setF] = useState({ name: '', businessName: '', email: '', phone: '', spotSlug: '', boatName: '', boatType: '', capacity: 6, licenseRef: '', insuranceRef: '', bio: '', website: '' })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setState('saving'); setMsg('')
    try {
      const res = await fetch('/api/charters/operador', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, capacity: Number(f.capacity), website: f.website || undefined }) })
      const data = await res.json()
      if (!res.ok || !data.success) { setState('error'); setMsg(data.error || 'No se pudo registrar.'); return }
      router.push(`/charters/operador?id=${data.id}&t=${encodeURIComponent(data.manageToken)}&nuevo=1`)
    } catch { setState('error'); setMsg('Fallo de red.') }
  }

  const L = 'font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50'
  const I = 'mt-1 w-full border border-ink/20 rounded-xl bg-paper px-3 py-2 text-sm'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block"><span className={L}>Tu nombre *</span><input required value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={80} className={I} /></label>
        <label className="block"><span className={L}>Nombre comercial / empresa</span><input value={f.businessName} onChange={(e) => set('businessName', e.target.value)} maxLength={120} className={I} /></label>
        <label className="block"><span className={L}>Email *</span><input required type="email" value={f.email} onChange={(e) => set('email', e.target.value)} maxLength={160} className={I} /></label>
        <label className="block"><span className={L}>Teléfono</span><input value={f.phone} onChange={(e) => set('phone', e.target.value)} maxLength={40} className={I} /></label>
        <label className="block"><span className={L}>Puerto base *</span>
          <select required value={f.spotSlug} onChange={(e) => set('spotSlug', e.target.value)} className={I}>
            <option value="">Elige zona…</option>{spots.map((s) => <option key={s.slug} value={s.slug}>{s.name} ({s.region})</option>)}
          </select></label>
        <label className="block"><span className={L}>Plazas del barco</span><input type="number" min={1} max={50} value={f.capacity} onChange={(e) => set('capacity', Number(e.target.value))} className={I} /></label>
        <label className="block"><span className={L}>Nombre del barco</span><input value={f.boatName} onChange={(e) => set('boatName', e.target.value)} maxLength={80} className={I} /></label>
        <label className="block"><span className={L}>Tipo de barco</span><input value={f.boatType} onChange={(e) => set('boatType', e.target.value)} maxLength={80} placeholder="p. ej. llaüt 10 m" className={I} /></label>
        <label className="block"><span className={L}>Titulación / licencia *</span><input required value={f.licenseRef} onChange={(e) => set('licenseRef', e.target.value)} maxLength={120} placeholder="nº PER/patrón profesional" className={I} /></label>
        <label className="block"><span className={L}>Seguro (RC / ocupantes) *</span><input required value={f.insuranceRef} onChange={(e) => set('insuranceRef', e.target.value)} maxLength={120} placeholder="nº de póliza" className={I} /></label>
      </div>
      <label className="block"><span className={L}>Sobre ti / tu servicio</span><textarea value={f.bio} onChange={(e) => set('bio', e.target.value)} maxLength={800} rows={3} className={I} /></label>
      <input type="text" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} className="hidden" aria-hidden />
      <p className="text-[12px] text-ink/55 leading-relaxed border border-ink/12 rounded-xl bg-ink/[0.02] p-3">
        Verificaremos tu <strong>titulación profesional y tu seguro</strong> antes de publicar tus chárters. Solo operadores verificados
        aparecen en el directorio y pueden cobrar. Guardarás un enlace privado para gestionar tus salidas.
      </p>
      {state === 'error' && <p className="text-sm text-red-700">{msg}</p>}
      <button type="submit" disabled={state === 'saving'} className="inline-flex items-center gap-2 bg-accent text-paper px-6 py-3 text-sm font-bold uppercase tracking-wide border border-accent rounded-xl shadow-hard hover-shift hover:bg-ink hover:border-ink disabled:opacity-60 transition-colors">
        {state === 'saving' ? 'Enviando…' : 'Registrarme como operador'}
      </button>
    </form>
  )
}
