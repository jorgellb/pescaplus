import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { z } from 'zod'
import { getUserFromRequest } from '@/lib/auth'
import { getCharter } from '@/lib/charters-store'
import { getOperatorByUser, getOperator } from '@/lib/operators-store'
import { getOrCreateThread, postMessage } from '@/lib/messages-store'
import { notifyNewMessage } from '@/lib/message-notify'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({ charterId: z.string().min(1).max(120), body: z.string().max(2000).optional() })

export async function POST(request: NextRequest) {
  const limit = rateLimit(`msgopen:${clientIp(request)}`, 30, 30 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiados intentos.' }, { status: 429 })
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión para escribir al patrón.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })

  const charter = await getCharter(parsed.data.charterId)
  if (!charter || !charter.operator) return NextResponse.json({ success: false, error: 'Chárter no encontrado.' }, { status: 404 })
  // Un patrón no puede abrir un hilo consigo mismo.
  const owned = await getOperatorByUser(user.id)
  if (owned && owned.id === charter.operatorId) return NextResponse.json({ success: false, error: 'Este es tu propio chárter.' }, { status: 400 })

  try {
    const thread = await getOrCreateThread(charter.id, charter.operatorId, user.id)
    if (parsed.data.body?.trim()) {
      await postMessage(thread.id, 'user', parsed.data.body)
      const op = await getOperator(charter.operatorId)
      if (op?.email) after(() => notifyNewMessage(op.email, thread.id, user.name || 'Un pescador'))
    }
    return NextResponse.json({ success: true, threadId: thread.id })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
  }
}
