import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateOperatorProfile } from '@/lib/operators-store'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  operatorId: z.string().min(1).max(120),
  manageToken: z.string().min(6).max(120),
  name: z.string().max(80).optional(),
  businessName: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  boatName: z.string().max(80).optional(),
  boatType: z.string().max(80).optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  bio: z.string().max(800).optional(),
  // Características del barco. Los numéricos llegan como texto desde el
  // formulario (el input puede quedar vacío) → se coercionan y se limpian.
  marina: z.string().max(160).optional(),
  boatLength: z.coerce.number().min(0).max(60).optional().or(z.literal('')),
  boatBeam: z.coerce.number().min(0).max(20).optional().or(z.literal('')),
  boatEngineHp: z.coerce.number().min(0).max(5000).optional().or(z.literal('')),
  boatMaxSpeedKn: z.coerce.number().min(0).max(80).optional().or(z.literal('')),
  boatYear: z.coerce.number().min(0).max(2100).optional().or(z.literal('')),
  crewSize: z.number().int().min(1).max(20).optional(),
  navigation: z.array(z.string().max(40)).max(20).optional(),
  safety: z.array(z.string().max(40)).max(20).optional(),
  amenities: z.array(z.string().max(40)).max(20).optional(),
  gear: z.array(z.string().max(40)).max(20).optional(),
})

export async function POST(request: NextRequest) {
  const limit = rateLimit(`opperfil:${clientIp(request)}`, 30, 30 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiados intentos.' }, { status: 429 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Revisa los datos.' }, { status: 400 })
  const { operatorId, manageToken, ...profile } = parsed.data
  try {
    const updated = await updateOperatorProfile(operatorId, manageToken, profile)
    return updated ? NextResponse.json({ success: true }) : NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 403 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
