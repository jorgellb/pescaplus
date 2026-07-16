import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { subscribeAlert } from '@/lib/alerts-store'
import { getSpot } from '@/lib/fishing-spots'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().email().max(160),
  spotSlug: z.string().min(2).max(80),
  especie: z.string().max(40).optional(),
  threshold: z.number().int().min(50).max(95).optional(),
  // Honeypot
  website: z.string().max(200).optional(),
})

export async function POST(request: NextRequest) {
  const limit = rateLimit(`alertas:${clientIp(request)}`, 5, 10 * 60_000)
  if (!limit.ok) {
    return NextResponse.json({ success: false, error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Revisa el email.' }, { status: 400 })
  }
  if (parsed.data.website) return NextResponse.json({ success: true })
  if (!getSpot(parsed.data.spotSlug)) {
    return NextResponse.json({ success: false, error: 'Zona no válida.' }, { status: 400 })
  }

  try {
    await subscribeAlert(parsed.data)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error subscribing alert:', error)
    return NextResponse.json({ success: false, error: 'No se pudo guardar. Inténtalo más tarde.' }, { status: 500 })
  }
}
