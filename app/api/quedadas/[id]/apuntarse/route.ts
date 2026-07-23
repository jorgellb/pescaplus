import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { joinMeetup } from '@/lib/meetups-store'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  name: z.string().min(2).max(60),
  contact: z.string().max(120).optional(),
  places: z.number().int().min(1).max(10).optional(),
  website: z.string().max(200).optional(), // honeypot
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = rateLimit(`apuntarse:${clientIp(request)}`, 12, 30 * 60_000)
  if (!limit.ok) {
    return NextResponse.json({ success: false, error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 })
  }
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Revisa tu nombre.' }, { status: 400 })
  }
  if (parsed.data.website) return NextResponse.json({ success: true })

  try {
    const meetup = await joinMeetup(id, parsed.data)
    return NextResponse.json({ success: true, meetup })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
  }
}
