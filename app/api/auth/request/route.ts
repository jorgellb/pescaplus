import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requestMagicLink } from '@/lib/auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({ email: z.string().email().max(160), website: z.string().max(200).optional() })

export async function POST(request: NextRequest) {
  const limit = rateLimit(`authreq:${clientIp(request)}`, 6, 15 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Email no válido.' }, { status: 400 })
  if (parsed.data.website) return NextResponse.json({ success: true, dryRun: false })
  const res = await requestMagicLink(parsed.data.email)
  if (!res.ok) return NextResponse.json({ success: false, error: res.error || 'No se pudo enviar.' }, { status: 400 })
  return NextResponse.json({ success: true, dryRun: res.dryRun, devLink: res.devLink })
}
