import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { generateProductDraft } from '@/lib/nvidia-ai'
import { getSettings } from '@/lib/settings-store'

const schema = z.object({
  prompt: z.string().min(2).max(400),
  typeFishing: z.string().min(1).max(40).optional(),
  currency: z.string().max(8).optional(),
})

/** Draft a product with AI (admin only). Returns an unsaved draft to prefill the form. */
export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Prompt inválido' }, { status: 400 })
  }

  const settings = getSettings()
  const draft = await generateProductDraft(
    parsed.data.prompt,
    parsed.data.typeFishing || settings.defaultType,
    parsed.data.currency || settings.defaultCurrency,
  )

  return NextResponse.json({ success: true, draft })
}
