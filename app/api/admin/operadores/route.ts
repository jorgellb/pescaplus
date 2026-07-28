import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { setOperatorVerified, listOperators, registerOperator, validateOperator, adminUpdateOperator, adminListOperatorsPage } from '@/lib/operators-store'
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rate-limit'
import { logAdminAction } from '@/lib/admin-audit'

/**
 * Sin parámetros de paginación: devuelve el listado completo (compat con el
 * selector de operadores del admin de chárters, que necesita verlos todos).
 * Con q/limit/offset: pagina y busca (usado por la propia página de Operadores).
 */
export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const { searchParams } = request.nextUrl
  if (searchParams.has('q') || searchParams.has('limit') || searchParams.has('offset') || searchParams.has('verified')) {
    const q = searchParams.get('q') ?? undefined
    const offset = Number(searchParams.get('offset')) || 0
    const limit = Number(searchParams.get('limit')) || undefined
    const verifiedParam = searchParams.get('verified')
    const verified = verifiedParam === null ? undefined : verifiedParam === 'true'
    const { operators, total, hasMore } = await adminListOperatorsPage({ q, offset, limit, verified })
    return NextResponse.json({ success: true, operators, total, hasMore })
  }
  const operators = await listOperators()
  return NextResponse.json({ success: true, operators })
}

const verifySchema = z.object({ id: z.string().min(1).max(120), verified: z.boolean() })

/** Compat: alterna verificado/revocado (usado por el toggle rápido del listado). */
export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const ip = clientIp(request)
  const limit = rateLimit(`admin-mutate:${ip}`, 60, 60_000)
  if (!limit.ok) return tooManyRequests(limit.retryAfter)
  const body = await request.json().catch(() => null)
  const verifyParsed = verifySchema.safeParse(body)
  if (verifyParsed.success) {
    try {
      const ok = await setOperatorVerified(verifyParsed.data.id, verifyParsed.data.verified)
      if (!ok) return NextResponse.json({ success: false, error: 'Operador no encontrado.' }, { status: 404 })
      await logAdminAction({ action: verifyParsed.data.verified ? 'verify' : 'unverify', entity: 'operator', entityId: verifyParsed.data.id, ip })
      return NextResponse.json({ success: true })
    } catch (error) {
      return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
    }
  }
  return createOperator(body, ip)
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  businessName: z.string().max(120).optional(),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional(),
  spotSlug: z.string().min(1).max(80),
  boatName: z.string().max(80).optional(),
  boatType: z.string().max(80).optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  licenseRef: z.string().min(1).max(120),
  insuranceRef: z.string().min(1).max(120),
  bio: z.string().max(800).optional(),
  verified: z.boolean().optional(),
})

async function createOperator(body: unknown, ip: string) {
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  const err = validateOperator(parsed.data)
  if (err) return NextResponse.json({ success: false, error: err }, { status: 400 })
  try {
    const created = await registerOperator(parsed.data)
    const operator = parsed.data.verified ? await adminUpdateOperator(created.id, { verified: true }) : created
    await logAdminAction({ action: 'create', entity: 'operator', entityId: created.id, summary: parsed.data.businessName || parsed.data.name, ip })
    return NextResponse.json({ success: true, operator }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
