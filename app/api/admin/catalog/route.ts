import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { listProducts, resetToCatalog } from '@/lib/products-store'

const schema = z.object({ action: z.enum(['reset', 'export']) })

/** Catalog-level maintenance actions (admin only). */
export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Acción inválida' }, { status: 400 })
  }

  if (parsed.data.action === 'export') {
    const products = await listProducts()
    return NextResponse.json({ success: true, products })
  }

  const count = await resetToCatalog()
  revalidatePath('/', 'layout')
  return NextResponse.json({ success: true, count })
}
