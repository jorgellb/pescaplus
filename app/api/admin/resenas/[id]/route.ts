import { NextRequest, NextResponse } from 'next/server'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { adminDeleteReview } from '@/lib/reviews-store'
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rate-limit'
import { logAdminAction } from '@/lib/admin-audit'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const ip = clientIp(request)
  const limit = rateLimit(`admin-mutate:${ip}`, 60, 60_000)
  if (!limit.ok) return tooManyRequests(limit.retryAfter)
  const { id } = await params
  const removed = await adminDeleteReview(id)
  if (!removed) return NextResponse.json({ success: false, error: 'Reseña no encontrada.' }, { status: 404 })
  await logAdminAction({ action: 'delete', entity: 'review', entityId: id, ip })
  return NextResponse.json({ success: true })
}
