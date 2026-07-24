import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { respondBooking, cancelCharter } from '@/lib/charters-store'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  operatorId: z.string().min(1).max(120),
  manageToken: z.string().min(6).max(120),
  action: z.enum(['accept', 'decline', 'cancel']),
  bookingId: z.string().max(120).optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = rateLimit(`chgestion:${clientIp(request)}`, 40, 30 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiados intentos.' }, { status: 429 })
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  const { operatorId, manageToken, action, bookingId } = parsed.data
  try {
    if (action === 'cancel') {
      const ok = await cancelCharter(id, operatorId, manageToken)
      return ok ? NextResponse.json({ success: true }) : NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 403 })
    }
    if (!bookingId) return NextResponse.json({ success: false, error: 'Falta la reserva.' }, { status: 400 })
    const charter = await respondBooking(id, bookingId, operatorId, manageToken, action)
    return charter ? NextResponse.json({ success: true }) : NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 403 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
