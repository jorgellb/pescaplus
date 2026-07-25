import { NextRequest, NextResponse } from 'next/server'
import { GET as verificacion } from '@/app/api/cron/verificacion/route'
import { GET as alertas } from '@/app/api/cron/alertas/route'
import { publishDueReviews } from '@/lib/reviews-store'

export const maxDuration = 300

/**
 * Combined daily cron — Vercel Hobby allows only 2 cron jobs per project, so
 * this single entry runs the daily tasks in sequence:
 *   1) /api/cron/verificacion — store tomorrow-noon predictions + resolve
 *      yesterday's against the official AEMET station measurement.
 *   2) /api/cron/alertas — email subscribers whose threshold is met.
 *   3) publishDueReviews — reveal double-blind reviews the other party never
 *      answered, so the denormalized averages catch up.
 * Scheduled at 05:00 UTC: subscribers get alerts in the morning (07:00 local)
 * and yesterday's noon target (~19 h ago) is still inside the station's ~24 h
 * observation window. Auth (Bearer CRON_SECRET) is enforced by each handler.
 */
export async function GET(request: NextRequest) {
  const verifRes = await verificacion(request)
  if (verifRes.status === 401) return verifRes
  const verif = await verifRes.json()

  const alertRes = await alertas(request)
  const alert = await alertRes.json()

  let reviewsPublished = 0
  try {
    reviewsPublished = await publishDueReviews()
  } catch (error) {
    console.error('publishDueReviews failed:', error)
  }

  return NextResponse.json({ success: verif.success && alert.success, verificacion: verif, alertas: alert, reviewsPublished })
}
