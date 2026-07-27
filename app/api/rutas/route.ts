import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserFromRequest } from '@/lib/auth'
import { createTrack, listTracks } from '@/lib/tracks-store'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { MAX_TRACK_POINTS } from '@/lib/track-types'

const punto = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  t: z.number().int(),
  acc: z.number().nonnegative().optional(),
  spd: z.number().optional(),
  /** Sonda con el calado ya sumado; el crudo no llega hasta aquí. */
  depthM: z.number().positive().max(11000).optional(),
})

const schema = z.object({
  name: z.string().min(1).max(90),
  notes: z.string().max(1000).optional(),
  // El tope va con holgura sobre MAX_TRACK_POINTS: el navegador puede mandar
  // más de la cuenta y el store ya diezma. Lo que no se acepta es un cuerpo
  // desmedido que tumbe el servidor mientras se valida.
  points: z.array(punto).min(2).max(MAX_TRACK_POINTS * 3),
  visibility: z.enum(['private', 'public']).optional(),
})

/** Las rutas del usuario, sin sus puntos. Nunca las de nadie más. */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })
  return NextResponse.json({ success: true, tracks: await listTracks(user.id) })
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(`rutas:${clientIp(request)}`, 60, 60 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiadas rutas seguidas.' }, { status: 429 })
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  try {
    const track = await createTrack(user.id, parsed.data)
    // Se devuelve sin puntos: quien acaba de mandarlos ya los tiene.
    return NextResponse.json({ success: true, track: { ...track, points: [] } }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
  }
}
