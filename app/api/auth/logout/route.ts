import { NextRequest, NextResponse } from 'next/server'
import { destroySession, getUserFromRequest, SESSION_COOKIE } from '@/lib/auth'
import { SITE_URL } from '@/lib/seo'

async function sessionIdFrom(request: NextRequest): Promise<string> {
  return request.cookies.get(SESSION_COOKIE)?.value ?? ''
}

export async function POST(request: NextRequest) {
  await getUserFromRequest(request) // no-op, keeps parity
  await destroySession(await sessionIdFrom(request))
  const res = NextResponse.json({ success: true })
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}

export async function GET(request: NextRequest) {
  await destroySession(await sessionIdFrom(request))
  const res = NextResponse.redirect(new URL('/', SITE_URL))
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
