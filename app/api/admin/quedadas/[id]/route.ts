import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { adminUpdateMeetup, adminDeleteMeetup, getMeetup } from '@/lib/meetups-store'
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rate-limit'
import { logAdminAction } from '@/lib/admin-audit'

const patchSchema = z.object({
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeStart: z.string().min(1).max(20).optional(),
  durationH: z.number().nullable().optional(),
  modality: z.enum(['tierra', 'kayak', 'barco']).optional(),
  targetSpecies: z.string().max(60).optional(),
  level: z.string().max(20).optional(),
  maxPlaces: z.number().int().min(1).max(30).optional(),
  minToConfirm: z.number().int().min(1).max(30).optional(),
  meetingPoint: z.string().max(120).optional(),
  notes: z.string().max(600).optional(),
  status: z.enum(['open', 'confirmed', 'cancelled']).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const ip = clientIp(request)
  const limit = rateLimit(`admin-mutate:${ip}`, 60, 60_000)
  if (!limit.ok) return tooManyRequests(limit.retryAfter)
  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  try {
    const meetup = await adminUpdateMeetup(id, parsed.data)
    if (!meetup) return NextResponse.json({ success: false, error: 'Quedada no encontrada.' }, { status: 404 })
    revalidatePath('/quedadas')
    revalidatePath(`/quedadas/${id}`)
    await logAdminAction({ action: 'update', entity: 'meetup', entityId: id, summary: `Quedada de ${meetup.hostName} (${meetup.dateISO})${parsed.data.status === 'cancelled' ? ' — cancelada' : ''}`, ip })
    return NextResponse.json({ success: true, meetup })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const ip = clientIp(request)
  const limit = rateLimit(`admin-mutate:${ip}`, 60, 60_000)
  if (!limit.ok) return tooManyRequests(limit.retryAfter)
  const { id } = await params
  const existing = await getMeetup(id)
  const removed = await adminDeleteMeetup(id)
  if (!removed) return NextResponse.json({ success: false, error: 'Quedada no encontrada.' }, { status: 404 })
  revalidatePath('/quedadas')
  if (existing) revalidatePath(`/quedadas/${id}`)
  await logAdminAction({ action: 'delete', entity: 'meetup', entityId: id, summary: existing ? `Quedada de ${existing.hostName} (${existing.dateISO})` : id, ip })
  return NextResponse.json({ success: true })
}
