import { isDatabaseConfigured } from '@/lib/products-store'
import { getOperator, getOperatorByToken, type Operator } from '@/lib/operators-store'

/**
 * Charter listings + booking requests (Fase 1 skeleton). A verified operator
 * posts a paid charter; anglers REQUEST a place (no online payment yet — that
 * hooks in via Stripe later at the CharterBooking.status 'accepted' → 'paid'
 * step). Only verified operators' charters are ever public.
 */
export interface CharterInput {
  spotSlug: string
  dateISO: string
  timeStart: string
  durationH?: number | null
  modality?: 'tierra' | 'kayak' | 'barco'
  targetSpecies?: string
  level?: string
  pricePerPerson: number
  maxPlaces?: number
  minToConfirm?: number
  includes?: string
  notes?: string
}

export interface CharterBooking {
  id: string
  charterId: string
  userId: string | null
  name: string
  contact: string
  people: number
  message: string
  status: 'requested' | 'accepted' | 'declined' | 'paid' | 'cancelled'
  createdAt: number
}

/** Public-safe operator summary shown on charter pages (no licence numbers). */
export interface OperatorPublic {
  id: string
  name: string
  businessName: string
  boatName: string
  boatType: string
  capacity: number
  bio: string
  verified: boolean
  stripeReady: boolean
  spotSlug: string
  avgRating: number
  reviewCount: number
}

export interface Charter {
  id: string
  operatorId: string
  spotSlug: string
  dateISO: string
  timeStart: string
  durationH: number | null
  modality: 'tierra' | 'kayak' | 'barco'
  targetSpecies: string
  level: string
  pricePerPerson: number
  maxPlaces: number
  minToConfirm: number
  includes: string
  notes: string
  status: 'open' | 'confirmed' | 'cancelled'
  createdAt: number
  operator: OperatorPublic | null
  bookings: CharterBooking[]
  /** Places taken by accepted bookings. */
  placesTaken: number
}

const WRITE_FAIL = 'La base de datos no está disponible ahora mismo; el cambio no se ha guardado. Inténtalo de nuevo en unos minutos.'

function operatorPublic(o: Operator): OperatorPublic {
  return {
    id: o.id,
    name: o.name,
    businessName: o.businessName,
    boatName: o.boatName,
    boatType: o.boatType,
    capacity: o.capacity,
    bio: o.bio,
    verified: o.verified,
    stripeReady: o.stripeReady,
    spotSlug: o.spotSlug,
    avgRating: o.avgRating,
    reviewCount: o.reviewCount,
  }
}

function cleanCharter(input: CharterInput) {
  const modality = (['tierra', 'kayak', 'barco'] as const).includes(input.modality as never) ? input.modality! : 'barco'
  const maxPlaces = Math.min(50, Math.max(1, Math.round(Number(input.maxPlaces) || 6)))
  return {
    spotSlug: (input.spotSlug ?? '').trim().slice(0, 80),
    dateISO: input.dateISO,
    timeStart: (input.timeStart ?? '').trim().slice(0, 20),
    durationH: input.durationH != null && Number.isFinite(input.durationH) ? Math.min(24, Math.max(0.5, input.durationH)) : null,
    modality,
    targetSpecies: (input.targetSpecies ?? '').trim().slice(0, 40),
    level: (input.level ?? 'cualquiera').trim().slice(0, 20),
    pricePerPerson: Math.min(5000, Math.max(0, Number(input.pricePerPerson) || 0)),
    maxPlaces,
    minToConfirm: Math.min(maxPlaces, Math.max(1, Math.round(Number(input.minToConfirm) || 1))),
    includes: (input.includes ?? '').trim().slice(0, 400),
    notes: (input.notes ?? '').trim().slice(0, 800),
  }
}

export function validateCharter(input: CharterInput): string | null {
  if (!input.spotSlug?.trim()) return 'Falta la zona.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateISO ?? '')) return 'Fecha no válida.'
  if (!/^\d{2}:\d{2}$/.test(input.timeStart ?? '')) return 'Hora no válida.'
  if (!(Number(input.pricePerPerson) > 0)) return 'Indica el precio por persona.'
  return null
}

// ---------------------------------------------------------------------------
// Memory backend
// ---------------------------------------------------------------------------
interface StoredCharter extends Omit<Charter, 'operator' | 'bookings' | 'placesTaken'> {}
const g = globalThis as unknown as { __pescaplusCharters?: StoredCharter[]; __pescaplusBookings?: CharterBooking[] }
function memC(): StoredCharter[] {
  if (!g.__pescaplusCharters) g.__pescaplusCharters = []
  return g.__pescaplusCharters
}
function memB(): CharterBooking[] {
  if (!g.__pescaplusBookings) g.__pescaplusBookings = []
  return g.__pescaplusBookings
}

function baseFromRow(row: any): Omit<Charter, 'operator' | 'bookings' | 'placesTaken'> {
  return {
    id: row.id,
    operatorId: row.operatorId,
    spotSlug: row.spotSlug,
    dateISO: row.dateISO,
    timeStart: row.timeStart,
    durationH: row.durationH ?? null,
    modality: row.modality,
    targetSpecies: row.targetSpecies ?? '',
    level: row.level ?? 'cualquiera',
    pricePerPerson: row.pricePerPerson,
    maxPlaces: row.maxPlaces,
    minToConfirm: row.minToConfirm,
    includes: row.includes ?? '',
    notes: row.notes ?? '',
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt,
  }
}

function bookingFromRow(row: any): CharterBooking {
  return {
    id: row.id,
    charterId: row.charterId,
    userId: row.userId ?? null,
    name: row.name,
    contact: row.contact ?? '',
    people: row.people,
    message: row.message ?? '',
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt,
  }
}

function assemble(base: Omit<Charter, 'operator' | 'bookings' | 'placesTaken'>, op: Operator | null, bookings: CharterBooking[]): Charter {
  const accepted = bookings.filter((b) => b.status === 'accepted' || b.status === 'paid')
  return {
    ...base,
    operator: op ? operatorPublic(op) : null,
    bookings,
    placesTaken: accepted.reduce((s, b) => s + b.people, 0),
  }
}

export async function createCharter(operatorId: string, manageToken: string, input: CharterInput): Promise<Charter> {
  const op = await getOperatorByToken(operatorId, manageToken)
  if (!op) throw new Error('Operador no autorizado.')
  if (!op.verified) throw new Error('Tu cuenta de operador aún no está verificada. Podrás publicar chárters en cuanto validemos tu licencia y seguro.')
  const data = cleanCharter(input)

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const row = await prisma.charter.create({ data: { ...data, operatorId } })
      return assemble(baseFromRow(row), op, [])
    } catch (error) {
      console.error('Charter write failed — not falling back to memory:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const stored: StoredCharter = { id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, operatorId, ...data, status: 'open', createdAt: Date.now() }
  memC().unshift(stored)
  return assemble(stored, op, [])
}

export async function getCharter(id: string): Promise<Charter | null> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.charter.findUnique({ where: { id }, include: { bookings: true } })
      if (!row) return null
      const op = await getOperator(row.operatorId)
      return assemble(baseFromRow(row), op, row.bookings.map(bookingFromRow))
    } catch (error) {
      console.warn('Charter read failed, using memory:', error)
    }
  }
  const c = memC().find((x) => x.id === id)
  if (!c) return null
  const op = await getOperator(c.operatorId)
  return assemble(c, op, memB().filter((b) => b.charterId === id))
}

/** Public upcoming charters — verified operators only. */
export async function listPublicCharters(fromDateISO: string, spotSlug?: string): Promise<Charter[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.charter.findMany({
        where: {
          status: { not: 'cancelled' },
          dateISO: { gte: fromDateISO },
          ...(spotSlug ? { spotSlug } : {}),
          operator: { verified: true },
        },
        orderBy: [{ dateISO: 'asc' }, { timeStart: 'asc' }],
        include: { bookings: true, operator: true },
        take: 200,
      })
      return rows.map((r) => assemble(baseFromRow(r), r.operator ? rowOperatorToOperator(r.operator) : null, r.bookings.map(bookingFromRow)))
    } catch (error) {
      console.warn('Charters read failed, using memory:', error)
    }
  }
  const out: Charter[] = []
  for (const c of memC()) {
    if (c.status === 'cancelled' || c.dateISO < fromDateISO) continue
    if (spotSlug && c.spotSlug !== spotSlug) continue
    const op = await getOperator(c.operatorId)
    if (!op?.verified) continue
    out.push(assemble(c, op, memB().filter((b) => b.charterId === c.id)))
  }
  return out.sort((a, b) => a.dateISO.localeCompare(b.dateISO) || a.timeStart.localeCompare(b.timeStart))
}

/** All of an operator's charters (their private dashboard). */
export async function listChartersByOperator(operatorId: string): Promise<Charter[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.charter.findMany({
        where: { operatorId },
        orderBy: [{ dateISO: 'asc' }],
        include: { bookings: true, operator: true },
        take: 200,
      })
      return rows.map((r) => assemble(baseFromRow(r), r.operator ? rowOperatorToOperator(r.operator) : null, r.bookings.map(bookingFromRow)))
    } catch (error) {
      console.warn('Operator charters read failed, using memory:', error)
    }
  }
  const op = await getOperator(operatorId)
  return memC()
    .filter((c) => c.operatorId === operatorId)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    .map((c) => assemble(c, op, memB().filter((b) => b.charterId === c.id)))
}

function rowOperatorToOperator(row: any): Operator {
  return {
    id: row.id, name: row.name, businessName: row.businessName ?? '', email: row.email, phone: row.phone ?? '',
    spotSlug: row.spotSlug, boatName: row.boatName ?? '', boatType: row.boatType ?? '', capacity: row.capacity,
    licenseRef: row.licenseRef ?? '', insuranceRef: row.insuranceRef ?? '', bio: row.bio ?? '',
    verified: row.verified, verifiedAt: row.verifiedAt instanceof Date ? row.verifiedAt.getTime() : row.verifiedAt ?? null,
    stripeAccountId: row.stripeAccountId ?? '', stripeReady: row.stripeReady ?? false,
    avgRating: row.avgRating ?? 0, reviewCount: row.reviewCount ?? 0, userId: row.userId ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt,
  }
}

export async function cancelCharter(id: string, operatorId: string, manageToken: string): Promise<boolean> {
  const op = await getOperatorByToken(operatorId, manageToken)
  if (!op) return false
  const c = await getCharter(id)
  if (!c || c.operatorId !== operatorId) return false
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      await prisma.charter.update({ where: { id }, data: { status: 'cancelled' } })
      return true
    } catch (error) {
      console.error('Charter cancel failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const stored = memC().find((x) => x.id === id)
  if (stored) stored.status = 'cancelled'
  return true
}

/** Angler requests a place (no payment yet). Never auto-accepts. */
export async function requestBooking(charterId: string, input: { name: string; contact: string; people?: number; message?: string; userId?: string | null }): Promise<CharterBooking> {
  const name = (input.name ?? '').trim().slice(0, 80)
  const contact = (input.contact ?? '').trim().slice(0, 120)
  const people = Math.min(20, Math.max(1, Math.round(Number(input.people) || 1)))
  const message = (input.message ?? '').trim().slice(0, 400)
  const userId = input.userId || null
  if (!name) throw new Error('Falta tu nombre.')
  if (!contact) throw new Error('Falta un contacto (email o teléfono).')

  const charter = await getCharter(charterId)
  if (!charter) throw new Error('Este chárter ya no existe.')
  if (charter.status === 'cancelled') throw new Error('Este chárter se ha cancelado.')

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const row = await prisma.charterBooking.create({ data: { charterId, userId, name, contact, people, message } })
      return bookingFromRow(row)
    } catch (error) {
      console.error('Booking write failed — not falling back to memory:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const b: CharterBooking = { id: `cb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, charterId, userId, name, contact, people, message, status: 'requested', createdAt: Date.now() }
  memB().push(b)
  return b
}

/**
 * Create a PAID booking (called from the Stripe webhook after checkout). The
 * booking is already paid, so it counts toward places and can confirm the
 * charter. Idempotent-ish: skips if a booking with the same paymentRef exists.
 */
export async function createPaidBooking(
  charterId: string,
  input: { name: string; contact: string; people: number; message?: string; paymentRef: string; userId?: string | null },
): Promise<void> {
  const name = (input.name ?? '').trim().slice(0, 80) || 'Reserva'
  const contact = (input.contact ?? '').trim().slice(0, 120)
  const people = Math.min(20, Math.max(1, Math.round(Number(input.people) || 1)))
  const userId = input.userId || null
  const message = `${(input.message ?? '').trim().slice(0, 300)} [pago ${input.paymentRef}]`.trim()

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const existing = await prisma.charterBooking.findFirst({ where: { charterId, message: { contains: input.paymentRef } } })
      if (existing) return
      await prisma.charterBooking.create({ data: { charterId, userId, name, contact, people, message, status: 'paid' } })
      const after = await getCharter(charterId)
      if (after && after.placesTaken >= after.minToConfirm && after.status === 'open') {
        await prisma.charter.update({ where: { id: charterId }, data: { status: 'confirmed' } })
      }
    } catch (error) {
      console.error('Paid booking create failed:', error)
      throw error
    }
    return
  }
  if (memB().some((b) => b.charterId === charterId && b.message.includes(input.paymentRef))) return
  memB().push({ id: `cb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, charterId, userId, name, contact, people, message, status: 'paid', createdAt: Date.now() })
  const after = await getCharter(charterId)
  const stored = memC().find((x) => x.id === charterId)
  if (after && stored && after.placesTaken >= after.minToConfirm && stored.status === 'open') stored.status = 'confirmed'
}

export interface UserBooking {
  booking: CharterBooking
  charter: Charter
}

/** Every charter booking made by a user, with its charter (for "Mis reservas"). */
export async function listBookingsByUser(userId: string): Promise<UserBooking[]> {
  if (!userId) return []
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.charterBooking.findMany({
        where: { userId, status: { not: 'declined' } },
        orderBy: { createdAt: 'desc' },
        include: { charter: { include: { bookings: true, operator: true } } },
        take: 100,
      })
      return rows.map((r) => ({
        booking: bookingFromRow(r),
        charter: assemble(baseFromRow(r.charter), r.charter.operator ? rowOperatorToOperator(r.charter.operator) : null, r.charter.bookings.map(bookingFromRow)),
      }))
    } catch (error) {
      console.warn('User bookings read failed, using memory:', error)
    }
  }
  const out: UserBooking[] = []
  for (const b of memB()) {
    if (b.userId !== userId || b.status === 'declined') continue
    const charter = await getCharter(b.charterId)
    if (charter) out.push({ booking: b, charter })
  }
  return out.sort((a, b) => b.booking.createdAt - a.booking.createdAt)
}

/** Operator accepts / declines a booking. Accepting auto-confirms the charter at the minimum. */
export async function respondBooking(charterId: string, bookingId: string, operatorId: string, manageToken: string, action: 'accept' | 'decline'): Promise<Charter | null> {
  const op = await getOperatorByToken(operatorId, manageToken)
  if (!op) return null
  const charter = await getCharter(charterId)
  if (!charter || charter.operatorId !== operatorId) return null
  const status: CharterBooking['status'] = action === 'accept' ? 'accepted' : 'declined'

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      await prisma.charterBooking.updateMany({ where: { id: bookingId, charterId }, data: { status } })
      const after = await getCharter(charterId)
      if (after && after.placesTaken >= after.minToConfirm && after.status === 'open') {
        await prisma.charter.update({ where: { id: charterId }, data: { status: 'confirmed' } })
      }
    } catch (error) {
      console.error('Booking response failed:', error)
      throw new Error(WRITE_FAIL)
    }
    return getCharter(charterId)
  }
  const b = memB().find((x) => x.id === bookingId && x.charterId === charterId)
  if (b) b.status = status
  const after = await getCharter(charterId)
  const stored = memC().find((x) => x.id === charterId)
  if (after && stored && after.placesTaken >= after.minToConfirm && stored.status === 'open') stored.status = 'confirmed'
  return getCharter(charterId)
}
