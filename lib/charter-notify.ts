import { sendEmail } from '@/lib/email'
import { SITE_URL } from '@/lib/seo'
import { getSpot } from '@/lib/fishing-spots'
import { fmtDateLong } from '@/lib/solunar-format'
import type { Charter, CharterBooking } from '@/lib/charters-store'

/**
 * Transactional email for the charter loop.
 *
 * Until now the marketplace was mute: someone could pay for a trip and the
 * patrón would only find out by opening their panel. Every function here is
 * fire-and-forget — a mail failure must never break a booking or a payment, so
 * nothing throws and callers don't await the result on the critical path.
 */
const BRAND = 'PescaPlus'

/** An attendee's contact can be a phone; only e-mail addresses are notifiable. */
export function isEmail(contact: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((contact ?? '').trim())
}

function charterLine(c: Charter): string {
  const spot = getSpot(c.spotSlug)?.name ?? c.spotSlug
  return `${spot} · ${fmtDateLong(c.dateISO)} · ${c.timeStart}`
}

function shell(title: string, body: string, cta?: { href: string; label: string }): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f1417">
    <h1 style="font-size:21px;margin:0 0 12px">${title}</h1>
    ${body}
    ${cta ? `<p style="margin:26px 0"><a href="${cta.href}" style="background:#0a7d72;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;display:inline-block">${cta.label}</a></p>` : ''}
    <p style="color:#9aa0a3;font-size:12px;margin-top:26px">${BRAND} · pescaplus.es</p>
  </div>`
}

const p = (t: string) => `<p style="color:#3b4245;line-height:1.55;margin:0 0 10px">${t}</p>`

/** A new booking landed. The patrón needs to know now, not next time they log in. */
export async function notifyOperatorNewBooking(
  operatorEmail: string,
  charter: Charter,
  booking: CharterBooking,
  paid: boolean,
): Promise<void> {
  if (!isEmail(operatorEmail)) return
  const total = Math.round(charter.pricePerPerson * booking.people)
  await sendEmail({
    to: operatorEmail,
    subject: paid
      ? `💰 Reserva PAGADA: ${booking.people} plaza(s) · ${charterLine(charter)}`
      : `🎣 Nueva solicitud de reserva · ${charterLine(charter)}`,
    html: shell(
      paid ? 'Tienes una reserva pagada' : 'Tienes una solicitud de reserva',
      p(`<strong>${booking.name}</strong> ${paid ? 'ha reservado y pagado' : 'quiere'} <strong>${booking.people} plaza(s)</strong> en tu salida.`)
      + p(`<strong>Salida:</strong> ${charterLine(charter)}`)
      + p(`<strong>Importe:</strong> ${total} €`)
      + p(`<strong>Contacto:</strong> ${booking.contact}`)
      + (booking.message ? p(`<strong>Mensaje:</strong> «${booking.message}»`) : '')
      + p(paid
        ? 'La plaza ya está confirmada. Ponte en contacto para darle los detalles del punto de encuentro.'
        : 'Entra en tu panel para aceptarla o rechazarla.'),
      { href: `${SITE_URL}/cuenta?tab=patron`, label: 'Ver en mi panel' },
    ),
  }).catch(() => {})
}

/** The patrón answered. Tell the angler either way. */
export async function notifyAnglerBookingResponse(
  booking: CharterBooking,
  charter: Charter,
  accepted: boolean,
): Promise<void> {
  if (!isEmail(booking.contact)) return
  await sendEmail({
    to: booking.contact,
    subject: accepted
      ? `✅ Plaza confirmada · ${charterLine(charter)}`
      : `Tu solicitud no ha podido aceptarse · ${charterLine(charter)}`,
    html: shell(
      accepted ? 'Tu plaza está confirmada' : 'El patrón no ha podido aceptar tu solicitud',
      accepted
        ? p(`El patrón ha aceptado tus <strong>${booking.people} plaza(s)</strong>.`)
          + p(`<strong>Salida:</strong> ${charterLine(charter)}`)
          + (charter.meetingPoint ? p(`<strong>Punto de encuentro:</strong> ${charter.meetingPoint}`) : '')
        : p('Puede que la salida se haya llenado o que ese día no le encaje. Puedes buscar otras salidas en la misma zona.'),
      { href: `${SITE_URL}/charters/${charter.id}`, label: accepted ? 'Ver la salida' : 'Ver otras salidas' },
    ),
  }).catch(() => {})
}

/** The trip is off. Say whether the money is coming back. */
export async function notifyAnglerCharterCancelled(
  booking: CharterBooking,
  charter: Charter,
  refunded: boolean,
): Promise<void> {
  if (!isEmail(booking.contact)) return
  await sendEmail({
    to: booking.contact,
    subject: `❌ Salida cancelada · ${charterLine(charter)}`,
    html: shell(
      'El patrón ha cancelado la salida',
      p(`<strong>Salida:</strong> ${charterLine(charter)}`)
      + p(refunded
        ? 'Te hemos <strong>devuelto el importe íntegro</strong>. Según tu banco, puede tardar unos días en aparecer.'
        : 'No había ningún pago asociado a tu reserva, así que no hay nada que devolver.')
      + p('Sentimos el cambio de planes. Puedes ver otras salidas en tu zona.'),
      { href: `${SITE_URL}/charters`, label: 'Ver otras salidas' },
    ),
  }).catch(() => {})
}

/** Enough places taken: the trip is definitely going out. */
export async function notifyCharterConfirmed(booking: CharterBooking, charter: Charter): Promise<void> {
  if (!isEmail(booking.contact)) return
  await sendEmail({
    to: booking.contact,
    subject: `🎉 La salida sale seguro · ${charterLine(charter)}`,
    html: shell(
      'La salida está confirmada',
      p('Ya hay pescadores suficientes: la salida se hace.')
      + p(`<strong>Salida:</strong> ${charterLine(charter)}`)
      + (charter.meetingPoint ? p(`<strong>Punto de encuentro:</strong> ${charter.meetingPoint}`) : ''),
      { href: `${SITE_URL}/charters/${charter.id}`, label: 'Ver los detalles' },
    ),
  }).catch(() => {})
}

/** Day-before nudge — the cheapest way to cut no-shows. */
export async function notifyTripReminder(booking: CharterBooking, charter: Charter): Promise<void> {
  if (!isEmail(booking.contact)) return
  await sendEmail({
    to: booking.contact,
    subject: `⏰ Mañana sales a pescar · ${charterLine(charter)}`,
    html: shell(
      'Tu salida es mañana',
      p(`<strong>${charterLine(charter)}</strong>`)
      + (charter.meetingPoint ? p(`<strong>Punto de encuentro:</strong> ${charter.meetingPoint}`) : '')
      + p('Lleva tu documentación y ropa de abrigo. Consulta la previsión del día antes de salir.'),
      { href: `${SITE_URL}/charters/${charter.id}`, label: 'Ver la salida y la previsión' },
    ),
  }).catch(() => {})
}
