import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserFromRequest } from '@/lib/auth'
import { getSpotNote, saveSpotNote } from '@/lib/spot-notes-store'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { getSpot } from '@/lib/fishing-spots'

const schema = z.object({
  spotSlug: z.string().min(1).max(60),
  text: z.string().max(2000),
})

/** Solo la nota del usuario logueado para esa zona. Nunca la de nadie más. */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })
  const spotSlug = request.nextUrl.searchParams.get('zona') ?? ''
  if (!getSpot(spotSlug)) return NextResponse.json({ success: false, error: 'Zona no válida.' }, { status: 400 })
  const note = await getSpotNote(user.id, spotSlug)
  return NextResponse.json({ success: true, text: note?.text ?? '' })
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(`spotnote:${clientIp(request)}`, 60, 60 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiados guardados seguidos.' }, { status: 429 })
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  if (!getSpot(parsed.data.spotSlug)) return NextResponse.json({ success: false, error: 'Zona no válida.' }, { status: 400 })
  try {
    const note = await saveSpotNote(user.id, parsed.data.spotSlug, parsed.data.text)
    return NextResponse.json({ success: true, text: note.text })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
