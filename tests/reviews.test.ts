import { describe, it, expect, beforeEach } from 'vitest'
import { requestMagicLink, consumeMagicLink } from '@/lib/auth'
import { registerOperator, setOperatorVerified } from '@/lib/operators-store'
import { createCharter } from '@/lib/charters-store'
import { createReview, listReviewsForOperator, listReviewsForUser, getUserReviewForCharter, anglerRatingsForCharter } from '@/lib/reviews-store'

const g = globalThis as unknown as Record<string, unknown[]>
beforeEach(() => {
  for (const k of ['__pescaplusUsers', '__pescaplusTokens', '__pescaplusSessions', '__pescaplusOperators', '__pescaplusCharters', '__pescaplusBookings', '__pescaplusReviews']) g[k] = []
})

function tokenFromLink(link: string): string { return new URL(link).searchParams.get('token') || '' }
async function makeUser(email: string) { return (await consumeMagicLink(tokenFromLink((await requestMagicLink(email)).devLink!)))! }

async function scenario() {
  const patron = await makeUser('patron@x.es')
  const op = await registerOperator({ name: 'Paco', email: 'patron@x.es', spotSlug: 'tarifa', licenseRef: 'L', insuranceRef: 'S' }, patron.id)
  await setOperatorVerified(op.id, true)
  const charter = await createCharter(op.id, op.manageToken, { spotSlug: 'tarifa', dateISO: '2020-06-06', timeStart: '08:00', modality: 'barco', pricePerPerson: 70, maxPlaces: 6, minToConfirm: 1 })
  return { patron, op, charter }
}

describe('reseñas bidireccionales', () => {
  it('el patrón valora a VARIOS pescadores de la misma salida', async () => {
    const { patron, op, charter } = await scenario()
    const ana = await makeUser('ana@x.es')
    const luis = await makeUser('luis@x.es')

    await createReview({ operatorId: op.id, charterId: charter.id, authorUserId: patron.id, direction: 'toAngler', subjectUserId: ana.id, rating: 5, text: 'Puntual' })
    await createReview({ operatorId: op.id, charterId: charter.id, authorUserId: patron.id, direction: 'toAngler', subjectUserId: luis.id, rating: 4 })

    // Cada pescador tiene la suya (la clave única incluye el sujeto).
    expect(await listReviewsForUser(ana.id)).toHaveLength(1)
    expect((await listReviewsForUser(ana.id))[0].text).toBe('Puntual')
    expect((await listReviewsForUser(luis.id))[0].rating).toBe(4)

    // Prefill del formulario del patrón para esa salida.
    const map = await anglerRatingsForCharter(charter.id, patron.id)
    expect(map[ana.id]).toBe(5)
    expect(map[luis.id]).toBe(4)
  })

  it('las dos direcciones no se mezclan', async () => {
    const { patron, op, charter } = await scenario()
    const ana = await makeUser('ana2@x.es')

    // Pescador → patrón.
    await createReview({ operatorId: op.id, charterId: charter.id, authorUserId: ana.id, rating: 5, text: 'Gran patrón' })
    // Patrón → pescador.
    await createReview({ operatorId: op.id, charterId: charter.id, authorUserId: patron.id, direction: 'toAngler', subjectUserId: ana.id, rating: 3, text: 'Correcto' })

    const opReviews = await listReviewsForOperator(op.id)
    expect(opReviews).toHaveLength(1)
    expect(opReviews[0].text).toBe('Gran patrón')

    const anaReviews = await listReviewsForUser(ana.id)
    expect(anaReviews).toHaveLength(1)
    expect(anaReviews[0].text).toBe('Correcto')

    // La reseña del pescador al patrón sigue localizándose por su clave.
    expect((await getUserReviewForCharter(charter.id, ana.id))!.rating).toBe(5)
  })

  it('re-valorar al mismo pescador actualiza, no duplica', async () => {
    const { patron, op, charter } = await scenario()
    const ana = await makeUser('ana3@x.es')
    await createReview({ operatorId: op.id, charterId: charter.id, authorUserId: patron.id, direction: 'toAngler', subjectUserId: ana.id, rating: 2 })
    await createReview({ operatorId: op.id, charterId: charter.id, authorUserId: patron.id, direction: 'toAngler', subjectUserId: ana.id, rating: 5, text: 'Mejoró' })
    const list = await listReviewsForUser(ana.id)
    expect(list).toHaveLength(1)
    expect(list[0].rating).toBe(5)
    expect(list[0].text).toBe('Mejoró')
  })

  it('valorar a un pescador exige indicar quién', async () => {
    const { patron, op, charter } = await scenario()
    await expect(createReview({ operatorId: op.id, charterId: charter.id, authorUserId: patron.id, direction: 'toAngler', rating: 4 }))
      .rejects.toThrow(/pescador/i)
  })
})
