import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { adminListUsers, adminCreateUser } from '@/lib/users-store'
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rate-limit'
import { logAdminAction } from '@/lib/admin-audit'

export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const users = await adminListUsers()
  return NextResponse.json({ success: true, users })
}

const createSchema = z.object({
  email: z.string().email().max(160),
  name: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  bio: z.string().max(600).optional(),
})

export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const ip = clientIp(request)
  const limit = rateLimit(`admin-mutate:${ip}`, 60, 60_000)
  if (!limit.ok) return tooManyRequests(limit.retryAfter)
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  try {
    const user = await adminCreateUser(parsed.data)
    await logAdminAction({ action: 'create', entity: 'user', entityId: user.id, summary: user.name || user.email, ip })
    return NextResponse.json({ success: true, user }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
