import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { saveContactMessage } from '@/lib/contact-store'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const contactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  subject: z.string().max(160).optional().default(''),
  message: z.string().min(5).max(4000),
  // Honeypot: bots fill hidden fields; humans leave it empty. Accepted by the
  // schema so we can silently drop it below instead of returning an error.
  website: z.string().max(200).optional(),
})

export async function POST(request: NextRequest) {
  const limit = rateLimit(`contact:${clientIp(request)}`, 5, 10 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: 'Demasiados envíos. Espera unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  const parsed = contactSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Revisa los datos del formulario.' }, { status: 400 })
  }

  // Silently accept honeypot hits so bots don't learn they were caught.
  if (parsed.data.website) return NextResponse.json({ success: true })

  try {
    await saveContactMessage({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject ?? '',
      message: parsed.data.message,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving contact message:', error)
    return NextResponse.json({ success: false, error: 'No se pudo enviar. Inténtalo más tarde.' }, { status: 500 })
  }
}
