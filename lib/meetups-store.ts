import { isDatabaseConfigured } from '@/lib/products-store'

/**
 * "Quedadas de pesca" store — free angler meetups (shore / kayak / boat cost-
 * share), the Phase-0 social layer. No accounts: the host keeps a secret
 * `manageToken` to edit/cancel; attendees RSVP with a name + contact.
 *
 * Persistence mirrors the product store's hardened pattern:
 *  - Database (Prisma/Neon) when configured — the real, shared backend.
 *  - In-memory ONLY when no database is configured (local dev / demos).
 *  - Writes NEVER silently fall back to memory when a DB is configured: they
 *    throw, so a failed save is visible and never lost on the next cold start.
 */

export interface MeetupInput {
  hostName: string
  hostContact: string
  spotSlug: string
  meetingPoint?: string
  dateISO: string
  timeStart: string
  durationH?: number | null
  modality: 'tierra' | 'kayak' | 'barco'
  targetSpecies?: string
  level?: string
  maxPlaces: number
  minToConfirm?: number
  costShare?: number | null
  notes?: string
}

export interface Rsvp {
  id: string
  meetupId: string
  name: string
  contact: string
  places: number
  status: 'in' | 'out'
  createdAt: number
}

export interface Meetup {
  id: string
  hostName: string
  hostContact: string
  spotSlug: string
  meetingPoint: string
  dateISO: string
  timeStart: string
  durationH: number | null
  modality: 'tierra' | 'kayak' | 'barco'
  targetSpecies: string
  level: string
  maxPlaces: number
  minToConfirm: number
  costShare: number | null
  notes: string
  status: 'open' | 'confirmed' | 'cancelled'
  createdAt: number
  rsvps: Rsvp[]
  /** Confirmed places taken (sum of active RSVPs). Derived, never stored. */
  placesTaken: number
}

/** A meetup plus its private management token — returned only on create. */
export interface MeetupWithToken extends Meetup {
  manageToken: string
}

const MODALITIES = new Set(['tierra', 'kayak', 'barco'])
const LEVELS = new Set(['principiante', 'medio', 'experto', 'cualquiera'])

function token(): string {
  return `mt_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
}

type MeetupData = {
  hostName: string
  hostContact: string
  spotSlug: string
  meetingPoint: string
  dateISO: string
  timeStart: string
  durationH: number | null
  modality: Meetup['modality']
  targetSpecies: string
  level: string
  maxPlaces: number
  minToConfirm: number
  costShare: number | null
  notes: string
}

function clean(input: MeetupInput): MeetupData {
  const modality = MODALITIES.has(input.modality) ? input.modality : 'tierra'
  const level = input.level && LEVELS.has(input.level) ? input.level : 'cualquiera'
  const maxPlaces = Math.min(30, Math.max(1, Math.round(Number(input.maxPlaces) || 4)))
  const minToConfirm = Math.min(maxPlaces, Math.max(1, Math.round(Number(input.minToConfirm) || 1)))
  const costShare = input.costShare != null && Number.isFinite(input.costShare) && input.costShare > 0 ? Math.min(200, input.costShare) : null
  return {
    hostName: (input.hostName ?? '').trim().slice(0, 60),
    hostContact: (input.hostContact ?? '').trim().slice(0, 120),
    spotSlug: (input.spotSlug ?? '').trim(),
    meetingPoint: (input.meetingPoint ?? '').trim().slice(0, 120),
    dateISO: input.dateISO,
    timeStart: input.timeStart,
    durationH: input.durationH != null && Number.isFinite(input.durationH) ? Math.min(24, Math.max(0.5, input.durationH)) : null,
    modality,
    targetSpecies: (input.targetSpecies ?? '').trim(),
    level,
    maxPlaces,
    minToConfirm,
    costShare,
    notes: (input.notes ?? '').trim().slice(0, 600),
  }
}

/** Valid future-ish date and a HH:MM time; keeps junk out of the store. */
export function validateMeetup(input: MeetupInput): string | null {
  if (!input.hostName?.trim()) return 'Falta el nombre del anfitrión.'
  if (!input.hostContact?.trim()) return 'Falta un contacto (WhatsApp, teléfono o email).'
  if (!input.spotSlug?.trim()) return 'Falta la zona de pesca.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateISO ?? '')) return 'Fecha no válida.'
  if (!/^\d{2}:\d{2}$/.test(input.timeStart ?? '')) return 'Hora no válida.'
  return null
}

// ---------------------------------------------------------------------------
// In-memory backend (only used when no database is configured)
// ---------------------------------------------------------------------------

interface StoredMeetup extends Omit<Meetup, 'rsvps' | 'placesTaken'> {
  manageToken: string
}
const globalForMeetups = globalThis as unknown as {
  __pescaplusMeetups?: StoredMeetup[]
  __pescaplusRsvps?: Rsvp[]
}
function memMeetups(): StoredMeetup[] {
  if (!globalForMeetups.__pescaplusMeetups) globalForMeetups.__pescaplusMeetups = []
  return globalForMeetups.__pescaplusMeetups
}
function memRsvps(): Rsvp[] {
  if (!globalForMeetups.__pescaplusRsvps) globalForMeetups.__pescaplusRsvps = []
  return globalForMeetups.__pescaplusRsvps
}

// ---------------------------------------------------------------------------
// Assembly helpers
// ---------------------------------------------------------------------------

function assemble(base: Omit<Meetup, 'rsvps' | 'placesTaken'>, rsvps: Rsvp[]): Meetup {
  const active = rsvps.filter((r) => r.status === 'in')
  return { ...base, rsvps: active, placesTaken: active.reduce((s, r) => s + r.places, 0) }
}

function rowToBase(row: any): Omit<Meetup, 'rsvps' | 'placesTaken'> {
  return {
    id: row.id,
    hostName: row.hostName,
    hostContact: row.hostContact,
    spotSlug: row.spotSlug,
    meetingPoint: row.meetingPoint ?? '',
    dateISO: row.dateISO,
    timeStart: row.timeStart,
    durationH: row.durationH ?? null,
    modality: row.modality,
    targetSpecies: row.targetSpecies ?? '',
    level: row.level ?? 'cualquiera',
    maxPlaces: row.maxPlaces,
    minToConfirm: row.minToConfirm,
    costShare: row.costShare ?? null,
    notes: row.notes ?? '',
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt,
  }
}

function rowToRsvp(row: any): Rsvp {
  return {
    id: row.id,
    meetupId: row.meetupId,
    name: row.name,
    contact: row.contact ?? '',
    places: row.places,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Upcoming, non-cancelled meetups for a zone (from a given date onward). */
export async function listMeetupsBySpot(spotSlug: string, fromDateISO: string): Promise<Meetup[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.meetup.findMany({
        where: { spotSlug, status: { not: 'cancelled' }, dateISO: { gte: fromDateISO } },
        orderBy: [{ dateISO: 'asc' }, { timeStart: 'asc' }],
        include: { rsvps: true },
        take: 50,
      })
      return rows.map((r) => assemble(rowToBase(r), r.rsvps.map(rowToRsvp)))
    } catch (error) {
      console.warn('Meetups read failed, using memory:', error)
    }
  }
  const rsvps = memRsvps()
  return memMeetups()
    .filter((m) => m.spotSlug === spotSlug && m.status !== 'cancelled' && m.dateISO >= fromDateISO)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO) || a.timeStart.localeCompare(b.timeStart))
    .map((m) => assemble(m, rsvps.filter((r) => r.meetupId === m.id)))
}

/** All upcoming meetups (for the hub / counts by zone). */
export async function listUpcomingMeetups(fromDateISO: string): Promise<Meetup[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.meetup.findMany({
        where: { status: { not: 'cancelled' }, dateISO: { gte: fromDateISO } },
        orderBy: [{ dateISO: 'asc' }, { timeStart: 'asc' }],
        include: { rsvps: true },
        take: 300,
      })
      return rows.map((r) => assemble(rowToBase(r), r.rsvps.map(rowToRsvp)))
    } catch (error) {
      console.warn('Meetups read failed, using memory:', error)
    }
  }
  const rsvps = memRsvps()
  return memMeetups()
    .filter((m) => m.status !== 'cancelled' && m.dateISO >= fromDateISO)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO) || a.timeStart.localeCompare(b.timeStart))
    .map((m) => assemble(m, rsvps.filter((r) => r.meetupId === m.id)))
}

export async function getMeetup(id: string): Promise<Meetup | null> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.meetup.findUnique({ where: { id }, include: { rsvps: true } })
      return row ? assemble(rowToBase(row), row.rsvps.map(rowToRsvp)) : null
    } catch (error) {
      console.warn('Meetup read failed, using memory:', error)
    }
  }
  const m = memMeetups().find((x) => x.id === id)
  if (!m) return null
  return assemble(m, memRsvps().filter((r) => r.meetupId === id))
}

/** Verify a management token belongs to a meetup (host-only actions). */
export async function getMeetupByToken(id: string, manageToken: string): Promise<Meetup | null> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.meetup.findUnique({ where: { id }, include: { rsvps: true } })
      if (!row || row.manageToken !== manageToken) return null
      return assemble(rowToBase(row), row.rsvps.map(rowToRsvp))
    } catch (error) {
      console.warn('Meetup token read failed, using memory:', error)
    }
  }
  const m = memMeetups().find((x) => x.id === id)
  if (!m || m.manageToken !== manageToken) return null
  return assemble(m, memRsvps().filter((r) => r.meetupId === id))
}

const WRITE_FAIL = 'La base de datos no está disponible ahora mismo; el cambio no se ha guardado. Inténtalo de nuevo en unos minutos.'

export async function createMeetup(input: MeetupInput): Promise<MeetupWithToken> {
  const data = clean(input)
  const manageToken = token()
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const row = await prisma.meetup.create({ data: { ...data, manageToken } })
      return { ...assemble(rowToBase(row), []), manageToken }
    } catch (error) {
      console.error('Meetup write failed — not falling back to memory:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const stored: StoredMeetup = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    manageToken,
    ...data,
    status: 'open',
    createdAt: Date.now(),
  }
  memMeetups().unshift(stored)
  return { ...assemble(stored, []), manageToken }
}

/** Join a meetup. Rejects when full or already closed. */
export async function joinMeetup(id: string, rsvp: { name: string; contact?: string; places?: number }): Promise<Meetup> {
  const name = (rsvp.name ?? '').trim().slice(0, 60)
  const contact = (rsvp.contact ?? '').trim().slice(0, 120)
  const places = Math.min(10, Math.max(1, Math.round(Number(rsvp.places) || 1)))
  if (!name) throw new Error('Falta tu nombre.')

  const current = await getMeetup(id)
  if (!current) throw new Error('Esta quedada ya no existe.')
  if (current.status === 'cancelled') throw new Error('Esta quedada se ha cancelado.')
  if (current.placesTaken + places > current.maxPlaces) throw new Error('No quedan plazas suficientes.')

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      await prisma.rsvp.create({ data: { meetupId: id, name, contact, places } })
      // Auto-confirm once the minimum is reached.
      if (current.placesTaken + places >= current.minToConfirm && current.status === 'open') {
        await prisma.meetup.update({ where: { id }, data: { status: 'confirmed' } })
      }
    } catch (error) {
      console.error('RSVP write failed — not falling back to memory:', error)
      throw new Error(WRITE_FAIL)
    }
    return (await getMeetup(id))!
  }
  memRsvps().push({ id: `mr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, meetupId: id, name, contact, places, status: 'in', createdAt: Date.now() })
  const stored = memMeetups().find((m) => m.id === id)
  if (stored && current.placesTaken + places >= stored.minToConfirm && stored.status === 'open') stored.status = 'confirmed'
  return (await getMeetup(id))!
}

export async function cancelMeetup(id: string, manageToken: string): Promise<boolean> {
  const ok = await getMeetupByToken(id, manageToken)
  if (!ok) return false
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      await prisma.meetup.update({ where: { id }, data: { status: 'cancelled' } })
      return true
    } catch (error) {
      console.error('Meetup cancel failed — not falling back to memory:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const m = memMeetups().find((x) => x.id === id)
  if (m) m.status = 'cancelled'
  return true
}
