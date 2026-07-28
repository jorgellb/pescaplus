import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { adminUpdateCharter, adminDeleteCharter, getCharter } from '@/lib/charters-store'
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rate-limit'
import { logAdminAction } from '@/lib/admin-audit'

const patchSchema = z.object({
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationH: z.number().nullable().optional(),
  modality: z.enum(['tierra', 'kayak', 'barco']).optional(),
  targetSpecies: z.string().max(40).optional(),
  level: z.string().max(20).optional(),
  pricePerPerson: z.number().min(0).max(5000).optional(),
  maxPlaces: z.number().int().min(1).max(50).optional(),
  minToConfirm: z.number().int().min(1).max(50).optional(),
  includes: z.string().max(400).optional(),
  notes: z.string().max(4000).optional(),
  status: z.enum(['open', 'confirmed', 'cancelled']).optional(),
  tripType: z.enum(['privada', 'compartida']).optional(),
  meetingPoint: z.string().max(200).optional(),
  highlights: z.string().max(300).optional(),
  privatePrice: z.number().nullable().optional(),
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
    const charter = await adminUpdateCharter(id, parsed.data)
    if (!charter) return NextResponse.json({ success: false, error: 'Chárter no encontrado.' }, { status: 404 })
    revalidatePath('/charters')
    revalidatePath(`/charters/${id}`)
    await logAdminAction({ action: 'update', entity: 'charter', entityId: id, summary: `Chárter de ${charter.operator?.businessName || charter.operator?.name || ''} (${charter.dateISO})`, ip })
    return NextResponse.json({ success: true, charter })
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
  const existing = await getCharter(id)
  const removed = await adminDeleteCharter(id)
  if (!removed) return NextResponse.json({ success: false, error: 'Chárter no encontrado.' }, { status: 404 })
  revalidatePath('/charters')
  if (existing) revalidatePath(`/charters/${id}`)
  await logAdminAction({ action: 'delete', entity: 'charter', entityId: id, summary: existing ? `Chárter de ${existing.operator?.businessName || existing.operator?.name || ''} (${existing.dateISO})` : id, ip })
  return NextResponse.json({ success: true })
}
