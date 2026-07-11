import { NextRequest, NextResponse } from 'next/server'
import { refreshCatalogPrices } from '@/lib/refresh'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Scheduled price/link refresh (Vercel Cron). Protected by CRON_SECRET: Vercel
 * sends it as `Authorization: Bearer <CRON_SECRET>`. If CRON_SECRET is unset the
 * endpoint is open (development only) — set it in production.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    const key = new URL(request.url).searchParams.get('key')
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }
  }

  const result = await refreshCatalogPrices()
  return NextResponse.json({ success: true, ...result })
}
