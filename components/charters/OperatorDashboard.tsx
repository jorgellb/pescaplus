'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReviewForm from '@/components/account/ReviewForm'

interface Opt { slug: string; name: string; region: string }
interface Species { id: string; name: string }
interface Booking {
  id: string; name: string; contact: string; people: number; message: string; status: string
  /** Cuenta del pescador (si reservó logueado) y su reputación a bordo. */
  userId?: string | null; anglerRating?: number; anglerReviews?: number
  /** Estrellas que YA le puso este patrón en esta salida (0 = aún no). */
  givenRating?: number
}
interface Charter {
  id: string; spotName: string; dateISO: string; dayLabel: string; timeStart: string; modality: string
  pricePerPerson: number; maxPlaces: number; placesTaken: number; status: string; bookings: Booking[]
  /** La salida ya ha terminado → se puede valorar a los pescadores. */
  isPast?: boolean
}

interface Profile { name: string; businessName: string; phone: string; boatName: string; boatType: string; capacity: number; bio: string }

export default function OperatorDashboard({ operatorId, manageToken, verified, stripeReady, paymentsAvailable, defaultSpot, spots, species, charters, profile }: {
  operatorId: string; manageToken: string; verified: boolean; stripeReady: boolean; paymentsAvailable: boolean; defaultSpot: string; spots: Opt[]; species: Species[]; charters: Charter[]; profile: Profile
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [msg, setMsg] = useState('')

  const [editProfile, setEditProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [pf, setPf] = useState<Profile>(profile)
  const setP = <K extends keyof Profile>(k: K, v: Profile[K]) => setPf((s) => ({ ...s, [k]: v }))
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingProfile(true); setMsg('')
    try {
      const res = await fetch('/api/charters/operador/perfil', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId, manageToken, ...pf, capacity: Number(pf.capacity) }) })
      const data = await res.json()
      if (!res.ok || !data.success) { setMsg(data.error || 'No se pudo guardar la ficha.'); return }
      setEditProfile(false); router.refresh()
    } finally { setSavingProfile(false) }
  }

  const connectStripe = async () => {
    setConnecting(true)
    try {
      const res = await fetch('/api/charters/operador/stripe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operatorId, manageToken }) })
      const data = await res.json()
      if (data.success && data.url) { window.location.href = data.url; return }
      setMsg(data.error || 'No se pudo conectar con Stripe.'); setConnecting(false)
    } catch { setMsg('Fallo de red.'); setConnecting(false) }
  }
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

      {verified && paymentsAvailable && (
        stripeReady ? (
          <div className="border border-accent/30 rounded-2xl bg-accent/[0.06] p-4 flex flex-wrap items-center gap-3">
            <p className="font-bold text-ink">💳 Cobros online activos <span className="text-accent">✓</span></p>
            <p className="text-sm text-ink/70">Los pescadores pueden reservar y pagar por adelantado. El dinero llega a tu cuenta y nosotros retenemos la comisión de la plataforma.</p>
          </div>
        ) : (
          <div className="border border-ink/15 rounded-2xl bg-paper p-5 space-y-2">
            <p className="font-display uppercase text-xl leading-none">💳 Activa los cobros online</p>
            <p className="text-sm text-ink/70">Conecta tu cuenta con Stripe para aceptar reservas pagadas por adelantado. Es gratis, tarda un par de minutos y el dinero va directo a tu banco. {operatorId && <span className="text-ink/50">Sin esto, seguirás recibiendo solicitudes de reserva por contacto.</span>}</p>
            <button onClick={connectStripe} disabled={connecting} className="bg-accent text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-ink disabled:opacity-60 transition-colors">{connecting ? 'Conectando…' : 'Conectar cobros con Stripe'}</button>
            {msg && <p className="text-sm text-red-700">{msg}</p>}
          </div>
        )
      )}

      <div className="border border-ink/15 rounded-2xl bg-paper p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display uppercase text-xl leading-none">🪪 Tu ficha pública</p>
          {!editProfile && <button onClick={() => { setPf(profile); setEditProfile(true) }} className="text-xs font-bold uppercase tracking-wide text-accent hover:underline">Editar</button>}
        </div>
        {!editProfile ? (
          <p className="text-sm text-ink/70 mt-1">{profile.businessName || profile.name}{profile.boatName ? ` · ${profile.boatName}` : ''}{profile.boatType ? ` ${profile.boatType}` : ''}{profile.capacity ? ` · ${profile.capacity} plazas` : ''}{profile.bio ? ` — ${profile.bio}` : ''}</p>
        ) : (
          <form onSubmit={saveProfile} className="mt-3 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label className="block"><span className={L}>Nombre</span><input value={pf.name} onChange={(e) => setP('name', e.target.value)} maxLength={80} className={I} /></label>
              <label className="block"><span className={L}>Nombre comercial</span><input value={pf.businessName} onChange={(e) => setP('businessName', e.target.value)} maxLength={120} className={I} /></label>
              <label className="block"><span className={L}>Teléfono</span><input value={pf.phone} onChange={(e) => setP('phone', e.target.value)} maxLength={40} className={I} /></label>
              <label className="block"><span className={L}>Barco</span><input value={pf.boatName} onChange={(e) => setP('boatName', e.target.value)} maxLength={80} className={I} /></label>
              <label className="block"><span className={L}>Tipo de barco</span><input value={pf.boatType} onChange={(e) => setP('boatType', e.target.value)} maxLength={80} className={I} /></label>
              <label className="block"><span className={L}>Capacidad</span><input type="number" min={1} max={50} value={pf.capacity} onChange={(e) => setP('capacity', Number(e.target.value))} className={I} /></label>
            </div>
            <label className="block"><span className={L}>Sobre ti / tu servicio</span><textarea value={pf.bio} onChange={(e) => setP('bio', e.target.value)} maxLength={800} rows={3} className={I} /></label>
            {msg && <p className="text-sm text-red-700">{msg}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={savingProfile} className="bg-accent text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-ink disabled:opacity-60 transition-colors">{savingProfile ? 'Guardando…' : 'Guardar ficha'}</button>
              <button type="button" onClick={() => setEditProfile(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink/50 hover:text-ink">Cancelar</button>
            </div>
          </form>
        )}
      </div>

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
                    {(b.anglerReviews ?? 0) > 0 && <span className="text-amber-600 text-[12px]" title={`${b.anglerReviews} valoraciones de otros patrones`}>★ {(b.anglerRating ?? 0).toFixed(1)}</span>}
                    <span className="text-ink/60">{b.people} pers · {b.contact}</span>
                    {b.message && <span className="text-ink/50 italic">“{b.message}”</span>}
                    <span className="font-mono text-[10px] uppercase tracking-wide text-ink/45">{b.status}</span>
                    {b.status === 'requested' && (
                      <span className="flex gap-1.5">
                        <button onClick={() => respond(c.id, 'accept', b.id)} disabled={busy === b.id + 'accept'} className="text-xs font-bold text-accent hover:underline disabled:opacity-50">Aceptar</button>
                        <button onClick={() => respond(c.id, 'decline', b.id)} disabled={busy === b.id + 'decline'} className="text-xs font-bold text-red-700 hover:underline disabled:opacity-50">Rechazar</button>
                      </span>
                    )}
                    {(b.status === 'accepted' || b.status === 'paid') && c.status !== 'cancelled' && !c.isPast && (
                      <button onClick={() => respond(c.id, 'cancelBooking', b.id)} disabled={busy === b.id + 'cancelBooking'} className="text-xs font-bold text-red-700 hover:underline disabled:opacity-50">Cancelar</button>
                    )}
                    {/* Tras la salida, el patrón valora a quien embarcó (si tiene cuenta). */}
                    {c.isPast && b.userId && (b.status === 'accepted' || b.status === 'paid') && (
                      <div className="w-full">
                        <ReviewForm charterId={c.id} direction="toAngler" subjectUserId={b.userId} initialRating={b.givenRating ?? 0} done={(b.givenRating ?? 0) > 0} label={`Valorar a ${b.name}`} />
                      </div>
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
