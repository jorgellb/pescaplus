import { describe, it, expect, beforeEach } from 'vitest'
import { requestMagicLink, consumeMagicLink, createSession, getUserFromRequest, SESSION_COOKIE } from '@/lib/auth'
import { updateUserProfile } from '@/lib/users-store'
import { registerOperator, setOperatorVerified, getOwnedOperator, getOperatorByUser } from '@/lib/operators-store'
import { createCharter, requestBooking, createPaidBooking, cancelBookingByUser, listBookingsByUser } from '@/lib/charters-store'
import { updateOperatorProfile } from '@/lib/operators-store'
import { createMeetup, joinMeetup, leaveMeetupByUser, listRsvpsByUser } from '@/lib/meetups-store'
import { createReview, listReviewsForOperator, getUserReviewForCharter } from '@/lib/reviews-store'

// No DATABASE_URL in tests → memory backend for every store.
const g = globalThis as unknown as Record<string, unknown[]>
beforeEach(() => {
  for (const k of ['__pescaplusUsers', '__pescaplusTokens', '__pescaplusSessions', '__pescaplusOperators', '__pescaplusCharters', '__pescaplusBookings', '__pescaplusReviews', '__pescaplusMeetups', '__pescaplusRsvps']) g[k] = []
})

function tokenFromLink(link: string): string {
  return new URL(link).searchParams.get('token') || ''
}
function reqWithSession(sid: string): Request {
  return new Request('http://localhost/', { headers: { cookie: `${SESSION_COOKIE}=${sid}` } })
}

describe('accounts — magic link + session', () => {
  it('requests a link, consumes it, and resolves the user from the session cookie', async () => {
    const res = await requestMagicLink('Pescador@Example.com')
    expect(res.ok).toBe(true)
    expect(res.dryRun).toBe(true) // sin RESEND configurado
    expect(res.devLink).toBeTruthy()

    const user = await consumeMagicLink(tokenFromLink(res.devLink!))
    expect(user).not.toBeNull()
    expect(user!.email).toBe('pescador@example.com') // normalizado

    // El token es de un solo uso.
    expect(await consumeMagicLink(tokenFromLink(res.devLink!))).toBeNull()

    const sid = await createSession(user!.id)
    const resolved = await getUserFromRequest(reqWithSession(sid))
    expect(resolved!.id).toBe(user!.id)

    // Sesión inexistente → sin usuario.
    expect(await getUserFromRequest(reqWithSession('no-existe'))).toBeNull()
  })

  it('updates the profile', async () => {
    const user = (await consumeMagicLink(tokenFromLink((await requestMagicLink('a@b.com')).devLink!)))!
    const updated = await updateUserProfile(user.id, { name: 'Capitán Nemo', avatar: '🦑', bio: 'x'.repeat(999) })
    expect(updated!.name).toBe('Capitán Nemo')
    expect(updated!.avatar).toBe('🦑')
    expect(updated!.bio.length).toBe(600) // recortado
  })
})

describe('accounts — bookings / operator ownership / reviews', () => {
  async function makeUser(email: string) {
    return (await consumeMagicLink(tokenFromLink((await requestMagicLink(email)).devLink!)))!
  }

  it('links charter bookings to the account and lists them', async () => {
    const patron = await makeUser('patron@x.es')
    const op = await registerOperator({ name: 'Paco', email: 'patron@x.es', spotSlug: 'tarifa', licenseRef: 'L1', insuranceRef: 'S1' }, patron.id)
    await setOperatorVerified(op.id, true)
    const charter = await createCharter(op.id, op.manageToken, { spotSlug: 'tarifa', dateISO: '2020-01-01', timeStart: '08:00', modality: 'barco', pricePerPerson: 90, maxPlaces: 6, minToConfirm: 1 })

    const angler = await makeUser('ana@x.es')
    await requestBooking(charter.id, { name: 'Ana', contact: 'ana@x.es', people: 2, userId: angler.id })
    // Reserva anónima (sin cuenta) no cuenta para nadie.
    await requestBooking(charter.id, { name: 'Anon', contact: 'anon@x.es', people: 1 })

    const mine = await listBookingsByUser(angler.id)
    expect(mine).toHaveLength(1)
    expect(mine[0].booking.people).toBe(2)
    expect(mine[0].charter.id).toBe(charter.id)
  })

  it('operator is owned by the account that registered it', async () => {
    const patron = await makeUser('dueño@x.es')
    const op = await registerOperator({ name: 'Dueño', email: 'dueño@x.es', spotSlug: 'tarifa', licenseRef: 'L', insuranceRef: 'S' }, patron.id)
    const owned = await getOwnedOperator(patron.id)
    expect(owned!.id).toBe(op.id)
    expect(owned!.manageToken).toBe(op.manageToken)
    expect((await getOperatorByUser(patron.id))!.id).toBe(op.id)
    // Otra cuenta no es dueña.
    expect(await getOwnedOperator('otra')).toBeNull()
  })

  it('a customer can review a past charter; the review lists and prefills', async () => {
    const patron = await makeUser('p2@x.es')
    const op = await registerOperator({ name: 'P2', email: 'p2@x.es', spotSlug: 'tarifa', licenseRef: 'L', insuranceRef: 'S' }, patron.id)
    await setOperatorVerified(op.id, true)
    const charter = await createCharter(op.id, op.manageToken, { spotSlug: 'tarifa', dateISO: '2020-05-05', timeStart: '08:00', modality: 'barco', pricePerPerson: 50, maxPlaces: 4, minToConfirm: 1 })
    const angler = await makeUser('cliente@x.es')

    const review = await createReview({ operatorId: op.id, charterId: charter.id, authorUserId: angler.id, rating: 5, text: 'Genial' })
    expect(review.rating).toBe(5)
    // Doble ciego: aún no es pública (ver tests/reviews.test.ts), pero su autora
    // la ve y le sirve de prefill.
    expect(review.pending).toBe(true)
    expect(await listReviewsForOperator(op.id)).toHaveLength(0)
    expect((await getUserReviewForCharter(charter.id, angler.id))!.text).toBe('Genial')

    // Segunda reseña del mismo usuario sobre el mismo chárter = actualiza, no duplica.
    await createReview({ operatorId: op.id, charterId: charter.id, authorUserId: angler.id, rating: 3 })
    expect((await getUserReviewForCharter(charter.id, angler.id))!.rating).toBe(3)

    // Valoración fuera de rango.
    await expect(createReview({ operatorId: op.id, charterId: charter.id, authorUserId: angler.id, rating: 9 })).rejects.toThrow(/1 a 5/)
  })
})

describe('accounts — gestión desde el panel (cancelar / salir / editar ficha)', () => {
  async function makeUser(email: string) {
    return (await consumeMagicLink(tokenFromLink((await requestMagicLink(email)).devLink!)))!
  }

  it('el pescador cancela su reserva sin pagar, pero no una ya pagada', async () => {
    const patron = await makeUser('p@x.es')
    const op = await registerOperator({ name: 'P', email: 'p@x.es', spotSlug: 'tarifa', licenseRef: 'L', insuranceRef: 'S' }, patron.id)
    await setOperatorVerified(op.id, true)
    const charter = await createCharter(op.id, op.manageToken, { spotSlug: 'tarifa', dateISO: '2030-01-01', timeStart: '08:00', modality: 'barco', pricePerPerson: 40, maxPlaces: 6, minToConfirm: 1 })
    const angler = await makeUser('c@x.es')

    const b = await requestBooking(charter.id, { name: 'C', contact: 'c@x.es', people: 1, userId: angler.id })
    expect(await cancelBookingByUser(b.id, angler.id)).toBe(true)
    expect((await listBookingsByUser(angler.id))[0].booking.status).toBe('cancelled')

    // Otro usuario no puede cancelar mi reserva.
    const b2 = await requestBooking(charter.id, { name: 'C', contact: 'c@x.es', people: 1, userId: angler.id })
    expect(await cancelBookingByUser(b2.id, 'otro')).toBe(false)

    // Una reserva pagada no se auto-cancela (reembolso aparte).
    await createPaidBooking(charter.id, { name: 'C', contact: 'c@x.es', people: 1, userId: angler.id, paymentRef: 'pi_X' })
    const paid = (await listBookingsByUser(angler.id)).find((x) => x.booking.status === 'paid')!
    await expect(cancelBookingByUser(paid.booking.id, angler.id)).rejects.toThrow(/pagada/i)
  })

  it('el pescador sale de una quedada y libera la plaza (auto-promoción)', async () => {
    const host = await makeUser('h@x.es')
    const m = await createMeetup({ hostName: 'H', hostContact: 'h@x.es', spotSlug: 'tarifa', dateISO: '2030-02-02', timeStart: '07:00', modality: 'barco', maxPlaces: 1, minToConfirm: 1 })
    const u1 = await makeUser('u1@x.es')
    const u2 = await makeUser('u2@x.es')
    const first = await joinMeetup(m.id, { name: 'U1', contact: 'u1@x.es', places: 1, userId: u1.id })
    expect(first.waitlisted).toBe(false)
    const second = await joinMeetup(m.id, { name: 'U2', contact: 'u2@x.es', places: 1, userId: u2.id })
    expect(second.waitlisted).toBe(true) // aforo lleno → lista de espera

    const mine = await listRsvpsByUser(u1.id)
    expect(await leaveMeetupByUser(mine[0].rsvp.id, u1.id)).toBe(true)
    // Al salir el primero, el segundo asciende de la lista de espera.
    const u2rsvp = (await listRsvpsByUser(u2.id))[0]
    expect(u2rsvp.rsvp.status).toBe('in')
  })

  it('el patrón edita su ficha pública (no la licencia)', async () => {
    const patron = await makeUser('p3@x.es')
    const op = await registerOperator({ name: 'P3', email: 'p3@x.es', spotSlug: 'tarifa', licenseRef: 'L-secreta', insuranceRef: 'S' }, patron.id)
    const updated = await updateOperatorProfile(op.id, op.manageToken, { businessName: 'Charter del Sur', boatName: 'La Gaviota', capacity: 10, bio: 'Salidas al atún' })
    expect(updated!.businessName).toBe('Charter del Sur')
    expect(updated!.capacity).toBe(10)
    expect(updated!.licenseRef).toBe('L-secreta') // intacta
    // Token equivocado → no autoriza.
    expect(await updateOperatorProfile(op.id, 'malo', { bio: 'x' })).toBeNull()
  })
})
