import { describe, it, expect, beforeEach } from 'vitest'
import { isEmail } from '@/lib/charter-notify'
import { registerOperator, setOperatorVerified } from '@/lib/operators-store'
import { createCharter, createPaidBooking, getCharter, listChartersOnDate } from '@/lib/charters-store'

const g = globalThis as unknown as Record<string, unknown[]>
beforeEach(() => {
  for (const k of ['__pescaplusOperators', '__pescaplusCharters', '__pescaplusBookings']) g[k] = []
})

describe('avisos de chárter', () => {
  it('solo se notifica a contactos que son correo (muchos dejan teléfono)', () => {
    expect(isEmail('ana@ejemplo.com')).toBe(true)
    expect(isEmail('  ana@ejemplo.com  ')).toBe(true)
    expect(isEmail('600123456')).toBe(false)
    expect(isEmail('whatsapp: 600123456')).toBe(false)
    expect(isEmail('')).toBe(false)
  })
})

describe('referencia de pago en su propia columna', () => {
  async function setup() {
    const op = await registerOperator({ name: 'P', email: 'p@x.es', spotSlug: 'tarifa', licenseRef: 'L', insuranceRef: 'S' })
    await setOperatorVerified(op.id, true)
    const charter = await createCharter(op.id, op.manageToken, {
      spotSlug: 'tarifa', dateISO: '2030-08-15', timeStart: '08:00', modality: 'barco',
      pricePerPerson: 100, maxPlaces: 4, minToConfirm: 1,
    })
    return { op, charter }
  }

  it('se guarda aparte del mensaje y sirve de clave de idempotencia', async () => {
    const { charter } = await setup()
    await createPaidBooking(charter.id, { name: 'Ana', contact: 'ana@x.es', people: 1, message: 'Voy con un amigo', paymentRef: 'pi_ABC' })

    const after = await getCharter(charter.id)
    const b = after!.bookings[0]
    expect(b.paymentRef).toBe('pi_ABC')
    // El mensaje del pescador queda limpio, sin la referencia incrustada.
    expect(b.message).toBe('Voy con un amigo')

    // Stripe puede repetir el evento: no debe duplicar.
    await createPaidBooking(charter.id, { name: 'Ana', contact: 'ana@x.es', people: 1, paymentRef: 'pi_ABC' })
    expect((await getCharter(charter.id))!.bookings).toHaveLength(1)

    // Otro pago distinto sí entra.
    await createPaidBooking(charter.id, { name: 'Luis', contact: 'luis@x.es', people: 1, paymentRef: 'pi_XYZ' })
    expect((await getCharter(charter.id))!.bookings).toHaveLength(2)
  })

  it('las salidas de un día concreto se localizan para el recordatorio', async () => {
    const { charter } = await setup()
    await createPaidBooking(charter.id, { name: 'Ana', contact: 'ana@x.es', people: 1, paymentRef: 'pi_1' })

    const found = await listChartersOnDate('2030-08-15')
    expect(found).toHaveLength(1)
    expect(found[0].bookings).toHaveLength(1)
    // Otro día no devuelve nada.
    expect(await listChartersOnDate('2030-08-16')).toHaveLength(0)
  })
})
