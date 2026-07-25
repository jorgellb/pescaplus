import type { Charter } from '@/lib/charters-store'
import type { Operator } from '@/lib/operators-store'
import { getUserById } from '@/lib/users-store'
import { anglerRatingsForCharter } from '@/lib/reviews-store'
import { getSpot } from '@/lib/fishing-spots'
import { fmtDayLabel, todayMadridISO } from '@/lib/solunar-format'

/**
 * Shape the operator's charters for their dashboard: labels, whether the trip
 * is over (so they can rate the anglers aboard), each angler's reputation, and
 * the rating this patrón already gave. Shared by /cuenta and the token page so
 * both dashboards show exactly the same thing.
 */
export interface DashboardBooking {
  id: string; name: string; contact: string; people: number; message: string; status: string
  userId: string | null; anglerRating: number; anglerReviews: number
  givenRating: number; givenPending: boolean
}
export interface DashboardCharter {
  id: string; spotName: string; dateISO: string; dayLabel: string; timeStart: string; modality: string
  pricePerPerson: number; maxPlaces: number; placesTaken: number; status: string
  isPast: boolean; bookings: DashboardBooking[]
}

/** Numeric specs travel to the form as strings so the input can be empty. */
function numStr(v: number | null): string {
  return v == null ? '' : String(v)
}

/** Operator → the shape OperatorDashboard's profile editor expects. */
export function toProfileProps(o: Operator) {
  return {
    name: o.name, businessName: o.businessName, phone: o.phone, bio: o.bio,
    boatName: o.boatName, boatType: o.boatType, capacity: o.capacity,
    marina: o.marina,
    boatLength: numStr(o.boatLength), boatBeam: numStr(o.boatBeam),
    boatEngineHp: numStr(o.boatEngineHp), boatMaxSpeedKn: numStr(o.boatMaxSpeedKn),
    boatYear: numStr(o.boatYear), crewSize: o.crewSize, photos: o.photos,
    navigation: o.navigation, safety: o.safety, amenities: o.amenities, gear: o.gear,
  }
}

export async function buildDashboardCharters(
  charters: Charter[],
  opts: { reviewerUserId?: string | null } = {},
): Promise<DashboardCharter[]> {
  const today = todayMadridISO()
  const reviewer = opts.reviewerUserId || null

  return Promise.all(charters.map(async (c) => {
    const isPast = c.dateISO < today
    // Solo hace falta consultar valoraciones dadas en salidas ya terminadas.
    const given = isPast && reviewer ? await anglerRatingsForCharter(c.id, reviewer) : {}

    const bookings = await Promise.all(c.bookings.map(async (b) => {
      // La reputación del pescador solo se muestra si tiene cuenta.
      const angler = isPast && b.userId ? await getUserById(b.userId) : null
      return {
        id: b.id, name: b.name, contact: b.contact, people: b.people, message: b.message, status: b.status,
        userId: reviewer ? b.userId : null, // sin patrón identificado no se ofrece valorar
        anglerRating: angler?.avgRating ?? 0,
        anglerReviews: angler?.reviewCount ?? 0,
        givenRating: b.userId ? (given[b.userId]?.rating ?? 0) : 0,
        givenPending: b.userId ? (given[b.userId]?.pending ?? false) : false,
      }
    }))

    return {
      id: c.id,
      spotName: getSpot(c.spotSlug)?.name ?? c.spotSlug,
      dateISO: c.dateISO,
      dayLabel: fmtDayLabel(c.dateISO),
      timeStart: c.timeStart,
      modality: c.modality,
      pricePerPerson: c.pricePerPerson,
      maxPlaces: c.maxPlaces,
      placesTaken: c.placesTaken,
      status: c.status,
      isPast,
      bookings,
    }
  }))
}
