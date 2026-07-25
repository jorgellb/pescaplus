import { sendEmail } from '@/lib/email'
import { SITE_URL } from '@/lib/seo'

/**
 * Notify a recipient by email that they have a new in-app message. Degrades to
 * a dry run when Resend isn't configured (the message still lives in the app).
 */
export async function notifyNewMessage(to: string, threadId: string, fromLabel: string): Promise<void> {
  const link = `${SITE_URL}/cuenta/mensajes/${threadId}`
  await sendEmail({
    to,
    subject: `Nuevo mensaje en PescaPlus de ${fromLabel}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
      <h1 style="font-size:20px;margin:0 0 8px">💬 Tienes un mensaje nuevo</h1>
      <p style="color:#444;line-height:1.5"><strong>${fromLabel}</strong> te ha escrito en PescaPlus. Entra para leerlo y responder.</p>
      <p style="margin:24px 0"><a href="${link}" style="background:#0f766e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;display:inline-block">Ver conversación</a></p>
      <p style="color:#aaa;font-size:12px;margin-top:24px">Recibes este aviso porque participas en una conversación en PescaPlus.</p>
    </div>`,
  })
}
