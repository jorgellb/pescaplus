import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { removeRsvp } from '@/lib/meetups-store'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({ manageToken: z.string().min(6).max(120), rsvpId: z.string().min(1).max(120) })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = rateLimit(`quitar:${clientIp(request)}`, 30, 30 * 60_000)
  if (!limit.ok) {
    return NextResponse.json({ success: false, error: 'Demasiados intentos.' }, { status: 429 })
  }
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  }
  try {
    const meetup = await removeRsvp(id, parsed.data.rsvpId, parsed.data.manageToken)
    if (!meetup) return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 403 })
    return NextResponse.json({ success: true, meetup })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
