import { NextRequest, NextResponse } from 'next/server'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { refreshCatalogPrices } from '@/lib/refresh'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Manual price/link refresh triggered from the admin panel. */
export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  const result = await refreshCatalogPrices()
  return NextResponse.json({ success: true, ...result })
}
