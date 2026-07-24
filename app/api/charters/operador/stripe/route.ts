import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOperatorByToken } from '@/lib/operators-store'
import { createOnboardingLink } from '@/lib/charter-payments'
import { stripeConfigured } from '@/lib/stripe'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({ operatorId: z.string().min(1).max(120), manageToken: z.string().min(6).max(120) })

export async function POST(request: NextRequest) {
  if (!stripeConfigured()) return NextResponse.json({ success: false, error: 'Pagos aún no disponibles.' }, { status: 503 })
  const limit = rateLimit(`opstripe:${clientIp(request)}`, 10, 30 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiados intentos.' }, { status: 429 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  const op = await getOperatorByToken(parsed.data.operatorId, parsed.data.manageToken)
  if (!op) return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 403 })
  if (!op.verified) return NextResponse.json({ success: false, error: 'Tu cuenta aún no está verificada.' }, { status: 400 })
  try {
    const url = await createOnboardingLink(op, parsed.data.manageToken)
    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error('Stripe onboarding link failed:', error)
    return NextResponse.json({ success: false, error: 'No se pudo iniciar la conexión con Stripe.' }, { status: 500 })
  }
}
