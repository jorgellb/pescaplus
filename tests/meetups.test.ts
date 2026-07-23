import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateMeetup,
  createMeetup,
  listMeetupsBySpot,
  getMeetupByToken,
  joinMeetup,
  cancelMeetup,
} from '@/lib/meetups-store'

// No DATABASE_URL in the test env → the store uses its in-memory backend, which
// exercises the same logic (validation, capacity, auto-confirm, token auth).
const g = globalThis as unknown as { __pescaplusMeetups?: unknown[]; __pescaplusRsvps?: unknown[] }
beforeEach(() => {
  g.__pescaplusMeetups = []
  g.__pescaplusRsvps = []
})

const base = {
  hostName: 'Jorge',
  hostContact: 'wa.me/34600000000',
  spotSlug: 'cadiz',
  dateISO: '2026-08-01',
  timeStart: '07:00',
  modality: 'kayak' as const,
  targetSpecies: 'lubina',
  level: 'medio',
  maxPlaces: 4,
  minToConfirm: 2,
}

describe('meetups store — quedadas CRUD (memory path)', () => {
  it('rejects invalid input', () => {
    expect(validateMeetup({ ...base, hostName: '' })).toMatch(/anfitri/i)
    expect(validateMeetup({ ...base, dateISO: 'nope' })).toMatch(/fecha/i)
    expect(validateMeetup({ ...base, timeStart: '7am' })).toMatch(/hora/i)
    expect(validateMeetup(base)).toBeNull()
  })

  it('creates a meetup that starts open with a private token', async () => {
    const m = await createMeetup(base)
    expect(m.status).toBe('open')
    expect(m.placesTaken).toBe(0)
    expect(m.manageToken).toMatch(/^mt_/)
    const list = await listMeetupsBySpot('cadiz', '2026-07-01')
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(m.id)
  })

  it('auto-confirms once the minimum places are reached', async () => {
    const m = await createMeetup(base)
    let after = await joinMeetup(m.id, { name: 'Ana' })
    expect(after.placesTaken).toBe(1)
    expect(after.status).toBe('open')
    after = await joinMeetup(m.id, { name: 'Luis' })
    expect(after.placesTaken).toBe(2)
    expect(after.status).toBe('confirmed') // reached minToConfirm=2
  })

  it('refuses to overbook past maxPlaces', async () => {
    const m = await createMeetup({ ...base, maxPlaces: 3, minToConfirm: 1 })
    await joinMeetup(m.id, { name: 'Ana', places: 2 })
    await expect(joinMeetup(m.id, { name: 'Pepe', places: 2 })).rejects.toThrow(/plazas/i)
  })

  it('only the holder of the management token can cancel', async () => {
    const m = await createMeetup(base)
    expect(await getMeetupByToken(m.id, 'wrong')).toBeNull()
    expect(await getMeetupByToken(m.id, m.manageToken)).not.toBeNull()
    expect(await cancelMeetup(m.id, 'wrong')).toBe(false)
    expect(await cancelMeetup(m.id, m.manageToken)).toBe(true)
    // Cancelled meetups drop out of the zone listing.
    expect(await listMeetupsBySpot('cadiz', '2026-07-01')).toHaveLength(0)
  })

  it('lists only upcoming meetups for the zone, soonest first', async () => {
    await createMeetup({ ...base, dateISO: '2026-08-10', timeStart: '08:00' })
    await createMeetup({ ...base, dateISO: '2026-08-02', timeStart: '06:00' })
    await createMeetup({ ...base, dateISO: '2026-05-01' }) // past relative to the "from" date
    const list = await listMeetupsBySpot('cadiz', '2026-07-15')
    expect(list.map((m) => m.dateISO)).toEqual(['2026-08-02', '2026-08-10'])
  })
})
