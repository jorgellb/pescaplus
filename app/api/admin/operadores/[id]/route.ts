import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { adminUpdateOperator, adminDeleteOperator, getOperator } from '@/lib/operators-store'
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rate-limit'
import { logAdminAction } from '@/lib/admin-audit'

const numOrEmpty = z.union([z.number(), z.literal('')]).nullable().optional()

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  businessName: z.string().max(120).optional(),
  email: z.string().email().max(160).optional(),
  phone: z.string().max(40).optional(),
  spotSlug: z.string().min(1).max(80).optional(),
  boatName: z.string().max(80).optional(),
  boatType: z.string().max(80).optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  licenseRef: z.string().max(120).optional(),
  insuranceRef: z.string().max(120).optional(),
  bio: z.string().max(800).optional(),
  marina: z.string().max(160).optional(),
  boatLength: numOrEmpty,
  boatBeam: numOrEmpty,
  boatEngineHp: numOrEmpty,
  boatMaxSpeedKn: numOrEmpty,
  boatYear: numOrEmpty,
  crewSize: z.number().int().min(1).max(20).optional(),
  verified: z.boolean().optional(),
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
    const operator = await adminUpdateOperator(id, parsed.data)
    if (!operator) return NextResponse.json({ success: false, error: 'Operador no encontrado.' }, { status: 404 })
    revalidatePath('/charters')
    await logAdminAction({ action: 'update', entity: 'operator', entityId: id, summary: operator.businessName || operator.name, ip })
    return NextResponse.json({ success: true, operator })
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
  const existing = await getOperator(id)
  if (!existing) return NextResponse.json({ success: false, error: 'Operador no encontrado.' }, { status: 404 })
  const removed = await adminDeleteOperator(id)
  if (!removed) return NextResponse.json({ success: false, error: 'No se pudo eliminar.' }, { status: 500 })
  revalidatePath('/charters')
  await logAdminAction({ action: 'delete', entity: 'operator', entityId: id, summary: existing.businessName || existing.name, ip })
  return NextResponse.json({ success: true })
}
