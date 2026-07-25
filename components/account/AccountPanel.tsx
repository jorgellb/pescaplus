'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import ProfileForm from './ProfileForm'
import ReviewForm from './ReviewForm'

export interface BookingRow {
  id: string; charterId: string; status: string; people: number; priceTotal: number
  dateISO: string; dayLabel: string; spotName: string; modality: string; operatorName: string
  isPast: boolean; canReview: boolean; reviewedRating: number
}
export interface RsvpRow { id: string; meetupId: string; status: string; dayLabel: string; spotName: string; kind: string }
interface U { name: string; phone: string; bio: string; avatar: string; email: string }

const BOOKING_STATUS: Record<string, { label: string; cls: string }> = {
  requested: { label: 'Solicitada', cls: 'text-amber-700' },
  accepted: { label: 'Aceptada ✓', cls: 'text-accent' },
  paid: { label: 'Pagada ✓', cls: 'text-accent' },
  cancelled: { label: 'Cancelada', cls: 'text-red-700' },
}

export default function AccountPanel({ user, avatarChoices, bookings, rsvps, hasOperator, operatorSlot }: {
  user: U; avatarChoices: string[]; bookings: BookingRow[]; rsvps: RsvpRow[]; hasOperator: boolean; operatorSlot?: ReactNode
}) {
  const [tab, setTab] = useState<'reservas' | 'perfil' | 'patron'>('reservas')
  const tabCls = (t: string) => `px-4 py-2.5 text-xs font-bold uppercase tracking-wide rounded-xl transition-colors ${tab === t ? 'bg-accent text-paper' : 'text-ink/60 hover:text-ink hover:bg-ink/5'}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-ink/10 pb-3">
        <button onClick={() => setTab('reservas')} className={tabCls('reservas')}>🎣 Mis reservas</button>
        {hasOperator && <button onClick={() => setTab('patron')} className={tabCls('patron')}>⚓ Panel de patrón</button>}
        <button onClick={() => setTab('perfil')} className={tabCls('perfil')}>👤 Mi perfil</button>
      </div>

      {tab === 'reservas' && (
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="font-display uppercase text-xl leading-none">Chárters ({bookings.length})</p>
            {bookings.length === 0 && (
              <p className="text-sm text-ink/60">Todavía no has reservado ninguna salida. <Link href="/charters" className="text-accent font-bold hover:underline">Ver chárters →</Link></p>
            )}
            {bookings.map((b) => {
              const st = BOOKING_STATUS[b.status] ?? { label: b.status, cls: 'text-ink/50' }
              return (
                <div key={b.id} className={`border rounded-2xl p-4 ${b.isPast ? 'border-ink/10 bg-ink/[0.02]' : 'border-ink/15 bg-paper'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link href={`/charters/${b.charterId}`} className="font-bold text-ink hover:text-accent">{b.spotName}</Link>
                      <p className="text-[13px] text-ink/65 capitalize">{b.dayLabel} · {b.people} {b.people === 1 ? 'plaza' : 'plazas'} · {b.priceTotal} € · {b.operatorName}</p>
                    </div>
                    <span className={`font-mono text-[10px] uppercase tracking-widest ${st.cls}`}>{st.label}</span>
                  </div>
                  {b.canReview && <div className="mt-1"><ReviewForm charterId={b.charterId} initialRating={b.reviewedRating} done={b.reviewedRating > 0} /></div>}
                </div>
              )
            })}
          </div>

          <div className="space-y-3">
            <p className="font-display uppercase text-xl leading-none">Quedadas ({rsvps.length})</p>
            {rsvps.length === 0 && (
              <p className="text-sm text-ink/60">No estás apuntado a ninguna quedada. <Link href="/quedadas" className="text-accent font-bold hover:underline">Ver quedadas →</Link></p>
            )}
            {rsvps.map((r) => (
              <div key={r.id} className="border border-ink/15 rounded-2xl bg-paper p-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link href={`/quedadas/${r.meetupId}`} className="font-bold text-ink hover:text-accent">{r.spotName}</Link>
                  <p className="text-[13px] text-ink/65 capitalize">{r.dayLabel} · {r.kind === 'llamada' ? '¿quién se apunta?' : 'quedada'}</p>
                </div>
                <span className={`font-mono text-[10px] uppercase tracking-widest ${r.status === 'wait' ? 'text-amber-700' : 'text-accent'}`}>{r.status === 'wait' ? 'En lista de espera' : 'Apuntado ✓'}</span>
              </div>
            ))}
          </div>

          {!hasOperator && (
            <div className="border border-ink/15 rounded-2xl bg-paper p-5">
              <p className="font-display uppercase text-lg leading-none">⚓ ¿Eres patrón profesional?</p>
              <p className="text-sm text-ink/70 mt-1">Ofrece tus salidas, recibe reservas y cobra por adelantado. Verificamos tu licencia y seguro.</p>
              <Link href="/charters/operador" className="inline-block mt-3 bg-accent text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-ink transition-colors">Darme de alta como patrón</Link>
            </div>
          )}
        </div>
      )}

      {tab === 'patron' && hasOperator && <div>{operatorSlot}</div>}

      {tab === 'perfil' && (
        <div className="space-y-4">
          <ProfileForm user={user} avatarChoices={avatarChoices} />
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-xs font-bold uppercase tracking-wide text-red-700 hover:underline">Cerrar sesión</button>
          </form>
        </div>
      )}
    </div>
  )
}
