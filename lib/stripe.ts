import Stripe from 'stripe'

/**
 * Stripe Connect (Express) client. Charters are paid with a destination charge:
 * the angler pays, the money lands in the operator's connected account, and the
 * platform keeps `PLATFORM_FEE_PERCENT` as an application fee. Without
 * STRIPE_SECRET_KEY the module is inert (payments simply aren't offered), so the
 * rest of the site keeps working while Stripe is being set up.
 */
const key = process.env.STRIPE_SECRET_KEY

export const stripe: Stripe | null = key ? new Stripe(key) : null

export function stripeConfigured(): boolean {
  return !!stripe
}

/** Platform commission per booking, in percent (default 12). */
export const PLATFORM_FEE_PERCENT = Math.min(40, Math.max(0, Number(process.env.PLATFORM_FEE_PERCENT ?? 12)))

/** Application fee in cents for a given gross amount (also cents). */
export function applicationFeeCents(grossCents: number): number {
  return Math.round(grossCents * (PLATFORM_FEE_PERCENT / 100))
}
