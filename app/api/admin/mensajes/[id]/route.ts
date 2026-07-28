import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { setContactMessageHandled, deleteContactMessage } from '@/lib/contact-store'
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rate-limit'
import { logAdminAction } from '@/lib/admin-audit'

const patchSchema = z.object({ handled: z.boolean() })

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const ip = clientIp(request)
  const limit = rateLimit(`admin-mutate:${ip}`, 60, 60_000)
  if (!limit.ok) return tooManyRequests(limit.retryAfter)
  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  const ok = await setContactMessageHandled(id, parsed.data.handled)
  if (!ok) return NextResponse.json({ success: false, error: 'Mensaje no encontrado.' }, { status: 404 })
  await logAdminAction({ action: 'update', entity: 'contactMessage', entityId: id, summary: parsed.data.handled ? 'Marcado respondido' : 'Marcado pendiente', ip })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const ip = clientIp(request)
  const limit = rateLimit(`admin-mutate:${ip}`, 60, 60_000)
  if (!limit.ok) return tooManyRequests(limit.retryAfter)
  const { id } = await params
  const ok = await deleteContactMessage(id)
  if (!ok) return NextResponse.json({ success: false, error: 'Mensaje no encontrado.' }, { status: 404 })
  await logAdminAction({ action: 'delete', entity: 'contactMessage', entityId: id, ip })
  return NextResponse.json({ success: true })
}
