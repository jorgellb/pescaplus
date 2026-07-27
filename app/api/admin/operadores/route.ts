import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { setOperatorVerified, listOperators, registerOperator, validateOperator, adminUpdateOperator } from '@/lib/operators-store'

export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const operators = await listOperators()
  return NextResponse.json({ success: true, operators })
}

const verifySchema = z.object({ id: z.string().min(1).max(120), verified: z.boolean() })

/** Compat: alterna verificado/revocado (usado por el toggle rápido del listado). */
export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const verifyParsed = verifySchema.safeParse(body)
  if (verifyParsed.success) {
    try {
      const ok = await setOperatorVerified(verifyParsed.data.id, verifyParsed.data.verified)
      return ok ? NextResponse.json({ success: true }) : NextResponse.json({ success: false, error: 'Operador no encontrado.' }, { status: 404 })
    } catch (error) {
      return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
    }
  }
  return createOperator(body)
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

async function createOperator(body: unknown) {
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  const err = validateOperator(parsed.data)
  if (err) return NextResponse.json({ success: false, error: err }, { status: 400 })
  try {
    const created = await registerOperator(parsed.data)
    const operator = parsed.data.verified ? await adminUpdateOperator(created.id, { verified: true }) : created
    return NextResponse.json({ success: true, operator }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
