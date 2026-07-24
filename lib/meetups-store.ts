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
  /** For 'quedada' a fixed HH:MM; for 'llamada' a loose slot ("Mañana", "Flexible"…). */
  timeStart: string
  /** 'quedada' = concrete outing; 'llamada' = open call ("¿quién se apunta?"). */
  kind?: 'quedada' | 'llamada'
  durationH?: number | null
  modality: 'tierra' | 'kayak' | 'barco'
  targetSpecies?: string
  level?: string
  maxPlaces: number
  minToConfirm?: number
  /** How the outing's cost works: free, a fixed amount per person, or a total
   * shared cost split among everyone aboard (the "BlaBlaCar" model). */
  costMode?: 'gratis' | 'fijo' | 'reparto'
  costShare?: number | null // per person, for costMode 'fijo'
  totalCost?: number | null // total to split, for costMode 'reparto'
  notes?: string
}

export interface Rsvp {
  id: string
  meetupId: string
  name: string
  contact: string
  places: number
  status: 'in' | 'wait' | 'out'
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
  kind: 'quedada' | 'llamada'
  durationH: number | null
  modality: 'tierra' | 'kayak' | 'barco'
  targetSpecies: string
  level: string
  maxPlaces: number
  minToConfirm: number
  costMode: 'gratis' | 'fijo' | 'reparto'
  costShare: number | null
  totalCost: number | null
  notes: string
  status: 'open' | 'confirmed' | 'cancelled'
  createdAt: number
  /** Confirmed attendees (status 'in'). */
  rsvps: Rsvp[]
  /** Waiting list (status 'wait'), oldest first — filled once the meetup is full. */
  waitlist: Rsvp[]
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
  kind: 'quedada' | 'llamada'
  durationH: number | null
  modality: Meetup['modality']
  targetSpecies: string
  level: string
  maxPlaces: number
  minToConfirm: number
  costMode: 'gratis' | 'fijo' | 'reparto'
  costShare: number | null
  totalCost: number | null
  notes: string
}

function clean(input: MeetupInput): MeetupData {
  const kind: MeetupData['kind'] = input.kind === 'llamada' ? 'llamada' : 'quedada'
  const modality = MODALITIES.has(input.modality) ? input.modality : 'tierra'
  const level = input.level && LEVELS.has(input.level) ? input.level : 'cualquiera'
  const maxPlaces = Math.min(30, Math.max(1, Math.round(Number(input.maxPlaces) || 4)))
  const minToConfirm = Math.min(maxPlaces, Math.max(1, Math.round(Number(input.minToConfirm) || 1)))
  const money = (v: number | null | undefined) => (v != null && Number.isFinite(v) && v > 0 ? Math.min(2000, v) : null)
  const rawShare = money(input.costShare)
  const rawTotal = money(input.totalCost)
  // Resolve the cost mode from what was actually provided (defensive against
  // a client sending a mode without its amount). An open call ('llamada') never
  // carries a price — the cost is decided when it becomes a concrete outing.
  let costMode: MeetupData['costMode'] = kind === 'llamada' ? 'gratis' : input.costMode ?? 'gratis'
  if (costMode === 'reparto' && rawTotal == null) costMode = 'gratis'
  if (costMode === 'fijo' && rawShare == null) costMode = 'gratis'
  return {
    hostName: (input.hostName ?? '').trim().slice(0, 60),
    hostContact: (input.hostContact ?? '').trim().slice(0, 120),
    spotSlug: (input.spotSlug ?? '').trim(),
    meetingPoint: (input.meetingPoint ?? '').trim().slice(0, 120),
    dateISO: input.dateISO,
    timeStart: (input.timeStart ?? '').trim().slice(0, 20),
    kind,
    durationH: input.durationH != null && Number.isFinite(input.durationH) ? Math.min(24, Math.max(0.5, input.durationH)) : null,
    modality,
    targetSpecies: (input.targetSpecies ?? '').trim(),
    level,
    maxPlaces,
    minToConfirm,
    costMode,
    costShare: costMode === 'fijo' ? rawShare : null,
    totalCost: costMode === 'reparto' ? rawTotal : null,
    notes: (input.notes ?? '').trim().slice(0, 600),
  }
}

export interface CostInfo {
  mode: 'gratis' | 'fijo' | 'reparto'
  /** Short label for cards/lists ("Gratis", "5 €/persona", "≈12 €/persona"). */
  label: string
  /** For 'reparto': €/person now (host + current attendees) and when full. */
  perPersonNow?: number
  perPersonFull?: number
}

/** Cost display for a meetup. For 'reparto', the total splits among everyone
 * aboard (host + attendees), so the price per head drops as the group grows —
 * the "cuantos más, más barato" of shared boat trips (co-navegación, sin lucro). */
export function costInfo(m: Pick<Meetup, 'costMode' | 'costShare' | 'totalCost' | 'placesTaken' | 'maxPlaces'>): CostInfo {
  if (m.costMode === 'fijo' && m.costShare != null) {
    return { mode: 'fijo', label: `${m.costShare} €/persona` }
  }
  if (m.costMode === 'reparto' && m.totalCost != null) {
    const aboardNow = m.placesTaken + 1 // host + attendees
    const aboardFull = m.maxPlaces + 1
    const now = Math.ceil(m.totalCost / aboardNow)
    const full = Math.ceil(m.totalCost / aboardFull)
    return { mode: 'reparto', label: `≈${now} €/persona`, perPersonNow: now, perPersonFull: full }
  }
  return { mode: 'gratis', label: 'Gratis' }
}

/** Validate a meetup. A 'quedada' needs a fixed HH:MM; a 'llamada' (open call)
 * accepts a loose slot label, so it only needs a non-empty time hint. */
export function validateMeetup(input: MeetupInput): string | null {
  if (!input.hostName?.trim()) return 'Falta el nombre del anfitrión.'
  if (!input.hostContact?.trim()) return 'Falta un contacto (WhatsApp, teléfono o email).'
  if (!input.spotSlug?.trim()) return 'Falta la zona de pesca.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateISO ?? '')) return 'Fecha no válida.'
  if (input.kind === 'llamada') {
    if (!input.timeStart?.trim()) return 'Indica una franja (mañana, tarde…).'
  } else if (!/^\d{2}:\d{2}$/.test(input.timeStart ?? '')) {
    return 'Hora no válida.'
  }
  return null
}

// ---------------------------------------------------------------------------
// In-memory backend (only used when no database is configured)
// ---------------------------------------------------------------------------

interface StoredMeetup extends Omit<Meetup, 'rsvps' | 'waitlist' | 'placesTaken'> {
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

function assemble(base: Omit<Meetup, 'rsvps' | 'waitlist' | 'placesTaken'>, rsvps: Rsvp[]): Meetup {
  const active = rsvps.filter((r) => r.status === 'in')
  const waiting = rsvps.filter((r) => r.status === 'wait').sort((a, b) => a.createdAt - b.createdAt)
  return { ...base, rsvps: active, waitlist: waiting, placesTaken: active.reduce((s, r) => s + r.places, 0) }
}

function rowToBase(row: any): Omit<Meetup, 'rsvps' | 'waitlist' | 'placesTaken'> {
  return {
    id: row.id,
    hostName: row.hostName,
    hostContact: row.hostContact,
    spotSlug: row.spotSlug,
    meetingPoint: row.meetingPoint ?? '',
    dateISO: row.dateISO,
    timeStart: row.timeStart,
    kind: row.kind ?? 'quedada',
    durationH: row.durationH ?? null,
    modality: row.modality,
    targetSpecies: row.targetSpecies ?? '',
    level: row.level ?? 'cualquiera',
    maxPlaces: row.maxPlaces,
    minToConfirm: row.minToConfirm,
    costMode: row.costMode ?? 'gratis',
    costShare: row.costShare ?? null,
    totalCost: row.totalCost ?? null,
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
export async function joinMeetup(
  id: string,
  rsvp: { name: string; contact?: string; places?: number },
): Promise<{ meetup: Meetup; waitlisted: boolean }> {
  const name = (rsvp.name ?? '').trim().slice(0, 60)
  const contact = (rsvp.contact ?? '').trim().slice(0, 120)
  const places = Math.min(10, Math.max(1, Math.round(Number(rsvp.places) || 1)))
  if (!name) throw new Error('Falta tu nombre.')

  const current = await getMeetup(id)
  if (!current) throw new Error('Esta quedada ya no existe.')
  if (current.status === 'cancelled') throw new Error('Esta quedada se ha cancelado.')
  // Full → join the waiting list instead of being rejected.
  const waitlisted = current.placesTaken + places > current.maxPlaces
  const status: Rsvp['status'] = waitlisted ? 'wait' : 'in'

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      await prisma.rsvp.create({ data: { meetupId: id, name, contact, places, status } })
      if (!waitlisted && current.placesTaken + places >= current.minToConfirm && current.status === 'open') {
        await prisma.meetup.update({ where: { id }, data: { status: 'confirmed' } })
      }
    } catch (error) {
      console.error('RSVP write failed — not falling back to memory:', error)
      throw new Error(WRITE_FAIL)
    }
    return { meetup: (await getMeetup(id))!, waitlisted }
  }
  memRsvps().push({ id: `mr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, meetupId: id, name, contact, places, status, createdAt: Date.now() })
  const stored = memMeetups().find((m) => m.id === id)
  if (!waitlisted && stored && current.placesTaken + places >= stored.minToConfirm && stored.status === 'open') stored.status = 'confirmed'
  return { meetup: (await getMeetup(id))!, waitlisted }
}

/**
 * Host removes an attendee (with the management token). Frees their spot and
 * auto-promotes the oldest waiting people that now fit — so the waitlist flows.
 */
export async function removeRsvp(id: string, rsvpId: string, manageToken: string): Promise<Meetup | null> {
  const ok = await getMeetupByToken(id, manageToken)
  if (!ok) return null

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      await prisma.rsvp.updateMany({ where: { id: rsvpId, meetupId: id }, data: { status: 'out' } })
      const after = await getMeetup(id)
      if (after) {
        let taken = after.placesTaken
        for (const w of after.waitlist) {
          if (taken + w.places <= after.maxPlaces) {
            await prisma.rsvp.update({ where: { id: w.id }, data: { status: 'in' } })
            taken += w.places
          }
        }
      }
    } catch (error) {
      console.error('RSVP remove failed — not falling back to memory:', error)
      throw new Error(WRITE_FAIL)
    }
    return (await getMeetup(id))!
  }

  const rows = memRsvps()
  const target = rows.find((r) => r.id === rsvpId && r.meetupId === id)
  if (target) target.status = 'out'
  const after = await getMeetup(id)
  if (after) {
    let taken = after.placesTaken
    for (const w of after.waitlist) {
      if (taken + w.places <= after.maxPlaces) {
        const row = rows.find((r) => r.id === w.id)
        if (row) row.status = 'in'
        taken += w.places
      }
    }
  }
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
