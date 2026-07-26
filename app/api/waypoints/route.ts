import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserFromRequest } from '@/lib/auth'
import { createWaypoint, listWaypoints } from '@/lib/waypoints-store'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  name: z.string().min(1).max(80),
  type: z.string().max(20).optional(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  depthM: z.number().min(0).max(11000).nullable().optional(),
  notes: z.string().max(500).optional(),
  // 'public' solo llega si el usuario lo pide explícitamente.
  visibility: z.enum(['private', 'public']).optional(),
})

/** Las marcas del usuario. Nunca las de nadie más: no hay listado global. */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })
  return NextResponse.json({ success: true, waypoints: await listWaypoints(user.id) })
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(`wp:${clientIp(request)}`, 120, 60 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiadas marcas seguidas.' }, { status: 429 })
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  try {
    return NextResponse.json({ success: true, waypoint: await createWaypoint(user.id, parsed.data) }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
  }
}
