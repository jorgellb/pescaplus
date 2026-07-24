import { isDatabaseConfigured } from '@/lib/products-store'
import { sendEmail } from '@/lib/email'
import { SITE_URL } from '@/lib/seo'
import { getSpot } from '@/lib/fishing-spots'
import { getSpecies } from '@/lib/fishing-species'
import { fmtDayLabel } from '@/lib/solunar-format'
import type { Meetup } from '@/lib/meetups-store'

/**
 * "Avísame de quedadas en esta zona" subscriptions. When a new meetup (or open
 * call) is posted in a zone, everyone subscribed to that zone is emailed right
 * away (fired via `after()` so it never blocks the request). Storage works
 * without Resend; sending degrades to a dry run until RESEND_* is configured.
 */
export interface ZoneAlert {
  id: string
  email: string
  spotSlug: string
}

const globalForZoneAlerts = globalThis as unknown as { __pescaplusZoneAlerts?: ZoneAlert[] }
function memory(): ZoneAlert[] {
  if (!globalForZoneAlerts.__pescaplusZoneAlerts) globalForZoneAlerts.__pescaplusZoneAlerts = []
  return globalForZoneAlerts.__pescaplusZoneAlerts
}

export async function subscribeZoneAlert(input: { email: string; spotSlug: string }): Promise<void> {
  const data = { email: input.email.trim().toLowerCase().slice(0, 160), spotSlug: input.spotSlug.slice(0, 80) }
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.zoneMeetupAlert.upsert({
        where: { email_spotSlug: { email: data.email, spotSlug: data.spotSlug } },
        update: {},
        create: data,
      })
      return
    } catch (error) {
      console.warn('Zone alert DB write failed, using memory:', error)
    }
  }
  const store = memory()
  if (!store.find((s) => s.email === data.email && s.spotSlug === data.spotSlug)) {
    store.push({ id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...data })
  }
}

export async function listZoneAlerts(spotSlug: string): Promise<ZoneAlert[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.zoneMeetupAlert.findMany({ where: { spotSlug }, take: 2000 })
      return rows.map((r) => ({ id: r.id, email: r.email, spotSlug: r.spotSlug }))
    } catch (error) {
      console.warn('Zone alert DB read failed, using memory:', error)
    }
  }
  return memory().filter((s) => s.spotSlug === spotSlug)
}

export async function deleteZoneAlert(id: string): Promise<void> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.zoneMeetupAlert.delete({ where: { id } })
      return
    } catch {
      /* not found / db down */
    }
  }
  const store = memory()
  const i = store.findIndex((s) => s.id === id)
  if (i >= 0) store.splice(i, 1)
}

const MOD_LABEL: Record<string, string> = { tierra: 'orilla', kayak: 'kayak', barco: 'barco' }

/**
 * Notify every zone subscriber about a freshly posted meetup. Best-effort:
 * returns how many were emailed (or would be, in dry run). Never throws.
 */
export async function notifyNewMeetup(meetup: Meetup): Promise<{ recipients: number; sent: number; dryRun: boolean }> {
  try {
    const subs = await listZoneAlerts(meetup.spotSlug)
    if (subs.length === 0) return { recipients: 0, sent: 0, dryRun: false }

    const spot = getSpot(meetup.spotSlug)
    const spotName = spot?.name ?? meetup.spotSlug
    const sp = meetup.targetSpecies ? getSpecies(meetup.targetSpecies) : null
    const species = sp && sp.id !== 'general' ? sp.name.toLowerCase() : null
    const when = `${fmtDayLabel(meetup.dateISO)}${meetup.kind === 'quedada' ? ` a las ${meetup.timeStart}` : ` (${meetup.timeStart.toLowerCase()})`}`
    const title = meetup.kind === 'llamada' ? `Alguien busca compañía para pescar en ${spotName}` : `Nueva quedada de pesca en ${spotName}`
    const url = `${SITE_URL}/quedadas/${meetup.id}`

    let sent = 0
    let dryRun = false
    for (const sub of subs) {
      const unsub = `${SITE_URL}/api/quedadas/alertas/baja?id=${sub.id}`
      const r = await sendEmail({
        to: sub.email,
        subject: `🎣 ${title} · ${when}`,
        html: `<div style="font-family:system-ui;max-width:560px;margin:0 auto;color:#111">
<h2 style="text-transform:uppercase">🎣 ${title}</h2>
<p style="font-size:16px"><strong>${MOD_LABEL[meetup.modality] ?? meetup.modality}</strong> · ${when}${species ? ` · a por ${species}` : ''} · nivel ${meetup.level}</p>
${meetup.notes ? `<p style="color:#555">${meetup.notes.slice(0, 200)}</p>` : ''}
<p><a href="${url}" style="background:#0f766e;color:#fff;padding:12px 20px;text-decoration:none;border-radius:10px;display:inline-block">Ver y apuntarme</a></p>
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0">
<p style="font-size:12px;color:#777">Recibes esto porque pediste avisos de quedadas en ${spotName}. <a href="${unsub}" style="color:#777">Darse de baja</a></p>
</div>`,
      })
      if (r.dryRun) dryRun = true
      if (r.sent) sent++
    }
    return { recipients: subs.length, sent, dryRun }
  } catch (error) {
    console.warn('notifyNewMeetup failed:', error)
    return { recipients: 0, sent: 0, dryRun: false }
  }
}
