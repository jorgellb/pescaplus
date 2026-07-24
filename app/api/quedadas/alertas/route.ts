import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { subscribeZoneAlert } from '@/lib/zone-alerts-store'
import { getSpot } from '@/lib/fishing-spots'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().email().max(160),
  spotSlug: z.string().min(2).max(80),
  website: z.string().max(200).optional(), // honeypot
})

export async function POST(request: NextRequest) {
  const limit = rateLimit(`quedalerta:${clientIp(request)}`, 8, 10 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Revisa el email.' }, { status: 400 })
  if (parsed.data.website) return NextResponse.json({ success: true })
  if (!getSpot(parsed.data.spotSlug)) return NextResponse.json({ success: false, error: 'Zona no válida.' }, { status: 400 })

  try {
    await subscribeZoneAlert(parsed.data)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Zone alert subscribe failed:', error)
    return NextResponse.json({ success: false, error: 'No se pudo guardar. Inténtalo más tarde.' }, { status: 500 })
  }
}
