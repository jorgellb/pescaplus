import crypto from 'crypto'
import { secureToken } from '@/lib/tokens'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { isDatabaseConfigured } from '@/lib/products-store'
import { findOrCreateUserByEmail, getUserById, isValidEmail, type User } from '@/lib/users-store'
import { claimOperatorByEmail } from '@/lib/operators-store'
import { sendEmail, emailConfigured } from '@/lib/email'
import { SITE_URL } from '@/lib/seo'

/**
 * Passwordless authentication (magic link) + cookie sessions.
 *
 * Flow: user submits email → we create a single-use LoginToken and email a link
 * to /api/auth/verify?token=… → that route consumes the token, finds-or-creates
 * the User, opens a Session and sets an httpOnly cookie. Sessions live in the DB
 * so they can be revoked (logout). A memory fallback keeps local dev / tests
 * working without a database.
 */
export const SESSION_COOKIE = 'pp_session'
const SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1000 // 60 días
const TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutos

/** Igual que antes; ahora desde lib/tokens.ts, la fuente única del proyecto. */
function randomId(): string {
  return secureToken()
}

// ---- Memory fallback stores (dev / tests, no DB) --------------------------
interface MemToken { id: string; email: string; expiresAt: number; usedAt: number | null }
interface MemSession { id: string; userId: string; expiresAt: number }
const g = globalThis as unknown as { __pescaplusTokens?: MemToken[]; __pescaplusSessions?: MemSession[] }
function memTokens(): MemToken[] { return (g.__pescaplusTokens ??= []) }
function memSessions(): MemSession[] { return (g.__pescaplusSessions ??= []) }

// ---- Magic link -----------------------------------------------------------
export interface MagicLinkResult {
  ok: boolean
  /** True when email isn't configured, so nothing was actually delivered. */
  dryRun: boolean
  /** Only in non-production: the link, so you can log in without email set up. */
  devLink?: string
  error?: string
}

export async function requestMagicLink(rawEmail: string): Promise<MagicLinkResult> {
  const email = (rawEmail ?? '').trim().toLowerCase()
  if (!isValidEmail(email)) return { ok: false, dryRun: false, error: 'Email no válido.' }

  const token = randomId()
  const expiresAt = Date.now() + TOKEN_TTL_MS
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      await prisma.loginToken.create({ data: { id: token, email, expiresAt: new Date(expiresAt) } })
    } catch (error) {
      console.error('Login token create failed:', error)
      return { ok: false, dryRun: false, error: 'No se pudo iniciar el acceso. Inténtalo de nuevo.' }
    }
  } else {
    memTokens().push({ id: token, email, expiresAt, usedAt: null })
  }

  const link = `${SITE_URL}/api/auth/verify?token=${encodeURIComponent(token)}`
  const result = await sendEmail({ to: email, subject: 'Tu acceso a PescaPlus', html: magicLinkEmail(link) })
  const dryRun = !emailConfigured() || result.dryRun
  const devLink = process.env.NODE_ENV !== 'production' ? link : undefined
  if (dryRun && process.env.NODE_ENV !== 'production') console.log(`[auth] Magic link (dry-run) → ${link}`)
  return { ok: true, dryRun, devLink }
}

/** Consume a magic-link token → the user it belongs to (or null if bad/expired). */
export async function consumeMagicLink(token: string): Promise<User | null> {
  if (!token) return null
  let email: string | null = null
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const row = await prisma.loginToken.findUnique({ where: { id: token } })
      if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return null
      await prisma.loginToken.update({ where: { id: token }, data: { usedAt: new Date() } })
      email = row.email
    } catch (error) {
      console.error('Login token consume failed:', error)
      return null
    }
  } else {
    const t = memTokens().find((x) => x.id === token)
    if (!t || t.usedAt || t.expiresAt < Date.now()) return null
    t.usedAt = Date.now()
    email = t.email
  }
  if (!email) return null
  const user = await findOrCreateUserByEmail(email)
  // Vincula (por email demostrado) un perfil de patrón sin dueño, si lo hay.
  await claimOperatorByEmail(email, user.id)
  return user
}

// ---- Sessions -------------------------------------------------------------
export async function createSession(userId: string, userAgent = ''): Promise<string> {
  const id = randomId()
  const expiresAt = Date.now() + SESSION_TTL_MS
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    await prisma.session.create({ data: { id, userId, userAgent: userAgent.slice(0, 200), expiresAt: new Date(expiresAt) } })
  } else {
    memSessions().push({ id, userId, expiresAt })
  }
  return id
}

async function userForSession(sessionId: string): Promise<User | null> {
  if (!sessionId) return null
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const s = await prisma.session.findUnique({ where: { id: sessionId } })
      if (!s || s.expiresAt.getTime() < Date.now()) return null
      return getUserById(s.userId)
    } catch (error) {
      console.warn('Session read failed:', error)
      return null
    }
  }
  const s = memSessions().find((x) => x.id === sessionId)
  if (!s || s.expiresAt < Date.now()) return null
  return getUserById(s.userId)
}

export async function destroySession(sessionId: string): Promise<void> {
  if (!sessionId) return
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.session.deleteMany({ where: { id: sessionId } })
    } catch (error) { console.warn('Session destroy failed:', error) }
  } else {
    g.__pescaplusSessions = memSessions().filter((x) => x.id !== sessionId)
  }
}

// ---- Cookie helpers (server components + route handlers) -------------------
export const sessionCookieOptions = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: Math.floor(SESSION_TTL_MS / 1000),
}

/** Current logged-in user (deduped per request). Null if not signed in. */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const store = await cookies()
  const sid = store.get(SESSION_COOKIE)?.value
  if (!sid) return null
  return userForSession(sid)
})

/** For route handlers: resolve the user from the request cookie. */
export async function getUserFromRequest(request: Request): Promise<User | null> {
  const cookie = request.headers.get('cookie') ?? ''
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`))
  const sid = match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : ''
  return userForSession(sid)
}

function magicLinkEmail(link: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
    <h1 style="font-size:22px;margin:0 0 8px">🎣 Entrar en PescaPlus</h1>
    <p style="color:#444;line-height:1.5">Pulsa el botón para acceder a tu cuenta. El enlace caduca en 15 minutos y solo funciona una vez.</p>
    <p style="margin:24px 0">
      <a href="${link}" style="background:#0f766e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;display:inline-block">Entrar en PescaPlus</a>
    </p>
    <p style="color:#888;font-size:13px;line-height:1.5">Si el botón no funciona, copia y pega esta dirección:<br><span style="color:#0f766e;word-break:break-all">${link}</span></p>
    <p style="color:#aaa;font-size:12px;margin-top:24px">Si no has solicitado este acceso, puedes ignorar este correo.</p>
  </div>`
}
