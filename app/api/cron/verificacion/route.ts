import { NextRequest, NextResponse } from 'next/server'
import { FISHING_SPOTS, getSpot } from '@/lib/fishing-spots'
import { AEMET_STATIONS } from '@/lib/aemet-stations'
import { getMarineForecast } from '@/lib/marine-forecast'
import { getAemetObservationAt } from '@/lib/aemet-obs'
import { upsertPrediction, listUnresolved, resolveCheck } from '@/lib/verification-store'
import { todayMadridISO, addDaysISO } from '@/lib/solunar-format'

export const maxDuration = 300

/**
 * Daily public-verification cron (schedule once a day, e.g. 18:00 UTC):
 *   GET /api/cron/verificacion   Authorization: Bearer $CRON_SECRET
 * 1) Stores tomorrow-noon wind predictions for the verification panel (zones
 *    whose AEMET station sits within 15 km, deduped by station).
 * 2) Resolves pending predictions against the OFFICIAL station measurement.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const today = todayMadridISO()
  const tomorrow = addDaysISO(today, 1)

  // Verification panel: coastal zones with a close station, one per station.
  const seen = new Set<string>()
  const panel = FISHING_SPOTS.filter((s) => {
    const st = AEMET_STATIONS[s.slug]
    if (!st || st.km > 15 || seen.has(st.idema)) return false
    seen.add(st.idema)
    return true
  }).slice(0, 60)

  let stored = 0
  for (const spot of panel) {
    const st = AEMET_STATIONS[spot.slug]
    try {
      const forecast = await getMarineForecast(spot, null, 'tierra')
      const hour = forecast.hours.find((h) => h.dateISO === tomorrow && h.hourLabel === '12:00')
      if (hour?.windKmh == null) continue
      await upsertPrediction({
        spotSlug: spot.slug,
        dateISO: tomorrow,
        targetUtc: new Date(hour.time).toISOString().slice(0, 13),
        idema: st.idema,
        predWindKmh: hour.windKmh,
      })
      stored++
    } catch {
      /* keep going */
    }
  }

  // Resolve everything due (target hour already observed).
  const pending = await listUnresolved(today)
  let resolved = 0
  for (const row of pending) {
    if (!getSpot(row.spotSlug)) continue
    try {
      const obs = await getAemetObservationAt(row.idema, row.targetUtc)
      if (obs?.windKmh == null) continue
      await resolveCheck(row.id, obs.windKmh, obs.windKmh - row.predWindKmh)
      resolved++
    } catch {
      /* keep going */
    }
  }

  return NextResponse.json({ success: true, panel: panel.length, stored, pendingSeen: pending.length, resolved })
}
