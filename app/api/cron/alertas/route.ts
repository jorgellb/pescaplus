import { NextRequest, NextResponse } from 'next/server'
import { listAlerts, type AlertSubscription } from '@/lib/alerts-store'
import { getSpot } from '@/lib/fishing-spots'
import { getSpecies } from '@/lib/fishing-species'
import { getMarineForecast, bestWindow, groupByDay } from '@/lib/marine-forecast'
import { fmtWindowRange, fmtDayLabel, todayMadridISO } from '@/lib/solunar-format'
import { SITE_URL } from '@/lib/seo'

export const maxDuration = 300

/**
 * Daily alert sender (schedule with your platform's cron, e.g. Vercel Cron):
 *   GET /api/cron/alertas  with  Authorization: Bearer $CRON_SECRET
 * For each subscription, checks the next 3 days for a window at or above the
 * subscriber's threshold and emails it via Resend. Requires RESEND_API_KEY and
 * RESEND_FROM; without them it reports what it WOULD send (dry run).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM // e.g. 'PescaPlus <alertas@tudominio.com>'
  const dryRun = !resendKey || !from

  const subs = await listAlerts()

  /**
   * Se agrupa por ZONA + ESPECIE, no solo por zona.
   *
   * El formulario de alta deja elegir especie y se guardaba en
   * `AlertSubscription.especie`, pero aquí se pedía la previsión con `null`:
   * quien pedía "avísame cuando entre la lubina en Tarifa" recibía la
   * puntuación genérica de la zona, que puntúa distinto. El aviso prometía una
   * cosa y mandaba otra. La previsión está cacheada por zona+especie, así que
   * agrupar más fino no dispara las llamadas.
   */
  const byGroup = new Map<string, { spotSlug: string; especie: string; subs: AlertSubscription[] }>()
  for (const s of subs) {
    const key = `${s.spotSlug}::${s.especie || ''}`
    const g = byGroup.get(key)
    if (g) g.subs.push(s)
    else byGroup.set(key, { spotSlug: s.spotSlug, especie: s.especie || '', subs: [s] })
  }

  let sent = 0
  let matched = 0
  const errors: string[] = []

  for (const { spotSlug: slug, especie, subs: list } of byGroup.values()) {
    const spot = getSpot(slug)
    if (!spot) continue
    const sp = especie ? getSpecies(especie) : null
    const forecast = await getMarineForecast(spot, especie || null, 'tierra')
    if (!forecast.available) continue

    const today = todayMadridISO()
    const days = groupByDay(forecast.hours).slice(0, 3)
    const windows = days
      .map((g) => ({ dateISO: g.dateISO, dayStart: g.hours[0].time, win: bestWindow(g.hours) }))
      .filter((d) => d.win !== null)

    for (const sub of list) {
      const hit = windows.find((d) => (d.win!.avg ?? 0) >= sub.threshold)
      if (!hit) continue
      matched++
      if (dryRun) continue

      const dayName = hit.dateISO === today ? 'hoy' : fmtDayLabel(hit.dateISO)
      const range = fmtWindowRange(hit.win!.start, hit.win!.end, hit.dayStart)
      // Con especie elegida, el enlace lleva a la previsión de ESA especie.
      const qs = especie ? `?especie=${encodeURIComponent(especie)}` : ''
      const url = `${SITE_URL}/mejores-horas/${spot.slug}${qs}`
      const planUrl = `${SITE_URL}/mejores-horas/${spot.slug}/plan?dia=${hit.dateISO}${especie ? `&especie=${encodeURIComponent(especie)}` : ''}`
      const unsubUrl = `${SITE_URL}/api/alertas/baja?id=${sub.id}`
      const paraEspecie = sp && sp.id !== 'general' ? ` para ${sp.article} ${sp.name.toLowerCase()}` : ''

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            to: [sub.email],
            subject: `🎣 Ventana buena ${dayName}${paraEspecie} en ${spot.name}: ${range} (${hit.win!.avg}/100)`,
            html: `<div style="font-family:system-ui;max-width:560px;margin:0 auto;color:#111">
<h2 style="text-transform:uppercase">🎣 ${spot.name}: ventana de pesca ${dayName}${paraEspecie}</h2>
<p style="font-size:18px"><strong>${range}</strong> · puntuación <strong>${hit.win!.avg}/100</strong></p>
<p>Solunar, viento, mar y mareas apuntan a un buen tramo. Revisa el detalle y el estado del mar antes de salir.</p>
<p><a href="${planUrl}" style="background:#0a7d72;color:#fff;padding:12px 20px;text-decoration:none;border-radius:10px;display:inline-block">Generar mi plan de pesca</a></p>
<p><a href="${url}" style="color:#0a7d72">Previsión completa de ${spot.name}</a></p>
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0">
<p style="font-size:12px;color:#777">Recibes este aviso porque activaste alertas en PescaPlus. <a href="${unsubUrl}" style="color:#777">Darse de baja</a></p>
</div>`,
          }),
          signal: AbortSignal.timeout(10000),
        })
        if (res.ok) sent++
        else errors.push(`${sub.email}: HTTP ${res.status}`)
      } catch (e) {
        errors.push(`${sub.email}: ${(e as Error).message}`)
      }
    }
  }

  return NextResponse.json({ success: true, dryRun, subscriptions: subs.length, matched, sent, errors: errors.slice(0, 10) })
}
