'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Opt {
  slug: string
  name: string
  region: string
}
interface Species {
  id: string
  name: string
}

const MODALITIES = [
  { id: 'tierra', label: '🏖️ Orilla / costa' },
  { id: 'kayak', label: '🛶 Kayak' },
  { id: 'barco', label: '🚤 Barco (compartir gastos)' },
]
const LEVELS = ['cualquiera', 'principiante', 'medio', 'experto']

export default function NewMeetupForm({ spots, species, defaultSpot }: { spots: Opt[]; species: Species[]; defaultSpot?: string }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    hostName: '',
    hostContact: '',
    spotSlug: defaultSpot ?? '',
    meetingPoint: '',
    dateISO: '',
    timeStart: '07:00',
    modality: 'tierra',
    targetSpecies: '',
    level: 'cualquiera',
    maxPlaces: 4,
    minToConfirm: 2,
    costShare: '',
    notes: '',
    website: '', // honeypot
  })

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('saving')
    setMsg('')
    try {
      const res = await fetch('/api/quedadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: form.hostName,
          hostContact: form.hostContact,
          spotSlug: form.spotSlug,
          meetingPoint: form.meetingPoint || undefined,
          dateISO: form.dateISO,
          timeStart: form.timeStart,
          modality: form.modality,
          targetSpecies: form.targetSpecies || undefined,
          level: form.level,
          maxPlaces: Number(form.maxPlaces),
          minToConfirm: Number(form.minToConfirm),
          costShare: form.costShare ? Number(form.costShare) : undefined,
          notes: form.notes || undefined,
          website: form.website || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setState('error')
        setMsg(data.error || 'No se pudo publicar la quedada.')
        return
      }
      // Redirect to the meetup with the private management token in the URL.
      router.push(`/quedadas/${data.id}?t=${encodeURIComponent(data.manageToken)}&nueva=1`)
    } catch {
      setState('error')
      setMsg('Fallo de red. Inténtalo de nuevo.')
    }
  }

  const labelCls = 'font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50'
  const inputCls = 'mt-1 w-full border border-ink/20 rounded-xl bg-paper px-3 py-2 text-sm'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className={labelCls}>Tu nombre *</span>
          <input required value={form.hostName} onChange={(e) => set('hostName', e.target.value)} maxLength={60} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Contacto * (WhatsApp, teléfono o email)</span>
          <input required value={form.hostContact} onChange={(e) => set('hostContact', e.target.value)} maxLength={120} placeholder="wa.me/34600000000" className={inputCls} />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className={labelCls}>Zona *</span>
          <select required value={form.spotSlug} onChange={(e) => set('spotSlug', e.target.value)} className={inputCls}>
            <option value="">Elige zona…</option>
            {spots.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name} ({s.region})</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Punto de encuentro</span>
          <input value={form.meetingPoint} onChange={(e) => set('meetingPoint', e.target.value)} maxLength={120} placeholder="p. ej. espigón del puerto" className={inputCls} />
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <label className="block">
          <span className={labelCls}>Día *</span>
          <input required type="date" value={form.dateISO} onChange={(e) => set('dateISO', e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Hora *</span>
          <input required type="time" value={form.timeStart} onChange={(e) => set('timeStart', e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Modalidad *</span>
          <select value={form.modality} onChange={(e) => set('modality', e.target.value)} className={inputCls}>
            {MODALITIES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Nivel</span>
          <select value={form.level} onChange={(e) => set('level', e.target.value)} className={inputCls}>
            {LEVELS.map((l) => <option key={l} value={l} className="capitalize">{l}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <label className="block">
          <span className={labelCls}>Especie objetivo</span>
          <select value={form.targetSpecies} onChange={(e) => set('targetSpecies', e.target.value)} className={inputCls}>
            <option value="">Cualquiera</option>
            {species.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Plazas (total) *</span>
          <input required type="number" min={1} max={30} value={form.maxPlaces} onChange={(e) => set('maxPlaces', Number(e.target.value))} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Mínimo para confirmar</span>
          <input type="number" min={1} max={30} value={form.minToConfirm} onChange={(e) => set('minToConfirm', Number(e.target.value))} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Gasto/persona (€, opcional)</span>
          <input type="number" min={0} max={200} step="0.5" value={form.costShare} onChange={(e) => set('costShare', e.target.value)} placeholder="cebo, gasolina…" className={inputCls} />
        </label>
      </div>

      <label className="block">
        <span className={labelCls}>Notas (equipo, plan, quién sois…)</span>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} maxLength={600} rows={3} className={inputCls} />
      </label>

      {/* Honeypot */}
      <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} className="hidden" aria-hidden />

      <p className="text-[12px] text-ink/55 leading-relaxed border border-ink/12 rounded-xl bg-ink/[0.02] p-3">
        ⚠️ Las quedadas son para <strong>compartir gastos, sin ánimo de lucro</strong>. Si cobras por llevar gente a pescar
        necesitas licencia y seguro de actividad náutica comercial. Cada participante debe llevar su licencia de pesca. Sal
        con seguridad: chaleco, avisa a alguien en tierra y no salgas solo en kayak o barco.
      </p>

      {state === 'error' && <p className="text-sm text-red-700">{msg}</p>}

      <button
        type="submit"
        disabled={state === 'saving'}
        className="inline-flex items-center gap-2 bg-accent text-paper px-6 py-3 text-sm font-bold uppercase tracking-wide border border-accent rounded-xl shadow-hard hover-shift hover:bg-ink hover:border-ink disabled:opacity-60 transition-colors"
      >
        {state === 'saving' ? 'Publicando…' : 'Publicar quedada'}
      </button>
    </form>
  )
}
