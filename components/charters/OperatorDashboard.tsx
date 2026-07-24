'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Opt { slug: string; name: string; region: string }
interface Species { id: string; name: string }
interface Booking { id: string; name: string; contact: string; people: number; message: string; status: string }
interface Charter {
  id: string; spotName: string; dateISO: string; dayLabel: string; timeStart: string; modality: string
  pricePerPerson: number; maxPlaces: number; placesTaken: number; status: string; bookings: Booking[]
}

export default function OperatorDashboard({ operatorId, manageToken, verified, defaultSpot, spots, species, charters }: {
  operatorId: string; manageToken: string; verified: boolean; defaultSpot: string; spots: Opt[]; species: Species[]; charters: Charter[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [f, setF] = useState({ spotSlug: defaultSpot, dateISO: '', timeStart: '08:00', modality: 'barco', targetSpecies: '', level: 'cualquiera', pricePerPerson: '', maxPlaces: 6, minToConfirm: 1, includes: '', notes: '' })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))

  const post = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/charters', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId, manageToken, ...f, pricePerPerson: Number(f.pricePerPerson), maxPlaces: Number(f.maxPlaces), minToConfirm: Number(f.minToConfirm), targetSpecies: f.targetSpecies || undefined, includes: f.includes || undefined, notes: f.notes || undefined }) })
      const data = await res.json()
      if (!res.ok || !data.success) { setMsg(data.error || 'No se pudo publicar.'); return }
      router.refresh(); setF((s) => ({ ...s, dateISO: '', pricePerPerson: '', includes: '', notes: '' }))
    } finally { setSaving(false) }
  }

  const respond = async (charterId: string, action: string, bookingId?: string) => {
    setBusy((bookingId ?? charterId) + action)
    try {
      const res = await fetch(`/api/charters/${charterId}/gestion`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId, manageToken, action, bookingId }) })
      if (res.ok) router.refresh()
    } finally { setBusy(null) }
  }

  const L = 'font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50'
  const I = 'mt-1 w-full border border-ink/20 rounded-xl bg-paper px-3 py-2 text-sm'

  return (
    <div className="space-y-8">
      {!verified ? (
        <div className="border border-amber-700/30 rounded-2xl bg-amber-700/[0.06] p-5">
          <p className="font-bold text-ink">⏳ Cuenta pendiente de verificación</p>
          <p className="text-sm text-ink/70 mt-1">Estamos revisando tu titulación y tu seguro. En cuanto quedes verificado podrás publicar chárters aquí. Guarda este enlace para volver.</p>
        </div>
      ) : (
        <form onSubmit={post} className="border border-ink/15 rounded-2xl bg-paper p-5 space-y-3">
          <p className="font-display uppercase text-xl leading-none">➕ Publicar un chárter</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block"><span className={L}>Zona *</span>
              <select required value={f.spotSlug} onChange={(e) => set('spotSlug', e.target.value)} className={I}><option value="">Elige…</option>{spots.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label>
            <label className="block"><span className={L}>Día *</span><input required type="date" value={f.dateISO} onChange={(e) => set('dateISO', e.target.value)} className={I} /></label>
            <label className="block"><span className={L}>Hora *</span><input required type="time" value={f.timeStart} onChange={(e) => set('timeStart', e.target.value)} className={I} /></label>
            <label className="block"><span className={L}>€/persona *</span><input required type="number" min={1} max={5000} value={f.pricePerPerson} onChange={(e) => set('pricePerPerson', e.target.value)} className={I} /></label>
            <label className="block"><span className={L}>Especie</span>
              <select value={f.targetSpecies} onChange={(e) => set('targetSpecies', e.target.value)} className={I}><option value="">Cualquiera</option>{species.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label className="block"><span className={L}>Plazas</span><input type="number" min={1} max={50} value={f.maxPlaces} onChange={(e) => set('maxPlaces', Number(e.target.value))} className={I} /></label>
            <label className="block"><span className={L}>Mín. para salir</span><input type="number" min={1} max={50} value={f.minToConfirm} onChange={(e) => set('minToConfirm', Number(e.target.value))} className={I} /></label>
            <label className="block"><span className={L}>Modalidad</span>
              <select value={f.modality} onChange={(e) => set('modality', e.target.value)} className={I}><option value="barco">🚤 Barco</option><option value="kayak">🛶 Kayak</option><option value="tierra">🏖️ Orilla</option></select></label>
          </div>
          <label className="block"><span className={L}>Incluye (equipo, cebo, licencia…)</span><input value={f.includes} onChange={(e) => set('includes', e.target.value)} maxLength={400} className={I} /></label>
          <label className="block"><span className={L}>Notas</span><input value={f.notes} onChange={(e) => set('notes', e.target.value)} maxLength={800} className={I} /></label>
          {msg && <p className="text-sm text-red-700">{msg}</p>}
          <button type="submit" disabled={saving} className="bg-accent text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-ink disabled:opacity-60 transition-colors">{saving ? 'Publicando…' : 'Publicar chárter'}</button>
        </form>
      )}

      <div className="space-y-4">
        <p className="font-display uppercase text-xl leading-none">Tus chárters ({charters.length})</p>
        {charters.length === 0 && <p className="text-sm text-ink/60">Aún no has publicado ninguno.</p>}
        {charters.map((c) => (
          <div key={c.id} className={`border rounded-2xl p-4 space-y-2 ${c.status === 'cancelled' ? 'border-ink/10 bg-ink/[0.02] opacity-70' : 'border-ink/15 bg-paper'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-ink">{c.spotName} · <span className="capitalize">{c.dayLabel}</span> · {c.timeStart} · {c.pricePerPerson} €/pers · {c.placesTaken}/{c.maxPlaces}
                <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-accent">{c.status === 'confirmed' ? 'confirmado' : c.status === 'cancelled' ? 'cancelado' : 'abierto'}</span></p>
              {c.status !== 'cancelled' && <button onClick={() => respond(c.id, 'cancel')} disabled={busy === c.id + 'cancel'} className="font-mono text-[10px] uppercase tracking-wide text-red-700 hover:underline disabled:opacity-50">Cancelar chárter</button>}
            </div>
            {c.bookings.length > 0 && (
              <div className="space-y-1.5 border-t border-ink/10 pt-2">
                {c.bookings.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-bold text-ink">{b.name}</span>
                    <span className="text-ink/60">{b.people} pers · {b.contact}</span>
                    {b.message && <span className="text-ink/50 italic">“{b.message}”</span>}
                    <span className="font-mono text-[10px] uppercase tracking-wide text-ink/45">{b.status}</span>
                    {b.status === 'requested' && (
                      <span className="flex gap-1.5">
                        <button onClick={() => respond(c.id, 'accept', b.id)} disabled={busy === b.id + 'accept'} className="text-xs font-bold text-accent hover:underline disabled:opacity-50">Aceptar</button>
                        <button onClick={() => respond(c.id, 'decline', b.id)} disabled={busy === b.id + 'decline'} className="text-xs font-bold text-red-700 hover:underline disabled:opacity-50">Rechazar</button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
