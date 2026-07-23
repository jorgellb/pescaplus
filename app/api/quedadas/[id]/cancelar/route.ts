import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cancelMeetup } from '@/lib/meetups-store'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({ manageToken: z.string().min(6).max(120) })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = rateLimit(`cancelar:${clientIp(request)}`, 20, 30 * 60_000)
  if (!limit.ok) {
    return NextResponse.json({ success: false, error: 'Demasiados intentos.' }, { status: 429 })
  }
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Falta el token de gestión.' }, { status: 400 })
  }
  try {
    const ok = await cancelMeetup(id, parsed.data.manageToken)
    if (!ok) return NextResponse.json({ success: false, error: 'No autorizado o quedada inexistente.' }, { status: 403 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
