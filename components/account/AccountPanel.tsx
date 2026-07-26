'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ProfileForm from './ProfileForm'
import ReviewForm from './ReviewForm'

export interface BookingRow {
  id: string; charterId: string; status: string; people: number; priceTotal: number
  dateISO: string; dayLabel: string; spotName: string; modality: string; operatorName: string
  isPast: boolean; canReview: boolean; reviewedRating: number; reviewPending: boolean
}
export interface RsvpRow { id: string; meetupId: string; status: string; dayLabel: string; spotName: string; kind: string }
export interface ThreadRow { id: string; otherName: string; charterLabel: string; lastBody: string; unread: number }
export interface ReceivedReview { id: string; authorName: string; authorAvatar: string; rating: number; text: string }
interface U { name: string; phone: string; bio: string; avatar: string; email: string; avgRating: number; reviewCount: number }
type Tab = 'reservas' | 'mensajes' | 'perfil' | 'patron'

const BOOKING_STATUS: Record<string, { label: string; cls: string }> = {
  requested: { label: 'Solicitada', cls: 'text-amber-700' },
  accepted: { label: 'Aceptada ✓', cls: 'text-accent' },
  paid: { label: 'Pagada ✓', cls: 'text-accent' },
  cancelled: { label: 'Cancelada', cls: 'text-red-700' },
}

export default function AccountPanel({ user, avatarChoices, bookings, rsvps, threads, received, hasOperator, operatorSlot, initialTab = 'reservas' }: {
  user: U; avatarChoices: string[]; bookings: BookingRow[]; rsvps: RsvpRow[]; threads: ThreadRow[]; received: ReceivedReview[]; hasOperator: boolean; operatorSlot?: ReactNode; initialTab?: Tab
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>(initialTab)
  const totalUnread = threads.reduce((s, t) => s + t.unread, 0)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const tabCls = (t: string) => `px-4 py-2.5 text-sm font-semibold rounded-full transition-colors ${tab === t ? 'bg-accent text-paper' : 'text-ink/60 hover:text-ink hover:bg-ink/5'}`

  const act = async (key: string, url: string, body: object) => {
    setBusy(key); setErr('')
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok || !data.success) { setErr(data.error || 'No se pudo completar.'); return }
      router.refresh()
    } catch { setErr('Fallo de red.') } finally { setBusy(null) }
  }
  const cancelBooking = (bookingId: string) => { if (confirm('¿Cancelar esta reserva?')) act('b' + bookingId, '/api/cuenta/reserva', { bookingId }) }
  const leaveMeetup = (rsvpId: string) => { if (confirm('¿Salir de esta quedada?')) act('r' + rsvpId, '/api/cuenta/quedada', { rsvpId }) }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-ink/10 pb-3">
        <button onClick={() => setTab('reservas')} className={tabCls('reservas')}>🎣 Mis reservas</button>
        <button onClick={() => setTab('mensajes')} className={tabCls('mensajes')}>💬 Mensajes{totalUnread > 0 && <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-600 text-paper text-[10px] font-bold rounded-full align-middle">{totalUnread}</span>}</button>
        {hasOperator && <button onClick={() => setTab('patron')} className={tabCls('patron')}>⚓ Panel de patrón</button>}
        <button onClick={() => setTab('perfil')} className={tabCls('perfil')}>👤 Mi perfil</button>
      </div>
      {err && <p className="text-sm text-red-700 border border-red-700/30 bg-red-700/[0.06] rounded-xl p-3">{err}</p>}

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
                <div key={b.id} className={`border rounded-2xl p-4 ${b.isPast ? 'border-ink/10 bg-ink/[0.02]' : 'border-ink/10 bg-paper'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link href={`/charters/${b.charterId}`} className="font-bold text-ink hover:text-accent">{b.spotName}</Link>
                      <p className="text-[13px] text-ink/65 capitalize">{b.dayLabel} · {b.people} {b.people === 1 ? 'plaza' : 'plazas'} · {b.priceTotal} € · {b.operatorName}</p>
                    </div>
                    <span className={`font-mono text-[10px] uppercase tracking-widest ${st.cls}`}>{st.label}</span>
                  </div>
                  {b.canReview && <div className="mt-1"><ReviewForm charterId={b.charterId} initialRating={b.reviewedRating} done={b.reviewedRating > 0} pending={b.reviewPending} /></div>}
                  {!b.isPast && (b.status === 'requested' || b.status === 'accepted') && (
                    <button onClick={() => cancelBooking(b.id)} disabled={busy === 'b' + b.id} className="mt-1.5 text-[10px] text-red-700 hover:underline disabled:opacity-50">Cancelar reserva</button>
                  )}
                  {!b.isPast && b.status === 'paid' && (
                    <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wide text-ink/40">Para cancelar una reserva pagada, contacta con el patrón.</p>
                  )}
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
              <div key={r.id} className="border border-ink/10 rounded-2xl bg-paper p-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link href={`/quedadas/${r.meetupId}`} className="font-bold text-ink hover:text-accent">{r.spotName}</Link>
                  <p className="text-[13px] text-ink/65 capitalize">{r.dayLabel} · {r.kind === 'llamada' ? '¿quién se apunta?' : 'quedada'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-[10px] uppercase tracking-widest ${r.status === 'wait' ? 'text-amber-700' : 'text-accent'}`}>{r.status === 'wait' ? 'En lista de espera' : 'Apuntado ✓'}</span>
                  <button onClick={() => leaveMeetup(r.id)} disabled={busy === 'r' + r.id} className="text-[10px] text-red-700 hover:underline disabled:opacity-50">Salir</button>
                </div>
              </div>
            ))}
          </div>

          {!hasOperator && (
            <div className="border border-ink/10 rounded-2xl bg-paper p-5">
              <p className="font-display uppercase text-lg leading-none">⚓ ¿Eres patrón profesional?</p>
              <p className="text-sm text-ink/70 mt-1">Ofrece tus salidas, recibe reservas y cobra por adelantado. Verificamos tu licencia y seguro.</p>
              <Link href="/charters/operador" className="inline-block mt-3 bg-accent text-paper px-5 py-2.5 text-sm font-semibold rounded-full hover:bg-ink transition-colors">Darme de alta como patrón</Link>
            </div>
          )}
        </div>
      )}

      {tab === 'mensajes' && (
        <div className="space-y-3">
          <p className="font-display uppercase text-xl leading-none">Conversaciones ({threads.length})</p>
          {threads.length === 0 && <p className="text-sm text-ink/60">No tienes mensajes. Puedes escribir a un patrón desde la ficha de su chárter.</p>}
          {threads.map((t) => (
            <Link key={t.id} href={`/cuenta/mensajes/${t.id}`} className={`block border rounded-2xl p-4 transition-colors hover:border-accent/50 ${t.unread > 0 ? 'border-accent/40 bg-accent/[0.05]' : 'border-ink/10 bg-paper'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-ink">{t.otherName}</span>
                {t.unread > 0 && <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-600 text-paper text-[10px] font-bold rounded-full">{t.unread}</span>}
              </div>
              <p className="text-[12px] text-ink/50">{t.charterLabel}</p>
              {t.lastBody && <p className="text-[13px] text-ink/70 mt-1 truncate">{t.lastBody}</p>}
            </Link>
          ))}
        </div>
      )}

      {tab === 'patron' && hasOperator && <div>{operatorSlot}</div>}

      {tab === 'perfil' && (
        <div className="space-y-4">
          <div className="border border-ink/10 rounded-2xl bg-paper p-5 max-w-xl">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Tu reputación como pescador</p>
            {user.reviewCount > 0 ? (
              <>
                <p className="font-display text-2xl leading-tight mt-1 text-ink">
                  <span className="text-amber-500">★</span> {user.avgRating.toFixed(1)}
                  <span className="text-ink/45 text-base"> · {user.reviewCount} {user.reviewCount === 1 ? 'valoración' : 'valoraciones'}</span>
                </p>
                <div className="space-y-2 mt-3">
                  {received.map((r) => (
                    <div key={r.id} className="border-t border-ink/10 pt-2">
                      <p className="text-sm">
                        <span className="mr-1">{r.authorAvatar}</span>
                        <span className="font-bold text-ink">{r.authorName}</span>
                        <span className="ml-2 text-amber-500">{'★'.repeat(r.rating)}<span className="text-ink/20">{'★'.repeat(5 - r.rating)}</span></span>
                      </p>
                      {r.text && <p className="text-[13px] text-ink/75 mt-0.5">{r.text}</p>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink/60 mt-1">Aún no tienes valoraciones. Los patrones podrán valorarte tras cada salida, igual que tú a ellos.</p>
            )}
          </div>
          <ProfileForm user={user} avatarChoices={avatarChoices} />
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-sm font-semibold text-red-700 hover:underline">Cerrar sesión</button>
          </form>
        </div>
      )}
    </div>
  )
}
