import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { createMeetup, validateMeetup } from '@/lib/meetups-store'
import { notifyNewMeetup } from '@/lib/zone-alerts-store'
import { getSpot } from '@/lib/fishing-spots'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  hostName: z.string().min(2).max(60),
  hostContact: z.string().min(3).max(120),
  spotSlug: z.string().min(2).max(80),
  meetingPoint: z.string().max(120).optional(),
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeStart: z.string().min(1).max(20), // HH:MM (quedada) o franja (llamada); validateMeetup afina
  kind: z.enum(['quedada', 'llamada']).optional(),
  durationH: z.number().min(0.5).max(24).optional(),
  modality: z.enum(['tierra', 'kayak', 'barco']),
  targetSpecies: z.string().max(40).optional(),
  level: z.enum(['principiante', 'medio', 'experto', 'cualquiera']).optional(),
  maxPlaces: z.number().int().min(1).max(30),
  minToConfirm: z.number().int().min(1).max(30).optional(),
  costMode: z.enum(['gratis', 'fijo', 'reparto']).optional(),
  costShare: z.number().min(0).max(2000).optional(),
  totalCost: z.number().min(0).max(2000).optional(),
  notes: z.string().max(600).optional(),
  // Honeypot
  website: z.string().max(200).optional(),
})

export async function POST(request: NextRequest) {
  const limit = rateLimit(`quedadas:${clientIp(request)}`, 6, 30 * 60_000)
  if (!limit.ok) {
    return NextResponse.json({ success: false, error: 'Demasiadas quedadas seguidas. Espera unos minutos.' }, { status: 429 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Revisa los datos del formulario.' }, { status: 400 })
  }
  if (parsed.data.website) return NextResponse.json({ success: true }) // bot
  if (!getSpot(parsed.data.spotSlug)) {
    return NextResponse.json({ success: false, error: 'Zona no válida.' }, { status: 400 })
  }
  const err = validateMeetup(parsed.data)
  if (err) return NextResponse.json({ success: false, error: err }, { status: 400 })

  try {
    const m = await createMeetup(parsed.data)
    // Notify zone subscribers AFTER the response is sent (non-blocking).
    after(() => notifyNewMeetup(m))
    return NextResponse.json({ success: true, id: m.id, manageToken: m.manageToken }, { status: 201 })
  } catch (error) {
    console.error('Error creating meetup:', error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
