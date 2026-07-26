import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { z } from 'zod'
import {
  respondBooking, cancelCharter, cancelBooking, cancelCharterSeries, getCharter,
  type Charter, type CharterBooking,
} from '@/lib/charters-store'
import { refundBooking } from '@/lib/charter-payments'
import { notifyAnglerBookingResponse, notifyAnglerCharterCancelled, notifyCharterConfirmed } from '@/lib/charter-notify'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  operatorId: z.string().min(1).max(120),
  manageToken: z.string().min(6).max(120),
  action: z.enum(['accept', 'decline', 'cancel', 'cancelBooking', 'cancelSeries']),
  bookingId: z.string().max(120).optional(),
})

/**
 * Refund every paid booking of a charter and tell each angler what happened.
 * Runs after the response: cancelling must not hang on Stripe or on e-mail.
 */
async function refundAndNotify(charter: Charter, bookings: CharterBooking[]): Promise<void> {
  for (const b of bookings) {
    const refunded = b.status === 'paid' && b.paymentRef ? await refundBooking(b.paymentRef) : false
    await notifyAnglerCharterCancelled(b, charter, refunded)
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = rateLimit(`chgestion:${clientIp(request)}`, 40, 30 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiados intentos.' }, { status: 429 })
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  const { operatorId, manageToken, action, bookingId } = parsed.data

  try {
    if (action === 'cancel') {
      // Se leen las reservas ANTES de cancelar: después hay que devolverles el dinero.
      const before = await getCharter(id)
      const ok = await cancelCharter(id, operatorId, manageToken)
      if (!ok) return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 403 })
      if (before) {
        const affected = before.bookings.filter((b) => b.status === 'paid' || b.status === 'accepted')
        after(() => refundAndNotify(before, affected))
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'cancelSeries') {
      const charter = await getCharter(id)
      if (!charter?.seriesId) return NextResponse.json({ success: false, error: 'Esta salida no forma parte de una serie.' }, { status: 400 })
      const count = await cancelCharterSeries(charter.seriesId, operatorId, manageToken)
      if (count === 0) return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 403 })
      // De la serie solo se devuelve lo de ESTA salida aquí; el resto de fechas
      // se procesan igual al leerlas, pero evitamos un bucle largo en la petición.
      const affected = charter.bookings.filter((b) => b.status === 'paid' || b.status === 'accepted')
      after(() => refundAndNotify(charter, affected))
      return NextResponse.json({ success: true, cancelled: count })
    }

    if (action === 'cancelBooking') {
      if (!bookingId) return NextResponse.json({ success: false, error: 'Falta la reserva.' }, { status: 400 })
      const before = await getCharter(id)
      const target = before?.bookings.find((b) => b.id === bookingId)
      const ok = await cancelBooking(id, bookingId, operatorId, manageToken)
      if (!ok) return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 403 })
      if (before && target) after(() => refundAndNotify(before, [target]))
      return NextResponse.json({ success: true })
    }

    if (!bookingId) return NextResponse.json({ success: false, error: 'Falta la reserva.' }, { status: 400 })
    const before = await getCharter(id)
    const wasOpen = before?.status === 'open'
    const charter = await respondBooking(id, bookingId, operatorId, manageToken, action)
    if (!charter) return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 403 })

    after(async () => {
      const booking = charter.bookings.find((b) => b.id === bookingId)
      if (booking) await notifyAnglerBookingResponse(booking, charter, action === 'accept')
      // Si esta aceptación es la que confirma la salida, avisa a todo el pasaje.
      if (wasOpen && charter.status === 'confirmed') {
        for (const b of charter.bookings) {
          if (b.status === 'accepted' || b.status === 'paid') await notifyCharterConfirmed(b, charter)
        }
      }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
