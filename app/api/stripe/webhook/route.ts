import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createPaidBooking, getCharter } from '@/lib/charters-store'
import { notifyOperatorNewBooking } from '@/lib/charter-notify'
import { getOperator, getOperatorByStripeAccount, setOperatorStripeReady } from '@/lib/operators-store'

export async function POST(request: NextRequest) {
  if (!stripe) return NextResponse.json({ received: true })
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const sig = request.headers.get('stripe-signature')
  const body = await request.text()

  // Sin STRIPE_WEBHOOK_SECRET no hay forma de verificar que el evento viene
  // de verdad de Stripe: aceptar el JSON sin firma dejaría forjar un
  // "checkout.session.completed" y colar una reserva como pagada gratis. Se
  // rechaza en vez de confiar en el cuerpo — a diferencia del admin/cron, aquí
  // no hay "modo desarrollo" razonable: sin secreto, no hay webhook.
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET no configurado: webhook rechazado.')
    return NextResponse.json({ error: 'webhook not configured' }, { status: 500 })
  }
  if (!sig) return NextResponse.json({ error: 'missing signature' }, { status: 400 })

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'bad signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as { id: string; metadata?: Record<string, string>; payment_intent?: string }
      const m = s.metadata || {}
      if (m.charterId) {
        const ref = (typeof s.payment_intent === 'string' ? s.payment_intent : s.id)
        await createPaidBooking(m.charterId, {
          name: m.buyerName || 'Reserva',
          contact: m.buyerContact || '',
          people: Number(m.people) || 1,
          message: m.note || '',
          userId: m.userId || null,
          paymentRef: ref,
        })
        // Avisar al patrón: hasta ahora un pago entraba en silencio.
        const charter = await getCharter(m.charterId)
        const booking = charter?.bookings.find((b) => b.paymentRef === ref)
        if (charter && booking) {
          const op = await getOperator(charter.operatorId)
          if (op?.email) await notifyOperatorNewBooking(op.email, charter, booking, true)
        }
      }
    } else if (event.type === 'account.updated') {
      const a = event.data.object as { id: string; charges_enabled?: boolean; payouts_enabled?: boolean; details_submitted?: boolean }
      const op = await getOperatorByStripeAccount(a.id)
      if (op) await setOperatorStripeReady(op.id, !!(a.charges_enabled && a.payouts_enabled && a.details_submitted))
    }
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'handler error' }, { status: 500 })
  }
  return NextResponse.json({ received: true })
}
