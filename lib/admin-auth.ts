import crypto from 'crypto'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

/**
 * Lightweight password gate for the admin backend. The password comes from the
 * `ADMIN_PASSWORD` env var; in development it falls back to a known default so
 * the panel is reachable out of the box (with a visible warning in the UI).
 *
 * The session cookie stores an HMAC of the password rather than the password
 * itself, so it can be verified server-side without persisting credentials.
 */

export const ADMIN_COOKIE = 'pescaplus_admin'
const DEFAULT_DEV_PASSWORD = 'pescaplus-admin'
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? 'pescaplus-admin-session'

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_DEV_PASSWORD
}

/** True when no ADMIN_PASSWORD is set and the insecure default is in use. */
export function isUsingDefaultPassword(): boolean {
  return !process.env.ADMIN_PASSWORD
}

export function verifyPassword(password: string): boolean {
  const expected = getAdminPassword()
  const a = Buffer.from(password)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function sessionToken(): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(getAdminPassword()).digest('hex')
}

/** Auth check for React Server Components / server actions. */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies()
  return store.get(ADMIN_COOKIE)?.value === sessionToken()
}

/** Auth check for route handlers (reads the cookie off the request). */
export function isRequestAuthenticated(request: NextRequest): boolean {
  return request.cookies.get(ADMIN_COOKIE)?.value === sessionToken()
}
