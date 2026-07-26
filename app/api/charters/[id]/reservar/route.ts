import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { after } from 'next/server'
import { requestBooking, getCharter } from '@/lib/charters-store'
import { getOperator } from '@/lib/operators-store'
import { notifyOperatorNewBooking } from '@/lib/charter-notify'
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
  const limit = rateLimit(`reservar:${clientIp(request)}`, 12, 30 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiados intentos.' }, { status: 429 })
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Revisa tus datos.' }, { status: 400 })
  if (parsed.data.website) return NextResponse.json({ success: true })
  try {
    const user = await getUserFromRequest(request)
    const booking = await requestBooking(id, { ...parsed.data, userId: user?.id ?? null })
    // El aviso va fuera de la respuesta: que un fallo de correo no tumbe la reserva.
    after(async () => {
      const charter = await getCharter(id)
      const op = charter ? await getOperator(charter.operatorId) : null
      if (charter && op?.email) await notifyOperatorNewBooking(op.email, charter, booking, false)
    })
    return NextResponse.json({ success: true, bookingId: booking.id })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
  }
}
