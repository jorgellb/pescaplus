/**
 * Minimal transactional email via Resend. Requires RESEND_API_KEY + RESEND_FROM;
 * without them it reports a dry run (the app keeps working, nothing is sent),
 * so features that notify by email degrade gracefully until Resend is set up.
 */
export interface SendResult {
  sent: boolean
  dryRun: boolean
  error?: string
}

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM
}

export async function sendEmail(msg: { to: string; subject: string; html: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM // e.g. 'PescaPlus <hola@pescaplus.es>'
  if (!key || !from) return { sent: false, dryRun: true }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html }),
      signal: AbortSignal.timeout(10000),
    })
    return { sent: res.ok, dryRun: false, error: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e) {
    return { sent: false, dryRun: false, error: (e as Error).message }
  }
}
