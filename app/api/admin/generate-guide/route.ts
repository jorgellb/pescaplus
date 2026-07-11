import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { generateGuide } from '@/lib/nvidia-ai'

export const maxDuration = 60

const schema = z.object({
  topic: z.string().min(2).max(200),
  typeFishing: z.string().max(40).optional(),
})

/** Draft a guide/blog article with AI (admin only). Returns an unsaved draft. */
export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Tema inválido' }, { status: 400 })

  const draft = await generateGuide(parsed.data.topic, parsed.data.typeFishing)
  return NextResponse.json({ success: true, draft })
}
