import { describe, it, expect, beforeEach } from 'vitest'
import { registerOperator, setOperatorVerified, validateOperator, listOperators } from '@/lib/operators-store'
import { createCharter, listPublicCharters, requestBooking, respondBooking, getCharter, validateCharter, createPaidBooking, validatePaidBooking } from '@/lib/charters-store'
import { setOperatorStripeReady, getOperator } from '@/lib/operators-store'

// No DATABASE_URL in tests → memory backend (same logic).
const g = globalThis as unknown as { __pescaplusOperators?: unknown[]; __pescaplusCharters?: unknown[]; __pescaplusBookings?: unknown[] }
beforeEach(() => {
  g.__pescaplusOperators = []
  g.__pescaplusCharters = []
  g.__pescaplusBookings = []
})

const opInput = {
  name: 'Capitán Paco',
  email: 'paco@charter.es',
  spotSlug: 'tarifa',
  licenseRef: 'PPER-12345',
  insuranceRef: 'POL-9988',
  capacity: 8,
}
const charterInput = {
  spotSlug: 'tarifa',
  dateISO: '2026-08-15',
  timeStart: '08:00',
  modality: 'barco' as const,
  targetSpecies: 'atun',
  pricePerPerson: 90,
  maxPlaces: 6,
  minToConfirm: 2,
}

describe('charters — operator verification + booking flow (memory)', () => {
  it('validates operator and charter input', () => {
    expect(validateOperator({ ...opInput, licenseRef: '' })).toMatch(/licencia|titulaci/i)
    expect(validateOperator({ ...opInput, insuranceRef: '' })).toMatch(/seguro/i)
    expect(validateOperator(opInput)).toBeNull()
    expect(validateCharter({ ...charterInput, pricePerPerson: 0 })).toMatch(/precio/i)
    expect(validateCharter(charterInput)).toBeNull()
  })

  it('an operator starts UNVERIFIED and cannot publish charters', async () => {
    const op = await registerOperator(opInput)
    expect(op.verified).toBe(false)
    await expect(createCharter(op.id, op.manageToken, charterInput)).rejects.toThrow(/verificad/i)
    // Not public either.
    expect(await listPublicCharters('2026-07-01')).toHaveLength(0)
  })

  it('once verified, the operator publishes and it goes public', async () => {
    const op = await registerOperator(opInput)
    expect(await setOperatorVerified(op.id, true)).toBe(true)
    const charter = await createCharter(op.id, op.manageToken, charterInput)
    expect(charter.status).toBe('open')
    expect(charter.operator?.verified).toBe(true)
    const pub = await listPublicCharters('2026-07-01')
    expect(pub).toHaveLength(1)
    expect(pub[0].id).toBe(charter.id)
    // Public view never leaks the licence number.
    expect(JSON.stringify(pub[0].operator)).not.toContain('PPER-12345')
  })

  it('booking is a request that the operator accepts; confirms at the minimum', async () => {
    const op = await registerOperator(opInput)
    await setOperatorVerified(op.id, true)
    const charter = await createCharter(op.id, op.manageToken, charterInput)

    const b = await requestBooking(charter.id, { name: 'Ana', contact: 'ana@x.es', people: 2 })
    expect(b.status).toBe('requested')
    // A pending request does not take places yet.
    expect((await getCharter(charter.id))!.placesTaken).toBe(0)

    // Wrong token can't respond.
    expect(await respondBooking(charter.id, b.id, op.id, 'wrong', 'accept')).toBeNull()

    const after = await respondBooking(charter.id, b.id, op.id, op.manageToken, 'accept')
    expect(after!.placesTaken).toBe(2)
    expect(after!.status).toBe('confirmed') // reached minToConfirm=2
  })

  it('a Stripe-paid booking takes places, auto-confirms, and is idempotent per payment', async () => {
    const op = await registerOperator(opInput)
    await setOperatorVerified(op.id, true)
    // Simulate completed Stripe onboarding.
    await setOperatorStripeReady(op.id, true)
    expect((await getOperator(op.id))!.stripeReady).toBe(true)

    const charter = await createCharter(op.id, op.manageToken, charterInput)

    // Webhook fires once → a paid booking of 2 reaches minToConfirm and confirms.
    await createPaidBooking(charter.id, { name: 'Lola', contact: 'lola@x.es', people: 2, paymentRef: 'pi_ABC123' })
    const after = await getCharter(charter.id)
    expect(after!.placesTaken).toBe(2)
    expect(after!.status).toBe('confirmed')

    // Stripe may deliver the same event twice — must not double-book.
    await createPaidBooking(charter.id, { name: 'Lola', contact: 'lola@x.es', people: 2, paymentRef: 'pi_ABC123' })
    expect((await getCharter(charter.id))!.placesTaken).toBe(2)
  })

  /**
   * Antes NADA comprobaba el aforo ni la fecha en el camino de pago: se podía
   * pagar la plaza 9 de un barco de 8, o una salida de la semana pasada, y el
   * único arreglo era devolver el dinero a mano.
   */
  it('no deja PAGAR una salida completa, pasada o cancelada', () => {
    const base = { status: 'open' as const, dateISO: '2026-08-15', maxPlaces: 6, placesTaken: 0 }
    const hoy = '2026-08-01'

    expect(validatePaidBooking(base, 4, hoy)).toBeNull()
    expect(validatePaidBooking(base, 6, hoy)).toBeNull() // el barco justo lleno vale

    expect(validatePaidBooking({ ...base, placesTaken: 6 }, 1, hoy)).toMatch(/completa/i)
    expect(validatePaidBooking({ ...base, placesTaken: 5 }, 2, hoy)).toMatch(/queda 1 plaza/i)
    expect(validatePaidBooking({ ...base, placesTaken: 2 }, 3, hoy)).toBeNull()
    expect(validatePaidBooking({ ...base, placesTaken: 4 }, 3, hoy)).toMatch(/quedan 2 plazas/i)

    expect(validatePaidBooking({ ...base, dateISO: '2026-07-31' }, 1, hoy)).toMatch(/ya ha pasado/i)
    expect(validatePaidBooking({ ...base, dateISO: hoy }, 1, hoy)).toBeNull() // hoy todavía se puede
    expect(validatePaidBooking({ ...base, status: 'cancelled' }, 1, hoy)).toMatch(/cancelad/i)
  })

  it('lists pending vs verified operators for the admin', async () => {
    const a = await registerOperator(opInput)
    await registerOperator({ ...opInput, email: 'otro@charter.es' })
    await setOperatorVerified(a.id, true)
    expect(await listOperators({ verified: false })).toHaveLength(1)
    expect(await listOperators({ verified: true })).toHaveLength(1)
    expect(await listOperators()).toHaveLength(2)
  })
})
