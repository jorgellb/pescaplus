import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserFromRequest } from '@/lib/auth'
import { leaveMeetupByUser } from '@/lib/meetups-store'

const schema = z.object({ rsvpId: z.string().min(1).max(120) })

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Debes iniciar sesión.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  try {
    const ok = await leaveMeetupByUser(parsed.data.rsvpId, user.id)
    return ok ? NextResponse.json({ success: true }) : NextResponse.json({ success: false, error: 'No se encontró tu inscripción.' }, { status: 404 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
