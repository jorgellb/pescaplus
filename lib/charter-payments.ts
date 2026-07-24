import { stripe, applicationFeeCents } from '@/lib/stripe'
import { SITE_URL } from '@/lib/seo'
import { setOperatorStripeAccount, setOperatorStripeReady, type Operator } from '@/lib/operators-store'
import type { Charter } from '@/lib/charters-store'
import { getSpot } from '@/lib/fishing-spots'
import { getSpecies } from '@/lib/fishing-species'
import { fmtDayLabel } from '@/lib/solunar-format'

/**
 * Stripe Connect (Express) glue for charters: operator onboarding, keeping the
 * operator's payout readiness in sync, and creating the angler's Checkout with
 * the platform fee taken via a destination charge.
 */

/** Create the operator's Express account if needed and return an onboarding URL. */
export async function createOnboardingLink(operator: Operator, manageToken: string): Promise<string> {
  if (!stripe) throw new Error('Pagos no configurados.')
  let accountId = operator.stripeAccountId
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'ES',
      email: operator.email || undefined,
      capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
      business_profile: {
        name: operator.businessName || operator.name,
        product_description: 'Salidas de pesca con patrón (chárter)',
      },
      metadata: { operatorId: operator.id },
    })
    accountId = account.id
    await setOperatorStripeAccount(operator.id, accountId)
  }
  const back = `${SITE_URL}/charters/operador?id=${operator.id}&t=${encodeURIComponent(manageToken)}`
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${back}&stripe=refresh`,
    return_url: `${back}&stripe=done`,
    type: 'account_onboarding',
  })
  return link.url
}

/** Pull the account status from Stripe and persist `stripeReady`. Returns ready. */
export async function syncOperatorStripe(operator: Operator): Promise<boolean> {
  if (!stripe || !operator.stripeAccountId) return operator.stripeReady
  try {
    const acct = await stripe.accounts.retrieve(operator.stripeAccountId)
    const ready = !!(acct.charges_enabled && acct.payouts_enabled && acct.details_submitted)
    if (ready !== operator.stripeReady) await setOperatorStripeReady(operator.id, ready)
    return ready
  } catch (error) {
    console.warn('syncOperatorStripe failed:', error)
    return operator.stripeReady
  }
}

/** Create a Checkout Session for a paid booking (destination charge + platform fee). */
export async function createCharterCheckout(
  charter: Charter,
  buyer: { name: string; contact: string; people: number; message?: string },
): Promise<string> {
  if (!stripe) throw new Error('Pagos no configurados.')
  if (!charter.operator?.stripeReady || !charter.operator) throw new Error('Este chárter aún no acepta pago online.')

  // The operator's connected account id lives on the full operator record; the
  // public view doesn't carry it, so we look it up.
  const { getOperator } = await import('@/lib/operators-store')
  const full = await getOperator(charter.operatorId)
  if (!full?.stripeAccountId || !full.stripeReady) throw new Error('Este chárter aún no acepta pago online.')

  const people = Math.min(20, Math.max(1, Math.round(buyer.people || 1)))
  const unit = Math.round(charter.pricePerPerson * 100)
  const gross = unit * people
  const spot = getSpot(charter.spotSlug)
  const sp = charter.targetSpecies ? getSpecies(charter.targetSpecies) : null
  const name = `Chárter de pesca · ${spot?.name ?? charter.spotSlug} · ${fmtDayLabel(charter.dateISO)}${sp && sp.id !== 'general' ? ` · ${sp.name}` : ''}`

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ quantity: people, price_data: { currency: 'eur', unit_amount: unit, product_data: { name } } }],
    payment_intent_data: {
      application_fee_amount: applicationFeeCents(gross),
      transfer_data: { destination: full.stripeAccountId },
    },
    customer_email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(buyer.contact) ? buyer.contact : undefined,
    metadata: {
      charterId: charter.id,
      buyerName: buyer.name.slice(0, 100),
      buyerContact: buyer.contact.slice(0, 100),
      people: String(people),
      note: (buyer.message ?? '').slice(0, 200),
    },
    success_url: `${SITE_URL}/charters/${charter.id}?pagado=1`,
    cancel_url: `${SITE_URL}/charters/${charter.id}?cancelado=1`,
  })
  if (!session.url) throw new Error('No se pudo iniciar el pago.')
  return session.url
}
