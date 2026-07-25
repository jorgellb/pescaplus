import { describe, it, expect, beforeEach } from 'vitest'
import { requestMagicLink, consumeMagicLink, createSession, getUserFromRequest, SESSION_COOKIE } from '@/lib/auth'
import { updateUserProfile } from '@/lib/users-store'
import { registerOperator, setOperatorVerified, getOwnedOperator, getOperatorByUser } from '@/lib/operators-store'
import { createCharter, requestBooking, listBookingsByUser } from '@/lib/charters-store'
import { createReview, listReviewsForOperator, getUserReviewForCharter } from '@/lib/reviews-store'

// No DATABASE_URL in tests → memory backend for every store.
const g = globalThis as unknown as Record<string, unknown[]>
beforeEach(() => {
  for (const k of ['__pescaplusUsers', '__pescaplusTokens', '__pescaplusSessions', '__pescaplusOperators', '__pescaplusCharters', '__pescaplusBookings', '__pescaplusReviews']) g[k] = []
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

    const list = await listReviewsForOperator(op.id)
    expect(list).toHaveLength(1)
    expect(list[0].text).toBe('Genial')

    // Segunda reseña del mismo usuario sobre el mismo chárter = actualiza, no duplica.
    await createReview({ operatorId: op.id, charterId: charter.id, authorUserId: angler.id, rating: 3 })
    expect(await listReviewsForOperator(op.id)).toHaveLength(1)
    expect((await getUserReviewForCharter(charter.id, angler.id))!.rating).toBe(3)

    // Valoración fuera de rango.
    await expect(createReview({ operatorId: op.id, charterId: charter.id, authorUserId: angler.id, rating: 9 })).rejects.toThrow(/1 a 5/)
  })
})
