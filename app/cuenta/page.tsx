import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Layout from '@/components/Layout'
import AccountPanel, { type BookingRow, type RsvpRow } from '@/components/account/AccountPanel'
import OperatorDashboard from '@/components/charters/OperatorDashboard'
import { getSessionUser } from '@/lib/auth'
import { AVATAR_CHOICES } from '@/lib/users-store'
import { listBookingsByUser, listChartersByOperator } from '@/lib/charters-store'
import { listRsvpsByUser } from '@/lib/meetups-store'
import { getOwnedOperator } from '@/lib/operators-store'
import { getUserReviewForCharter } from '@/lib/reviews-store'
import { stripeConfigured, PLATFORM_FEE_PERCENT } from '@/lib/stripe'
import { FISHING_SPOTS, getSpot } from '@/lib/fishing-spots'
import { SEA_SPECIES } from '@/lib/fishing-species'
import { fmtDayLabel, todayMadridISO } from '@/lib/solunar-format'

export const metadata: Metadata = {
  title: 'Mi cuenta',
  description: 'Gestiona tus reservas de chárter, tus quedadas y tu perfil en PescaPlus.',
  robots: { index: false, follow: true },
}

export default async function CuentaPage({ searchParams }: { searchParams: Promise<{ bienvenida?: string }> }) {
  const { bienvenida } = await searchParams
  const user = await getSessionUser()
  if (!user) redirect('/entrar')

  const today = todayMadridISO()
  const [userBookings, userRsvps, owned] = await Promise.all([
    listBookingsByUser(user.id),
    listRsvpsByUser(user.id),
    getOwnedOperator(user.id),
  ])

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
          species={species}
          profile={{ name: owned.name, businessName: owned.businessName, phone: owned.phone, boatName: owned.boatName, boatType: owned.boatType, capacity: owned.capacity, bio: owned.bio }}
          charters={charters.map((c) => ({ id: c.id, spotName: getSpot(c.spotSlug)?.name ?? c.spotSlug, dateISO: c.dateISO, dayLabel: fmtDayLabel(c.dateISO), timeStart: c.timeStart, modality: c.modality, pricePerPerson: c.pricePerPerson, maxPlaces: c.maxPlaces, placesTaken: c.placesTaken, status: c.status, bookings: c.bookings.map((b) => ({ id: b.id, name: b.name, contact: b.contact, people: b.people, message: b.message, status: b.status })) }))}
        />
      </div>
    )
  }

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{user.avatar || '🎣'}</span>
            <div>
              <h1 className="font-display uppercase text-2xl sm:text-3xl leading-none text-ink">{user.name || 'Tu cuenta'}</h1>
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mt-1">{user.email}</p>
            </div>
          </div>
          {bienvenida === '1' && <p className="text-accent text-sm mt-3">✓ Sesión iniciada. ¡Bienvenido a bordo!</p>}
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <AccountPanel
          user={{ name: user.name, phone: user.phone, bio: user.bio, avatar: user.avatar, email: user.email }}
          avatarChoices={[...AVATAR_CHOICES]}
          bookings={bookings}
          rsvps={rsvps}
          hasOperator={!!owned}
          operatorSlot={operatorSlot}
        />
      </section>
    </Layout>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`border rounded-2xl p-3 ${accent ? 'border-accent/30 bg-accent/[0.06]' : 'border-ink/15 bg-paper'}`}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50">{label}</p>
      <p className={`font-display text-lg leading-tight mt-0.5 ${accent ? 'text-accent' : 'text-ink'}`}>{value}</p>
    </div>
  )
}
