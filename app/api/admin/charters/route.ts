import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { adminListCharters, adminCreateCharter } from '@/lib/charters-store'

export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const charters = await adminListCharters()
  return NextResponse.json({ success: true, charters })
}

const createSchema = z.object({
  operatorId: z.string().min(1).max(120),
  spotSlug: z.string().min(1).max(80),
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeStart: z.string().regex(/^\d{2}:\d{2}$/),
  durationH: z.number().nullable().optional(),
  modality: z.enum(['tierra', 'kayak', 'barco']).optional(),
  targetSpecies: z.string().max(40).optional(),
  level: z.string().max(20).optional(),
  pricePerPerson: z.number().min(0).max(5000),
  maxPlaces: z.number().int().min(1).max(50).optional(),
  minToConfirm: z.number().int().min(1).max(50).optional(),
  includes: z.string().max(400).optional(),
  notes: z.string().max(4000).optional(),
  tripType: z.enum(['privada', 'compartida']).optional(),
  meetingPoint: z.string().max(200).optional(),
  highlights: z.string().max(300).optional(),
  privatePrice: z.number().nullable().optional(),
})

export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  const { operatorId, ...input } = parsed.data
  try {
    const charter = await adminCreateCharter(operatorId, input)
    revalidatePath('/charters')
    return NextResponse.json({ success: true, charter }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
