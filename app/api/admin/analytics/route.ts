import { NextRequest, NextResponse } from 'next/server'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { getClickStats } from '@/lib/clicks-store'

/** Affiliate click analytics (admin only). */
export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  const stats = await getClickStats()
  return NextResponse.json({ success: true, stats })
}
