import { NextRequest, NextResponse } from 'next/server'
import { consumeMagicLink, createSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth'
import { SITE_URL } from '@/lib/seo'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? ''
  const user = await consumeMagicLink(token)
  if (!user) {
    return NextResponse.redirect(new URL('/entrar?error=token', SITE_URL))
  }
  const sessionId = await createSession(user.id, request.headers.get('user-agent') ?? '')
  const dest = new URL('/cuenta?bienvenida=1', SITE_URL)
  const res = NextResponse.redirect(dest)
  res.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions)
  return res
}
