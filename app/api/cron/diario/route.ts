import { NextRequest, NextResponse } from 'next/server'
import { GET as verificacion } from '@/app/api/cron/verificacion/route'
import { GET as alertas } from '@/app/api/cron/alertas/route'
import { publishDueReviews } from '@/lib/reviews-store'
import { listChartersOnDate } from '@/lib/charters-store'
import { notifyTripReminder } from '@/lib/charter-notify'
import { todayMadridISO, addDaysISO } from '@/lib/solunar-format'

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

  // Recordatorio de la víspera: quien reserva con semanas de antelación se
  // olvida, y una plaza vacía no la recupera nadie.
  let remindersSent = 0
  try {
    const tomorrow = addDaysISO(todayMadridISO(), 1)
    for (const charter of await listChartersOnDate(tomorrow)) {
      for (const b of charter.bookings) {
        if (b.status === 'paid' || b.status === 'accepted') {
          await notifyTripReminder(b, charter)
          remindersSent += 1
        }
      }
    }
  } catch (error) {
    console.error('Trip reminders failed:', error)
  }

  let reviewsPublished = 0
  try {
    reviewsPublished = await publishDueReviews()
  } catch (error) {
    console.error('publishDueReviews failed:', error)
  }

  /*
   * Retención de la analítica.
   *
   * `Event` crece con cada página vista y nadie la vacía sola: en un sitio con
   * algo de tráfico son cientos de miles de filas al año, y el plan de Aiven
   * tiene el disco que tiene. Se guardan 180 días, que cubre comparar una
   * temporada con la misma del semestre anterior — que es la comparación que se
   * hace en un sitio de pesca, donde todo depende de la época del año.
   *
   * Va aquí y no en su propio cron porque un borrado que se ejecuta a diario y
   * en pequeñas tandas nunca se convierte en el borrado gigante que bloquea la
   * tabla.
   */
  let eventosPurgados = 0
  try {
    const { prisma } = await import('@/lib/prisma')
    const corte = new Date(Date.now() - 180 * 86_400_000)
    eventosPurgados = (await prisma.event.deleteMany({ where: { createdAt: { lt: corte } } })).count
  } catch (error) {
    console.error('Purga de eventos fallida:', error)
  }

  return NextResponse.json({ success: verif.success && alert.success, verificacion: verif, alertas: alert, reviewsPublished, remindersSent, eventosPurgados })
}
