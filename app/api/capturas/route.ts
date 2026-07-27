import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { shareCatch, getSpotActivity } from '@/lib/catch-reports'
import { getUserFromRequest } from '@/lib/auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  spotSlug: z.string().min(2).max(80),
  speciesId: z.string().min(2).max(40),
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  qty: z.number().int().min(1).max(200).optional(),
  // El punto exacto y la hora son opcionales: se apunta igual desde el diario
  // sin carta delante, solo que el sello sale con el centro de la zona.
  lat: z.number().min(-90).max(90).nullable().optional(),
  lon: z.number().min(-180).max(180).nullable().optional(),
  timeISO: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
})

/** Share one catch, anonymously. The diary keeps the note; it never travels. */
export async function POST(request: NextRequest) {
  const limit = rateLimit(`captura:${clientIp(request)}`, 40, 60 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Has compartido muchas capturas seguidas. Espera un rato.' }, { status: 429 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  try {
    // La cuenta solo se guarda para moderación; nunca sale en los agregados.
    const user = await getUserFromRequest(request)
    await shareCatch(parsed.data, user?.id ?? null)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
  }
}

/** Aggregated activity for a zone (below the threshold it returns enough:false). */
export async function GET(request: NextRequest) {
  const spot = request.nextUrl.searchParams.get('zona') ?? ''
  if (!spot) return NextResponse.json({ success: false, error: 'Falta la zona.' }, { status: 400 })
  return NextResponse.json({ success: true, activity: await getSpotActivity(spot) })
}
