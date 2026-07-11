import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { getTaxonomy, saveTaxonomy } from '@/lib/taxonomy-store'

export const dynamic = 'force-dynamic'

/** Return the resolved taxonomy (defaults merged with overrides). Admin only. */
export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  return NextResponse.json({ success: true, taxonomy: await getTaxonomy() })
}

/** Save taxonomy overrides (category renames + subcategory CRUD). Admin only. */
export async function PUT(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, error: 'Datos inválidos' }, { status: 400 })
  }
  try {
    const taxonomy = await saveTaxonomy(body)
    // Categories, home and roundups all show category names / subcategory chips.
    revalidatePath('/', 'layout')
    return NextResponse.json({ success: true, taxonomy })
  } catch (error) {
    console.error('Error saving taxonomy:', error)
    return NextResponse.json({ success: false, error: 'No se pudo guardar' }, { status: 500 })
  }
}
