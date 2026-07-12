import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ADMIN_COOKIE, sessionToken, verifyPassword } from '@/lib/admin-auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const loginSchema = z.object({ password: z.string().min(1).max(200) })

export async function POST(request: NextRequest) {
  // Brute-force protection: 8 attempts per 10 minutes per IP.
  const limit = rateLimit(`login:${clientIp(request)}`, 8, 10 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: 'Demasiados intentos. Espera unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Contraseña requerida' }, { status: 400 })
  }

  if (!verifyPassword(parsed.data.password)) {
    return NextResponse.json({ success: false, error: 'Contraseña incorrecta' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return response
}
