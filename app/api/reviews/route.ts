import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserFromRequest } from '@/lib/auth'
import { getCharter } from '@/lib/charters-store'
import { getOperatorByUser } from '@/lib/operators-store'
import { createReview } from '@/lib/reviews-store'
import { todayMadridISO } from '@/lib/solunar-format'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({
  charterId: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(800).optional(),
  direction: z.enum(['toOperator', 'toAngler']).optional(),
  subjectUserId: z.string().max(120).optional(),
})

export async function POST(request: NextRequest) {
  const limit = rateLimit(`review:${clientIp(request)}`, 30, 60 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiados intentos.' }, { status: 429 })
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Debes iniciar sesión para valorar.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Revisa la valoración.' }, { status: 400 })

  const charter = await getCharter(parsed.data.charterId)
  if (!charter || !charter.operator) return NextResponse.json({ success: false, error: 'Chárter no encontrado.' }, { status: 404 })
  // En ambos sentidos: solo se valora una salida que ya ha terminado.
  if (charter.dateISO > todayMadridISO()) return NextResponse.json({ success: false, error: 'Podrás valorar cuando termine la salida.' }, { status: 400 })

  const direction = parsed.data.direction ?? 'toOperator'

  if (direction === 'toAngler') {
    // Solo el patrón de ESE chárter, y solo a quien embarcó de verdad.
    const owned = await getOperatorByUser(user.id)
    if (!owned || owned.id !== charter.operatorId) {
      return NextResponse.json({ success: false, error: 'Solo el patrón del chárter puede valorar a sus pescadores.' }, { status: 403 })
    }
    const subjectUserId = parsed.data.subjectUserId ?? ''
    const aboard = charter.bookings.some((b) => b.userId === subjectUserId && (b.status === 'paid' || b.status === 'accepted'))
    if (!subjectUserId || !aboard) {
      return NextResponse.json({ success: false, error: 'Ese pescador no tiene plaza confirmada en esta salida.' }, { status: 403 })
    }
    try {
      const review = await createReview({ operatorId: charter.operatorId, charterId: charter.id, authorUserId: user.id, direction: 'toAngler', subjectUserId, rating: parsed.data.rating, text: parsed.data.text })
      return NextResponse.json({ success: true, review })
    } catch (error) {
      return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
    }
  }

  // Pescador → patrón: solo clientes reales de esa salida.
  const mine = charter.bookings.find((b) => b.userId === user.id && (b.status === 'paid' || b.status === 'accepted'))
  if (!mine) return NextResponse.json({ success: false, error: 'Solo puedes valorar chárters en los que participaste.' }, { status: 403 })

  try {
    const review = await createReview({ operatorId: charter.operatorId, charterId: charter.id, authorUserId: user.id, direction: 'toOperator', rating: parsed.data.rating, text: parsed.data.text })
    return NextResponse.json({ success: true, review })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
  }
}
