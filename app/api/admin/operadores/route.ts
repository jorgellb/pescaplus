import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { setOperatorVerified, listOperators } from '@/lib/operators-store'

export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const operators = await listOperators()
  return NextResponse.json({ success: true, operators })
}

const schema = z.object({ id: z.string().min(1).max(120), verified: z.boolean() })

export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  try {
    const ok = await setOperatorVerified(parsed.data.id, parsed.data.verified)
    return ok ? NextResponse.json({ success: true }) : NextResponse.json({ success: false, error: 'Operador no encontrado.' }, { status: 404 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
