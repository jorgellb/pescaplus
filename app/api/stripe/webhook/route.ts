import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createPaidBooking } from '@/lib/charters-store'
import { getOperatorByStripeAccount, setOperatorStripeReady } from '@/lib/operators-store'

export async function POST(request: NextRequest) {
  if (!stripe) return NextResponse.json({ received: true })
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const sig = request.headers.get('stripe-signature')
  const body = await request.text()

  let event
  try {
    event = secret && sig ? stripe.webhooks.constructEvent(body, sig, secret) : JSON.parse(body)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'bad signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as { id: string; metadata?: Record<string, string>; payment_intent?: string }
      const m = s.metadata || {}
      if (m.charterId) {
        await createPaidBooking(m.charterId, {
          name: m.buyerName || 'Reserva',
          contact: m.buyerContact || '',
          people: Number(m.people) || 1,
          message: m.note || '',
          paymentRef: (typeof s.payment_intent === 'string' ? s.payment_intent : s.id),
        })
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
