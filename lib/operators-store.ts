import { isDatabaseConfigured } from '@/lib/products-store'
import { sanitizeIds, NAVIGATION, SAFETY, BOAT_AMENITIES, FISHING_GEAR } from '@/lib/charter-options'
import { sanitizePhotos } from '@/lib/photos'

/**
 * Charter operators — the paid side of the marketplace (Fase 1). An operator is
 * a professional skipper who submits their business, licence and insurance for
 * VERIFICATION. Only verified operators appear publicly and can list paid
 * charters; the platform never lets a random boat owner charge strangers.
 * No accounts: the operator keeps a secret `manageToken` (same pattern as
 * meetups). Storage is DB-backed with a memory fallback; writes never silently
 * fall back to memory when a DB is configured.
 */
export interface OperatorInput {
  name: string
  businessName?: string
  email: string
  phone?: string
  spotSlug: string
  boatName?: string
  boatType?: string
  capacity?: number
  licenseRef?: string
  insuranceRef?: string
  bio?: string
}

export interface Operator {
  id: string
  name: string
  businessName: string
  email: string
  phone: string
  spotSlug: string
  boatName: string
  boatType: string
  capacity: number
  /** Base berth shown on every listing ("Marina Deportiva del Puerto de…"). */
  marina: string
  boatLength: number | null
  boatBeam: number | null
  boatEngineHp: number | null
  boatMaxSpeedKn: number | null
  boatYear: number | null
  crewSize: number
  /** Boat/trip photos (Vercel Blob URLs, or pasted https links). */
  photos: string[]
  /** Catalogue ids — see lib/charter-options. */
  navigation: string[]
  safety: string[]
  amenities: string[]
  gear: string[]
  licenseRef: string
  insuranceRef: string
  bio: string
  verified: boolean
  verifiedAt: number | null
  /** Stripe Connect (Express) account id, '' until the operator connects. */
  stripeAccountId: string
  /** True when Stripe onboarding is complete and payouts/charges are enabled. */
  stripeReady: boolean
  /** Average review score (denormalized) + how many reviews. */
  avgRating: number
  reviewCount: number
  /** Owning user account (if the operator registered while logged in). */
  userId: string | null
  createdAt: number
}

export interface OperatorWithToken extends Operator {
  manageToken: string
}

const WRITE_FAIL = 'La base de datos no está disponible ahora mismo; el cambio no se ha guardado. Inténtalo de nuevo en unos minutos.'

function token(): string {
  return `op_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
}

function clean(input: OperatorInput) {
  return {
    name: (input.name ?? '').trim().slice(0, 80),
    businessName: (input.businessName ?? '').trim().slice(0, 120),
    email: (input.email ?? '').trim().toLowerCase().slice(0, 160),
    phone: (input.phone ?? '').trim().slice(0, 40),
    spotSlug: (input.spotSlug ?? '').trim().slice(0, 80),
    boatName: (input.boatName ?? '').trim().slice(0, 80),
    boatType: (input.boatType ?? '').trim().slice(0, 80),
    capacity: Math.min(50, Math.max(1, Math.round(Number(input.capacity) || 6))),
    licenseRef: (input.licenseRef ?? '').trim().slice(0, 120),
    insuranceRef: (input.insuranceRef ?? '').trim().slice(0, 120),
    bio: (input.bio ?? '').trim().slice(0, 800),
  }
}

export function validateOperator(input: OperatorInput): string | null {
  if (!input.name?.trim()) return 'Falta tu nombre.'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email ?? '')) return 'Email no válido.'
  if (!input.spotSlug?.trim()) return 'Falta el puerto base.'
  if (!input.licenseRef?.trim()) return 'Indica tu titulación/licencia (la verificaremos).'
  if (!input.insuranceRef?.trim()) return 'Indica tu seguro de ocupantes/RC.'
  return null
}

interface StoredOperator extends Operator {
  manageToken: string
}
const g = globalThis as unknown as { __pescaplusOperators?: StoredOperator[] }
function mem(): StoredOperator[] {
  if (!g.__pescaplusOperators) g.__pescaplusOperators = []
  return g.__pescaplusOperators
}

function rowToOperator(row: any): Operator {
  return {
    id: row.id,
    name: row.name,
    businessName: row.businessName ?? '',
    email: row.email,
    phone: row.phone ?? '',
    spotSlug: row.spotSlug,
    boatName: row.boatName ?? '',
    boatType: row.boatType ?? '',
    capacity: row.capacity,
    marina: row.marina ?? '',
    boatLength: row.boatLength ?? null,
    boatBeam: row.boatBeam ?? null,
    boatEngineHp: row.boatEngineHp ?? null,
    boatMaxSpeedKn: row.boatMaxSpeedKn ?? null,
    boatYear: row.boatYear ?? null,
    crewSize: row.crewSize ?? 1,
    photos: row.photos ?? [],
    navigation: row.navigation ?? [],
    safety: row.safety ?? [],
    amenities: row.amenities ?? [],
    gear: row.gear ?? [],
    licenseRef: row.licenseRef ?? '',
    insuranceRef: row.insuranceRef ?? '',
    bio: row.bio ?? '',
    verified: row.verified,
    verifiedAt: row.verifiedAt instanceof Date ? row.verifiedAt.getTime() : row.verifiedAt ?? null,
    stripeAccountId: row.stripeAccountId ?? '',
    stripeReady: row.stripeReady ?? false,
    avgRating: row.avgRating ?? 0,
    reviewCount: row.reviewCount ?? 0,
    userId: row.userId ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt,
  }
}

export async function registerOperator(input: OperatorInput, userId?: string | null): Promise<OperatorWithToken> {
  const data = clean(input)
  const manageToken = token()
  const owner = userId || null
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const row = await prisma.operator.create({ data: { ...data, manageToken, userId: owner } })
      return { ...rowToOperator(row), manageToken }
    } catch (error) {
      console.error('Operator write failed — not falling back to memory:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const stored: StoredOperator = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...data,
    marina: '', boatLength: null, boatBeam: null, boatEngineHp: null, boatMaxSpeedKn: null, boatYear: null,
    crewSize: 1, photos: [], navigation: [], safety: [], amenities: [], gear: [],
    verified: false, verifiedAt: null, stripeAccountId: '', stripeReady: false,
    avgRating: 0, reviewCount: 0, userId: owner, createdAt: Date.now(), manageToken,
  }
  mem().unshift(stored)
  return { ...stored }
}

export interface OperatorProfileInput {
  name?: string
  businessName?: string
  phone?: string
  boatName?: string
  boatType?: string
  capacity?: number
  bio?: string
  marina?: string
  /** Numéricos opcionales: el formulario los envía vacíos ('') al borrarlos. */
  boatLength?: number | string | null
  boatBeam?: number | string | null
  boatEngineHp?: number | string | null
  boatMaxSpeedKn?: number | string | null
  boatYear?: number | string | null
  crewSize?: number
  photos?: string[]
  navigation?: string[]
  safety?: string[]
  amenities?: string[]
  gear?: string[]
}

/** Clamp an optional numeric spec, or null it out when cleared. */
function spec(v: unknown, min: number, max: number, decimals = 0): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  const clamped = Math.min(max, Math.max(min, n))
  return decimals ? Math.round(clamped * 10 ** decimals) / 10 ** decimals : Math.round(clamped)
}

/** Owner edits their public patrón profile (not licence/insurance/verification). */
export async function updateOperatorProfile(operatorId: string, manageToken: string, input: OperatorProfileInput): Promise<Operator | null> {
  const op = await getOperatorByToken(operatorId, manageToken)
  if (!op) return null
  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = String(input.name).trim().slice(0, 80)
  if (input.businessName !== undefined) data.businessName = String(input.businessName).trim().slice(0, 120)
  if (input.phone !== undefined) data.phone = String(input.phone).trim().slice(0, 40)
  if (input.boatName !== undefined) data.boatName = String(input.boatName).trim().slice(0, 80)
  if (input.boatType !== undefined) data.boatType = String(input.boatType).trim().slice(0, 80)
  if (input.capacity !== undefined) data.capacity = Math.min(50, Math.max(1, Math.round(Number(input.capacity) || op.capacity)))
  if (input.bio !== undefined) data.bio = String(input.bio).trim().slice(0, 800)
  if (input.marina !== undefined) data.marina = String(input.marina).trim().slice(0, 160)
  if (input.boatLength !== undefined) data.boatLength = spec(input.boatLength, 2, 60, 2)
  if (input.boatBeam !== undefined) data.boatBeam = spec(input.boatBeam, 1, 20, 2)
  if (input.boatEngineHp !== undefined) data.boatEngineHp = spec(input.boatEngineHp, 1, 5000)
  if (input.boatMaxSpeedKn !== undefined) data.boatMaxSpeedKn = spec(input.boatMaxSpeedKn, 1, 80)
  if (input.boatYear !== undefined) data.boatYear = spec(input.boatYear, 1900, new Date().getFullYear() + 1)
  if (input.crewSize !== undefined) data.crewSize = Math.min(20, Math.max(1, Math.round(Number(input.crewSize) || 1)))
  if (input.photos !== undefined) data.photos = sanitizePhotos(input.photos)
  if (input.navigation !== undefined) data.navigation = sanitizeIds(NAVIGATION, input.navigation)
  if (input.safety !== undefined) data.safety = sanitizeIds(SAFETY, input.safety)
  if (input.amenities !== undefined) data.amenities = sanitizeIds(BOAT_AMENITIES, input.amenities)
  if (input.gear !== undefined) data.gear = sanitizeIds(FISHING_GEAR, input.gear)
  if (Object.keys(data).length === 0) return op

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const row = await prisma.operator.update({ where: { id: operatorId }, data })
      return rowToOperator(row)
    } catch (error) {
      console.error('Operator profile update failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const stored = mem().find((o) => o.id === operatorId)
  if (!stored) return null
  Object.assign(stored, data)
  return { ...stored }
}

/** The operator profile owned by a user account (if they registered as patrón). */
export async function getOperatorByUser(userId: string): Promise<Operator | null> {
  if (!userId) return null
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.operator.findUnique({ where: { userId } })
      return row ? rowToOperator(row) : null
    } catch (error) {
      console.warn('Operator by user read failed:', error)
    }
  }
  return mem().find((o) => o.userId === userId) ?? null
}

/**
 * On login, claim an unowned operator whose email matches the account. The
 * magic link proves control of that email — the same email used to register
 * the patrón — so it's safe to link them (enables messaging, the /cuenta panel).
 */
export async function claimOperatorByEmail(email: string, userId: string): Promise<void> {
  const norm = (email ?? '').trim().toLowerCase()
  if (!norm || !userId) return
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      // No pisar cuentas ya vinculadas ni robar operadores de otro usuario.
      await prisma.operator.updateMany({ where: { email: norm, userId: null }, data: { userId } })
    } catch (error) { console.warn('Operator claim-by-email failed:', error) }
    return
  }
  const o = mem().find((x) => x.email === norm && !x.userId)
  if (o) o.userId = userId
}

/** Owner-scoped: the operator + its manageToken for the account that owns it. */
export async function getOwnedOperator(userId: string): Promise<OperatorWithToken | null> {
  if (!userId) return null
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.operator.findUnique({ where: { userId } })
      return row ? { ...rowToOperator(row), manageToken: row.manageToken } : null
    } catch (error) {
      console.warn('Owned operator read failed:', error)
    }
  }
  const o = mem().find((x) => x.userId === userId)
  return o ? { ...o } : null
}

/** Link an existing (token-managed) operator to a user account. */
export async function linkOperatorToUser(operatorId: string, manageToken: string, userId: string): Promise<Operator | null> {
  const op = await getOperatorByToken(operatorId, manageToken)
  if (!op) return null
  if (op.userId && op.userId !== userId) return null // ya vinculado a otra cuenta
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.operator.update({ where: { id: operatorId }, data: { userId } })
      return rowToOperator(row)
    } catch (error) {
      console.error('Operator link failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const stored = mem().find((o) => o.id === operatorId)
  if (stored) stored.userId = userId
  return stored ? { ...stored } : null
}

/** Save the operator's Stripe Connect account id (when first created). */
export async function setOperatorStripeAccount(id: string, stripeAccountId: string): Promise<void> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.operator.update({ where: { id }, data: { stripeAccountId } })
      return
    } catch (error) {
      console.error('Operator stripe account save failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const o = mem().find((x) => x.id === id)
  if (o) o.stripeAccountId = stripeAccountId
}

/** Update whether the operator can receive charges/payouts (from Stripe). */
export async function setOperatorStripeReady(id: string, ready: boolean): Promise<void> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.operator.update({ where: { id }, data: { stripeReady: ready } })
      return
    } catch (error) {
      console.error('Operator stripe ready save failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const o = mem().find((x) => x.id === id)
  if (o) o.stripeReady = ready
}

/** Find an operator by their Stripe account id (for webhooks). */
export async function getOperatorByStripeAccount(stripeAccountId: string): Promise<Operator | null> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.operator.findFirst({ where: { stripeAccountId } })
      return row ? rowToOperator(row) : null
    } catch (error) {
      console.warn('Operator by stripe account read failed:', error)
    }
  }
  return mem().find((o) => o.stripeAccountId === stripeAccountId) ?? null
}

export async function getOperator(id: string): Promise<Operator | null> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.operator.findUnique({ where: { id } })
      return row ? rowToOperator(row) : null
    } catch (error) {
      console.warn('Operator read failed, using memory:', error)
    }
  }
  return mem().find((o) => o.id === id) ?? null
}

export async function getOperatorByToken(id: string, manageToken: string): Promise<Operator | null> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.operator.findUnique({ where: { id } })
      return row && row.manageToken === manageToken ? rowToOperator(row) : null
    } catch (error) {
      console.warn('Operator token read failed, using memory:', error)
    }
  }
  const o = mem().find((x) => x.id === id)
  return o && o.manageToken === manageToken ? o : null
}

/** Admin action: mark an operator verified (or revoke). */
export async function setOperatorVerified(id: string, verified: boolean): Promise<boolean> {
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      await prisma.operator.update({ where: { id }, data: { verified, verifiedAt: verified ? new Date() : null } })
      return true
    } catch (error) {
      console.error('Operator verify failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const o = mem().find((x) => x.id === id)
  if (!o) return false
  o.verified = verified
  o.verifiedAt = verified ? Date.now() : null
  return true
}

// ---------------------------------------------------------------------------
// Admin (bypasses el manageToken — actúa con autoridad de panel)
// ---------------------------------------------------------------------------

export interface AdminOperatorUpdate {
  name?: string
  businessName?: string
  email?: string
  phone?: string
  spotSlug?: string
  boatName?: string
  boatType?: string
  capacity?: number
  licenseRef?: string
  insuranceRef?: string
  bio?: string
  marina?: string
  boatLength?: number | string | null
  boatBeam?: number | string | null
  boatEngineHp?: number | string | null
  boatMaxSpeedKn?: number | string | null
  boatYear?: number | string | null
  crewSize?: number
  verified?: boolean
}

/** Panel admin: edita cualquier campo del perfil (incluidos licencia/seguro/verificación), sin token. */
export async function adminUpdateOperator(id: string, input: AdminOperatorUpdate): Promise<Operator | null> {
  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = String(input.name).trim().slice(0, 80)
  if (input.businessName !== undefined) data.businessName = String(input.businessName).trim().slice(0, 120)
  if (input.email !== undefined) data.email = String(input.email).trim().toLowerCase().slice(0, 160)
  if (input.phone !== undefined) data.phone = String(input.phone).trim().slice(0, 40)
  if (input.spotSlug !== undefined) data.spotSlug = String(input.spotSlug).trim().slice(0, 80)
  if (input.boatName !== undefined) data.boatName = String(input.boatName).trim().slice(0, 80)
  if (input.boatType !== undefined) data.boatType = String(input.boatType).trim().slice(0, 80)
  if (input.capacity !== undefined) data.capacity = Math.min(50, Math.max(1, Math.round(Number(input.capacity) || 1)))
  if (input.licenseRef !== undefined) data.licenseRef = String(input.licenseRef).trim().slice(0, 120)
  if (input.insuranceRef !== undefined) data.insuranceRef = String(input.insuranceRef).trim().slice(0, 120)
  if (input.bio !== undefined) data.bio = String(input.bio).trim().slice(0, 800)
  if (input.marina !== undefined) data.marina = String(input.marina).trim().slice(0, 160)
  if (input.boatLength !== undefined) data.boatLength = spec(input.boatLength, 2, 60, 2)
  if (input.boatBeam !== undefined) data.boatBeam = spec(input.boatBeam, 1, 20, 2)
  if (input.boatEngineHp !== undefined) data.boatEngineHp = spec(input.boatEngineHp, 1, 5000)
  if (input.boatMaxSpeedKn !== undefined) data.boatMaxSpeedKn = spec(input.boatMaxSpeedKn, 1, 80)
  if (input.boatYear !== undefined) data.boatYear = spec(input.boatYear, 1900, new Date().getFullYear() + 1)
  if (input.crewSize !== undefined) data.crewSize = Math.min(20, Math.max(1, Math.round(Number(input.crewSize) || 1)))

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const dbData = { ...data, ...(input.verified !== undefined ? { verified: input.verified, verifiedAt: input.verified ? new Date() : null } : {}) }
      if (Object.keys(dbData).length === 0) return getOperator(id)
      const row = await prisma.operator.update({ where: { id }, data: dbData })
      return rowToOperator(row)
    } catch (error) {
      console.error('Admin operator update failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const stored = mem().find((o) => o.id === id)
  if (!stored) return null
  Object.assign(stored, data)
  if (input.verified !== undefined) { stored.verified = input.verified; stored.verifiedAt = input.verified ? Date.now() : null }
  return { ...stored }
}

/** Panel admin: borra el operador. Sus chárters se borran en cascada (FK de Prisma). */
export async function adminDeleteOperator(id: string): Promise<boolean> {
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      await prisma.operator.delete({ where: { id } })
      return true
    } catch (error) {
      console.error('Admin operator delete failed:', error)
      return false
    }
  }
  const idx = mem().findIndex((o) => o.id === id)
  if (idx === -1) return false
  mem().splice(idx, 1)
  return true
}

export async function listOperators(opts: { verified?: boolean } = {}): Promise<Operator[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.operator.findMany({
        where: opts.verified === undefined ? {} : { verified: opts.verified },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
      return rows.map(rowToOperator)
    } catch (error) {
      console.warn('Operators read failed, using memory:', error)
    }
  }
  return mem().filter((o) => opts.verified === undefined || o.verified === opts.verified)
}

export interface AdminOperatorListOpts {
  /** Busca por nombre, empresa, email o zona. */
  q?: string
  verified?: boolean
  limit?: number
  offset?: number
}

export interface AdminOperatorPage {
  operators: Operator[]
  total: number
  hasMore: boolean
}

/** Panel admin: operadores con búsqueda y paginación por offset (para listas grandes). */
export async function adminListOperatorsPage(opts: AdminOperatorListOpts = {}): Promise<AdminOperatorPage> {
  const limit = Math.min(200, Math.max(1, opts.limit ?? 50))
  const offset = Math.max(0, opts.offset ?? 0)
  const q = (opts.q ?? '').trim().slice(0, 100)

  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const textFilter = q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { businessName: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
              { spotSlug: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}
      const where = opts.verified === undefined ? textFilter : { ...textFilter, verified: opts.verified }
      const [rows, total] = await Promise.all([
        prisma.operator.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
        prisma.operator.count({ where }),
      ])
      const operators = rows.map(rowToOperator)
      return { operators, total, hasMore: offset + operators.length < total }
    } catch (error) {
      console.warn('Admin operators page read failed:', error)
      return { operators: [], total: 0, hasMore: false }
    }
  }
  let all = mem().slice()
  if (q) {
    const needle = q.toLowerCase()
    all = all.filter((o) => o.name.toLowerCase().includes(needle) || o.businessName.toLowerCase().includes(needle) || o.email.toLowerCase().includes(needle) || o.spotSlug.toLowerCase().includes(needle))
  }
  if (opts.verified !== undefined) all = all.filter((o) => o.verified === opts.verified)
  const total = all.length
  const operators = all.slice(offset, offset + limit)
  return { operators, total, hasMore: offset + operators.length < total }
}
