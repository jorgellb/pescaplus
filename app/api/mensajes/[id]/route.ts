import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { z } from 'zod'
import { getUserFromRequest } from '@/lib/auth'
import { getOperatorByUser, getOperator } from '@/lib/operators-store'
import { getUserById } from '@/lib/users-store'
import { getThread, postMessage, markThreadRead, roleInThread } from '@/lib/messages-store'
import { notifyNewMessage } from '@/lib/message-notify'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const schema = z.object({ body: z.string().min(1).max(2000) })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = rateLimit(`msgsend:${clientIp(request)}`, 60, 30 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiados intentos.' }, { status: 429 })
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Escribe un mensaje.' }, { status: 400 })

  const thread = await getThread(id)
  if (!thread) return NextResponse.json({ success: false, error: 'Conversación no encontrada.' }, { status: 404 })
  const owned = await getOperatorByUser(user.id)
  const role = roleInThread(thread, user.id, owned?.id)
  if (!role) return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 403 })

  try {
    const message = await postMessage(id, role, parsed.data.body)
    await markThreadRead(id, role) // quien escribe ya está al día en su lado
    after(async () => {
      if (role === 'user') {
        const op = await getOperator(thread.operatorId)
        if (op?.email) await notifyNewMessage(op.email, id, user.name || 'Un pescador')
      } else {
        const buyer = await getUserById(thread.userId)
        if (buyer?.email) await notifyNewMessage(buyer.email, id, 'El patrón')
      }
    })
    return NextResponse.json({ success: true, message })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
  }
}
