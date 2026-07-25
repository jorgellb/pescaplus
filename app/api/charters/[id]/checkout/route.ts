import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCharter } from '@/lib/charters-store'
import { createCharterCheckout } from '@/lib/charter-payments'
import { stripeConfigured } from '@/lib/stripe'
import { getUserFromRequest } from '@/lib/auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  name: z.string().min(2).max(80),
  contact: z.string().min(3).max(120),
  people: z.number().int().min(1).max(20).optional(),
  message: z.string().max(400).optional(),
  website: z.string().max(200).optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!stripeConfigured()) return NextResponse.json({ success: false, error: 'Pagos aún no disponibles.' }, { status: 503 })
  const limit = rateLimit(`checkout:${clientIp(request)}`, 12, 30 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiados intentos.' }, { status: 429 })
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Revisa tus datos.' }, { status: 400 })
  if (parsed.data.website) return NextResponse.json({ success: true })
  const charter = await getCharter(id)
  if (!charter || charter.status === 'cancelled') return NextResponse.json({ success: false, error: 'Chárter no disponible.' }, { status: 400 })
  try {
    const user = await getUserFromRequest(request)
    const url = await createCharterCheckout(charter, { name: parsed.data.name, contact: parsed.data.contact, people: parsed.data.people ?? 1, message: parsed.data.message, userId: user?.id ?? null })
    return NextResponse.json({ success: true, url })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
  }
}
