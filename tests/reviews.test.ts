import { describe, it, expect, beforeEach } from 'vitest'
import { requestMagicLink, consumeMagicLink } from '@/lib/auth'
import { registerOperator, setOperatorVerified } from '@/lib/operators-store'
import { createCharter } from '@/lib/charters-store'
import { createReview, listReviewsForOperator, listReviewsForUser, getUserReviewForCharter, getReview, anglerRatingsForCharter, publishDueReviews, REVIEW_BLIND_DAYS } from '@/lib/reviews-store'

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

    // Cada pescador tiene la suya (la clave única incluye el sujeto). Siguen a
    // ciegas hasta que cada uno corresponda, así que se comprueban por autor.
    expect((await getReview(charter.id, patron.id, ana.id))!.text).toBe('Puntual')
    expect((await getReview(charter.id, patron.id, luis.id))!.rating).toBe(4)

    // Cuando cada pescador valora, se publica SOLO su par.
    await createReview({ operatorId: op.id, charterId: charter.id, authorUserId: ana.id, rating: 5 })
    expect(await listReviewsForUser(ana.id)).toHaveLength(1)
    expect((await listReviewsForUser(ana.id))[0].text).toBe('Puntual')
    expect(await listReviewsForUser(luis.id)).toHaveLength(0) // Luis aún no valoró

    // Prefill del formulario del patrón para esa salida (ve siempre lo suyo).
    const map = await anglerRatingsForCharter(charter.id, patron.id)
    expect(map[ana.id].rating).toBe(5)
    expect(map[luis.id].rating).toBe(4)
    expect(map[ana.id].pending).toBe(false) // Ana ya correspondió → publicada
    expect(map[luis.id].pending).toBe(true) // Luis no → sigue a ciegas
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
    // El autor ve siempre la suya (aún a ciegas): una sola, actualizada.
    const own = await getReview(charter.id, patron.id, ana.id)
    expect(own!.rating).toBe(5)
    expect(own!.text).toBe('Mejoró')
    // Al corresponder la otra parte se publica, y sigue habiendo una sola.
    await createReview({ operatorId: op.id, charterId: charter.id, authorUserId: ana.id, rating: 4 })
    const list = await listReviewsForUser(ana.id)
    expect(list).toHaveLength(1)
    expect(list[0].rating).toBe(5)
  })

  it('valorar a un pescador exige indicar quién', async () => {
    const { patron, op, charter } = await scenario()
    await expect(createReview({ operatorId: op.id, charterId: charter.id, authorUserId: patron.id, direction: 'toAngler', rating: 4 }))
      .rejects.toThrow(/pescador/i)
  })
})

describe('doble ciego', () => {
  it('una reseña permanece oculta hasta que la otra parte valora', async () => {
    const { patron, op, charter } = await scenario()
    const ana = await makeUser('ciega@x.es')

    // Solo valora el pescador → nadie la ve todavía.
    const first = await createReview({ operatorId: op.id, charterId: charter.id, authorUserId: ana.id, rating: 5, text: 'Crack' })
    expect(first.pending).toBe(true)
    expect(await listReviewsForOperator(op.id)).toHaveLength(0)
    // Pero su autora sí la ve.
    expect((await getReview(charter.id, ana.id))!.rating).toBe(5)

    // El patrón corresponde → se publican LAS DOS a la vez.
    const second = await createReview({ operatorId: op.id, charterId: charter.id, authorUserId: patron.id, direction: 'toAngler', subjectUserId: ana.id, rating: 4 })
    expect(second.pending).toBe(false)
    expect(await listReviewsForOperator(op.id)).toHaveLength(1)
    expect(await listReviewsForUser(ana.id)).toHaveLength(1)
  })

  it('las reseñas de otras salidas no desbloquean la tuya', async () => {
    const { patron, op, charter } = await scenario()
    const ana = await makeUser('a1@x.es')
    const otra = await createCharter(op.id, op.manageToken, { spotSlug: 'tarifa', dateISO: '2020-07-07', timeStart: '09:00', modality: 'barco', pricePerPerson: 80, maxPlaces: 4, minToConfirm: 1 })

    await createReview({ operatorId: op.id, charterId: charter.id, authorUserId: ana.id, rating: 5 })
    // El patrón valora a Ana en OTRA salida: no es la contraparte de la anterior.
    await createReview({ operatorId: op.id, charterId: otra.id, authorUserId: patron.id, direction: 'toAngler', subjectUserId: ana.id, rating: 3 })
    expect(await listReviewsForOperator(op.id)).toHaveLength(0)
    expect(await listReviewsForUser(ana.id)).toHaveLength(0)
  })

  it('al vencer el plazo se publica aunque no haya respuesta', async () => {
    const { op, charter } = await scenario()
    const ana = await makeUser('vencida@x.es')
    await createReview({ operatorId: op.id, charterId: charter.id, authorUserId: ana.id, rating: 5, text: 'Sin respuesta' })
    expect(await listReviewsForOperator(op.id)).toHaveLength(0)

    // Retrocedemos su fecha más allá del plazo ciego.
    const stored = (globalThis as unknown as { __pescaplusReviews: { createdAt: number }[] }).__pescaplusReviews
    stored[0].createdAt = Date.now() - (REVIEW_BLIND_DAYS + 1) * 24 * 60 * 60 * 1000

    // Visible de inmediato (se calcula al leer) y el cron la marca publicada.
    expect(await listReviewsForOperator(op.id)).toHaveLength(1)
    expect(await publishDueReviews()).toBe(1)
    expect(await publishDueReviews()).toBe(0) // idempotente
  })
})
