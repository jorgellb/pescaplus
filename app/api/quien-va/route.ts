import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserFromRequest } from '@/lib/auth'
import { getCheckinStatus, toggleCheckin } from '@/lib/spot-checkins-store'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { getSpot } from '@/lib/fishing-spots'
import { todayMadridISO } from '@/lib/solunar-format'

const schema = z.object({ spotSlug: z.string().min(1).max(60) })

/** El recuento es público (no hace falta sesión para verlo); "going" solo es
 * fiable si hay sesión — sin ella, se ve el conteo pero no el propio estado. */
export async function GET(request: NextRequest) {
  const spotSlug = request.nextUrl.searchParams.get('zona') ?? ''
  if (!getSpot(spotSlug)) return NextResponse.json({ success: false, error: 'Zona no válida.' }, { status: 400 })
  const user = await getUserFromRequest(request)
  const status = await getCheckinStatus(spotSlug, todayMadridISO(), user?.id ?? null)
  return NextResponse.json({ success: true, ...status })
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(`checkin:${clientIp(request)}`, 30, 60 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiados intentos seguidos.' }, { status: 429 })
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  if (!getSpot(parsed.data.spotSlug)) return NextResponse.json({ success: false, error: 'Zona no válida.' }, { status: 400 })
  try {
    const status = await toggleCheckin(user.id, parsed.data.spotSlug, todayMadridISO())
    return NextResponse.json({ success: true, ...status })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
