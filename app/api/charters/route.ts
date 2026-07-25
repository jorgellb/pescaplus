import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createCharterSeries, validateCharter } from '@/lib/charters-store'
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
  notes: z.string().max(4000).optional(),
  // Ficha detallada — los ids se validan luego contra el catálogo.
  tripType: z.enum(['privada', 'compartida']).optional(),
  meetingPoint: z.string().max(200).optional(),
  highlights: z.string().max(300).optional(),
  privatePrice: z.number().min(1).max(50000).optional(),
  languages: z.array(z.string().max(40)).max(20).optional(),
  techniques: z.array(z.string().max(40)).max(30).optional(),
  species: z.array(z.string().max(40)).max(60).optional(),
  areas: z.array(z.string().max(40)).max(10).optional(),
  included: z.array(z.string().max(40)).max(20).optional(),
  excluded: z.array(z.string().max(40)).max(20).optional(),
  policies: z.array(z.string().max(40)).max(20).optional(),
  seasons: z.array(z.string().max(40)).max(12).optional(),
  // Repetición semanal: publica la misma salida en varias fechas.
  repeat: z.object({
    weekdays: z.array(z.number().int().min(0).max(6)).max(7),
    untilISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).optional(),
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
    const { operatorId, manageToken, repeat, ...input } = parsed.data
    const { charters, truncated } = await createCharterSeries(operatorId, manageToken, input, repeat)
    return NextResponse.json({
      success: true,
      id: charters[0]?.id,
      count: charters.length,
      seriesId: charters[0]?.seriesId || '',
      truncated,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
  }
}
