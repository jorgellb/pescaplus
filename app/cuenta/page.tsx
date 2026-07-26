import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Layout from '@/components/Layout'
import AccountPanel, { type BookingRow, type RsvpRow, type ThreadRow, type ReceivedReview } from '@/components/account/AccountPanel'
import OperatorDashboard from '@/components/charters/OperatorDashboard'
import { getSessionUser } from '@/lib/auth'
import { AVATAR_CHOICES, getUserById } from '@/lib/users-store'
import { listBookingsByUser, listChartersByOperator, getCharter } from '@/lib/charters-store'
import { listRsvpsByUser } from '@/lib/meetups-store'
import { getOwnedOperator, getOperator } from '@/lib/operators-store'
import { listInbox } from '@/lib/messages-store'
import { getUserReviewForCharter, listReviewsForUser } from '@/lib/reviews-store'
import { buildDashboardCharters, toProfileProps } from '@/lib/operator-view'
import { stripeConfigured, PLATFORM_FEE_PERCENT } from '@/lib/stripe'
import { FISHING_SPOTS, getSpot } from '@/lib/fishing-spots'
import { SEA_SPECIES } from '@/lib/fishing-species'
import { fmtDayLabel, todayMadridISO } from '@/lib/solunar-format'

export const metadata: Metadata = {
  title: 'Mi cuenta',
  description: 'Gestiona tus reservas de chárter, tus quedadas y tu perfil en PescaPlus.',
  robots: { index: false, follow: true },
}

export default async function CuentaPage({ searchParams }: { searchParams: Promise<{ bienvenida?: string; tab?: string }> }) {
  const { bienvenida, tab } = await searchParams
  const user = await getSessionUser()
  if (!user) redirect('/entrar')

  const today = todayMadridISO()
  const [userBookings, userRsvps, owned] = await Promise.all([
    listBookingsByUser(user.id),
    listRsvpsByUser(user.id),
    getOwnedOperator(user.id),
  ])

  // Bandeja de mensajes (como pescador y, si lo es, como patrón).
  const inbox = await listInbox(user.id, owned?.id)
  const threads: ThreadRow[] = await Promise.all(inbox.map(async (t) => {
    const otherName = t.role === 'user'
      ? ((await getOperator(t.otherId))?.businessName || (await getOperator(t.otherId))?.name || 'Patrón')
      : ((await getUserById(t.otherId))?.name || 'Pescador')
    const c = await getCharter(t.charterId)
    const charterLabel = c ? `${getSpot(c.spotSlug)?.name ?? c.spotSlug} · ${fmtDayLabel(c.dateISO)}` : 'Chárter'
    return { id: t.id, otherName, charterLabel, lastBody: t.lastBody, unread: t.unread }
  }))
  const initialTab = tab === 'mensajes' ? 'mensajes' as const : tab === 'patron' && owned ? 'patron' as const : tab === 'perfil' ? 'perfil' as const : 'reservas' as const

  // Valoraciones que los patrones han dejado sobre este pescador.
  const received: ReceivedReview[] = user.reviewCount > 0
    ? (await listReviewsForUser(user.id, 10)).map((r) => ({ id: r.id, authorName: r.authorName, authorAvatar: r.authorAvatar, rating: r.rating, text: r.text }))
    : []

  // Filas de reservas del pescador (con elegibilidad de reseña).
  const bookings: BookingRow[] = await Promise.all(userBookings.map(async ({ booking, charter }) => {
    const isPast = charter.dateISO < today
    const eligible = (booking.status === 'paid' || booking.status === 'accepted') && charter.dateISO <= today
    const existing = eligible ? await getUserReviewForCharter(charter.id, user.id) : null
    return {
      id: booking.id,
      charterId: charter.id,
      status: booking.status,
      people: booking.people,
      priceTotal: Math.round(charter.pricePerPerson * booking.people),
      dateISO: charter.dateISO,
      dayLabel: fmtDayLabel(charter.dateISO),
      spotName: getSpot(charter.spotSlug)?.name ?? charter.spotSlug,
      modality: charter.modality,
      operatorName: charter.operator?.businessName || charter.operator?.name || 'Patrón',
      isPast,
      canReview: eligible,
      reviewedRating: existing?.rating ?? 0,
      reviewPending: existing?.pending ?? false,
    }
  }))

  const rsvps: RsvpRow[] = userRsvps.map(({ rsvp, meetup }) => ({
    id: rsvp.id,
    meetupId: meetup.id,
    status: rsvp.status,
    dayLabel: fmtDayLabel(meetup.dateISO),
    spotName: getSpot(meetup.spotSlug)?.name ?? meetup.spotSlug,
    kind: meetup.kind,
  }))

  // Ranura del patrón (si la cuenta posee un perfil de operador).
  let operatorSlot: React.ReactNode = null
  if (owned) {
    const charters = await listChartersByOperator(owned.id)
    let grossCents = 0
    let paidCount = 0
    for (const c of charters) {
      for (const b of c.bookings) {
        if (b.status === 'paid') { grossCents += Math.round(c.pricePerPerson * 100) * b.people; paidCount += 1 }
      }
    }
    const gross = grossCents / 100
    const net = Math.round(gross * (1 - PLATFORM_FEE_PERCENT / 100))
    const spots = FISHING_SPOTS.map((s) => ({ slug: s.slug, name: s.name, region: s.region }))
    const species = SEA_SPECIES.map((s) => ({ id: s.id, name: s.name }))
    operatorSlot = (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Estado" value={owned.verified ? 'Verificado ✓' : 'Pendiente'} accent={owned.verified} />
          <Stat label="Valoración" value={owned.reviewCount ? `★ ${owned.avgRating.toFixed(1)} (${owned.reviewCount})` : '— sin reseñas'} />
          <Stat label="Reservas pagadas" value={String(paidCount)} />
          <Stat label={`Tu parte (−${PLATFORM_FEE_PERCENT}%)`} value={`${net} €`} accent />
        </div>
        <OperatorDashboard
          operatorId={owned.id}
          manageToken={owned.manageToken}
          verified={owned.verified}
          stripeReady={owned.stripeReady}
          paymentsAvailable={stripeConfigured()}
          defaultSpot={owned.spotSlug}
          spots={spots}
          profile={toProfileProps(owned)}
          charters={await buildDashboardCharters(charters, { reviewerUserId: user.id })}
        />
      </div>
    )
  }

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/[0.07]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{user.avatar || '🎣'}</span>
            <div>
              <h1 className="font-display uppercase text-2xl sm:text-3xl leading-none text-ink">{user.name || 'Tu cuenta'}</h1>
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink/60 mt-1">{user.email}</p>
            </div>
          </div>
          {bienvenida === '1' && <p className="text-accent text-sm mt-3">✓ Sesión iniciada. ¡Bienvenido a bordo!</p>}
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <AccountPanel
          user={{ name: user.name, phone: user.phone, bio: user.bio, avatar: user.avatar, email: user.email, avgRating: user.avgRating, reviewCount: user.reviewCount }}
          avatarChoices={[...AVATAR_CHOICES]}
          bookings={bookings}
          rsvps={rsvps}
          threads={threads}
          received={received}
          hasOperator={!!owned}
          operatorSlot={operatorSlot}
          initialTab={initialTab}
        />
      </section>
    </Layout>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`border rounded-2xl p-3 ${accent ? 'border-accent/30 bg-accent/[0.06]' : 'border-ink/10 bg-paper'}`}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60">{label}</p>
      <p className={`font-display text-lg leading-tight mt-0.5 ${accent ? 'text-accent' : 'text-ink'}`}>{value}</p>
    </div>
  )
}
