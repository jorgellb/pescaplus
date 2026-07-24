import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createCharter, validateCharter } from '@/lib/charters-store'
import { getSpot } from '@/lib/fishing-spots'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  operatorId: z.string().min(1).max(120),
  manageToken: z.string().min(6).max(120),
  spotSlug: z.string().min(2).max(80),
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeStart: z.string().regex(/^\d{2}:\d{2}$/),
  durationH: z.number().min(0.5).max(24).optional(),
  modality: z.enum(['tierra', 'kayak', 'barco']).optional(),
  targetSpecies: z.string().max(40).optional(),
  level: z.enum(['principiante', 'medio', 'experto', 'cualquiera']).optional(),
  pricePerPerson: z.number().min(1).max(5000),
  maxPlaces: z.number().int().min(1).max(50).optional(),
  minToConfirm: z.number().int().min(1).max(50).optional(),
  includes: z.string().max(400).optional(),
  notes: z.string().max(800).optional(),
})

export async function POST(request: NextRequest) {
  const limit = rateLimit(`charter:${clientIp(request)}`, 12, 30 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiados intentos.' }, { status: 429 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Revisa los datos.' }, { status: 400 })
  if (!getSpot(parsed.data.spotSlug)) return NextResponse.json({ success: false, error: 'Zona no válida.' }, { status: 400 })
  const err = validateCharter(parsed.data)
  if (err) return NextResponse.json({ success: false, error: err }, { status: 400 })
  try {
    const { operatorId, manageToken, ...input } = parsed.data
    const charter = await createCharter(operatorId, manageToken, input)
    return NextResponse.json({ success: true, id: charter.id }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
  }
}
