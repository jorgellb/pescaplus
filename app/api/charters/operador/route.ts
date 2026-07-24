import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { registerOperator, validateOperator } from '@/lib/operators-store'
import { getSpot } from '@/lib/fishing-spots'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  name: z.string().min(2).max(80),
  businessName: z.string().max(120).optional(),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional(),
  spotSlug: z.string().min(2).max(80),
  boatName: z.string().max(80).optional(),
  boatType: z.string().max(80).optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  licenseRef: z.string().min(2).max(120),
  insuranceRef: z.string().min(2).max(120),
  bio: z.string().max(800).optional(),
  website: z.string().max(200).optional(), // honeypot
})

export async function POST(request: NextRequest) {
  const limit = rateLimit(`operador:${clientIp(request)}`, 4, 60 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiados intentos. Espera un rato.' }, { status: 429 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Revisa los datos.' }, { status: 400 })
  if (parsed.data.website) return NextResponse.json({ success: true })
  if (!getSpot(parsed.data.spotSlug)) return NextResponse.json({ success: false, error: 'Puerto base no válido.' }, { status: 400 })
  const err = validateOperator(parsed.data)
  if (err) return NextResponse.json({ success: false, error: err }, { status: 400 })
  try {
    const op = await registerOperator(parsed.data)
    return NextResponse.json({ success: true, id: op.id, manageToken: op.manageToken }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
