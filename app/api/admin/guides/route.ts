import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { listGuides, createGuide } from '@/lib/guides-store'

export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  const guides = await listGuides()
  return NextResponse.json({ success: true, guides })
}

const guideSchema = z.object({
  title: z.string().min(2).max(200),
  excerpt: z.string().max(400).optional(),
  content: z.string().min(1).max(20000),
  coverImage: z.string().max(1200).optional(),
  typeFishing: z.string().max(40).optional(),
  seoTitle: z.string().max(120).optional(),
  seoDescription: z.string().max(200).optional(),
  aiOptimized: z.boolean().optional(),
  published: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  const parsed = guideSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Datos inválidos' }, { status: 400 })
  }
  const guide = await createGuide(parsed.data)
  revalidatePath('/guias')
  revalidatePath(`/guias/${guide.id}`)
  return NextResponse.json({ success: true, guide }, { status: 201 })
}
