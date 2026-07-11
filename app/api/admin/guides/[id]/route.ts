import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { updateGuide, deleteGuide, getGuide } from '@/lib/guides-store'

const patchSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  excerpt: z.string().max(400).optional(),
  content: z.string().min(1).max(20000).optional(),
  coverImage: z.string().max(1200).optional(),
  typeFishing: z.string().max(40).optional(),
  seoTitle: z.string().max(120).optional(),
  seoDescription: z.string().max(200).optional(),
  aiOptimized: z.boolean().optional(),
  published: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos inválidos' }, { status: 400 })

  const guide = await updateGuide(id, parsed.data)
  if (!guide) return NextResponse.json({ success: false, error: 'Guía no encontrada' }, { status: 404 })
  revalidatePath('/guias')
  revalidatePath(`/guias/${id}`)
  return NextResponse.json({ success: true, guide })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  const { id } = await params
  const existing = await getGuide(id)
  const removed = await deleteGuide(id)
  if (!removed) return NextResponse.json({ success: false, error: 'Guía no encontrada' }, { status: 404 })
  revalidatePath('/guias')
  if (existing) revalidatePath(`/guias/${id}`)
  return NextResponse.json({ success: true })
}
