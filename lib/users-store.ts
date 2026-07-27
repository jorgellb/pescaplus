import { isDatabaseConfigured } from '@/lib/products-store'

/**
 * User accounts — the unified identity for the marketplace. A single account can
 * be a pescador (books charters / joins quedadas) and, once verified, a patrón
 * (an Operator linked by userId). Login is passwordless (magic link); this store
 * owns the User row. DB-backed with a memory fallback for local dev / tests;
 * writes never silently fall back to memory when a DB is configured.
 */
export interface User {
  id: string
  email: string
  name: string
  phone: string
  phoneVerified: boolean
  bio: string
  avatar: string
  emailVerified: boolean
  /** Reputation as a pescador, from patrón reviews. */
  avgRating: number
  reviewCount: number
  createdAt: number
  updatedAt: number
}

const WRITE_FAIL = 'No se ha podido guardar tu cuenta ahora mismo. Inténtalo de nuevo en unos minutos.'
const AVATARS = ['🎣', '🐟', '🐠', '🦑', '🦈', '🐙', '⚓', '🛥️', '🌊', '🦞', '🐡', '🦀']

interface StoredUser extends User {}
const g = globalThis as unknown as { __pescaplusUsers?: StoredUser[] }
function mem(): StoredUser[] {
  if (!g.__pescaplusUsers) g.__pescaplusUsers = []
  return g.__pescaplusUsers
}

function rowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? '',
    phone: row.phone ?? '',
    phoneVerified: row.phoneVerified ?? false,
    bio: row.bio ?? '',
    avatar: row.avatar ?? '',
    emailVerified: row.emailVerified ?? false,
    avgRating: row.avgRating ?? 0,
    reviewCount: row.reviewCount ?? 0,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.getTime() : row.updatedAt,
  }
}

function normEmail(email: string): string {
  return (email ?? '').trim().toLowerCase().slice(0, 160)
}

export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((email ?? '').trim())
}

/** Find a user by email, or create one (used on first magic-link login). */
export async function findOrCreateUserByEmail(rawEmail: string): Promise<User> {
  const email = normEmail(rawEmail)
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)]
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const row = await prisma.user.upsert({
        where: { email },
        update: { emailVerified: true },
        create: { email, emailVerified: true, avatar },
      })
      return rowToUser(row)
    } catch (error) {
      console.error('User upsert failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const existing = mem().find((u) => u.email === email)
  if (existing) { existing.emailVerified = true; return { ...existing } }
  const now = Date.now()
  const user: StoredUser = { id: `usr-${now}-${Math.random().toString(36).slice(2, 8)}`, email, name: '', phone: '', phoneVerified: false, bio: '', avatar, emailVerified: true, avgRating: 0, reviewCount: 0, createdAt: now, updatedAt: now }
  mem().unshift(user)
  return { ...user }
}

export async function getUserById(id: string): Promise<User | null> {
  if (!id) return null
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.user.findUnique({ where: { id } })
      return row ? rowToUser(row) : null
    } catch (error) {
      console.warn('User read failed:', error)
    }
  }
  return mem().find((u) => u.id === id) ?? null
}

export interface ProfileInput {
  name?: string
  phone?: string
  bio?: string
  avatar?: string
}

export async function updateUserProfile(id: string, input: ProfileInput): Promise<User | null> {
  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = String(input.name).trim().slice(0, 80)
  if (input.phone !== undefined) data.phone = String(input.phone).trim().slice(0, 40)
  if (input.bio !== undefined) data.bio = String(input.bio).trim().slice(0, 600)
  if (input.avatar !== undefined && AVATARS.includes(input.avatar)) data.avatar = input.avatar
  if (Object.keys(data).length === 0) return getUserById(id)

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const row = await prisma.user.update({ where: { id }, data })
      return rowToUser(row)
    } catch (error) {
      console.error('User profile update failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const u = mem().find((x) => x.id === id)
  if (!u) return null
  Object.assign(u, data, { updatedAt: Date.now() })
  return { ...u }
}

// ---------------------------------------------------------------------------
// Admin (gestión de cuentas — moderación/soporte)
// ---------------------------------------------------------------------------

export interface AdminUserCreateInput {
  email: string
  name?: string
  phone?: string
  bio?: string
  avatar?: string
}

/**
 * Panel admin: alta manual de una cuenta (soporte — un pescador pide ayuda por
 * teléfono/email y no puede o no quiere entrar por el enlace mágico). Se marca
 * `emailVerified` porque el alta la hace un administrador, no un email sin dueño.
 */
export async function adminCreateUser(input: AdminUserCreateInput): Promise<User> {
  const email = normEmail(input.email)
  if (!isValidEmail(email)) throw new Error('Email no válido.')
  const name = (input.name ?? '').trim().slice(0, 80)
  const phone = (input.phone ?? '').trim().slice(0, 40)
  const bio = (input.bio ?? '').trim().slice(0, 600)
  const avatar = input.avatar && AVATARS.includes(input.avatar) ? input.avatar : AVATARS[Math.floor(Math.random() * AVATARS.length)]

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) throw new Error('Ya existe una cuenta con ese email.')
      const row = await prisma.user.create({ data: { email, name, phone, bio, avatar, emailVerified: true } })
      return rowToUser(row)
    } catch (error) {
      if ((error as Error).message === 'Ya existe una cuenta con ese email.') throw error
      console.error('Admin user create failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  if (mem().some((u) => u.email === email)) throw new Error('Ya existe una cuenta con ese email.')
  const now = Date.now()
  const user: StoredUser = { id: `usr-${now}-${Math.random().toString(36).slice(2, 8)}`, email, name, phone, phoneVerified: false, bio, avatar, emailVerified: true, avgRating: 0, reviewCount: 0, createdAt: now, updatedAt: now }
  mem().unshift(user)
  return { ...user }
}

/** Panel admin: todos los usuarios registrados. */
export async function adminListUsers(limit = 500): Promise<User[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
      return rows.map(rowToUser)
    } catch (error) {
      console.warn('Admin users read failed:', error)
      return []
    }
  }
  return mem().slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
}

/**
 * Panel admin: borra la cuenta. Por las FK de Prisma esto arrastra en cascada
 * sus sesiones, reseñas escritas, notas, check-ins, waypoints y rutas; y
 * desvincula (sin borrar) sus reservas, RSVPs y su perfil de operador si tenía.
 */
export async function adminDeleteUser(id: string): Promise<boolean> {
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      await prisma.user.delete({ where: { id } })
      return true
    } catch (error) {
      console.error('Admin user delete failed:', error)
      return false
    }
  }
  const idx = mem().findIndex((u) => u.id === id)
  if (idx === -1) return false
  mem().splice(idx, 1)
  return true
}

export const AVATAR_CHOICES = AVATARS
