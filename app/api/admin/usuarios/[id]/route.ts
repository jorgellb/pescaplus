import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { updateUserProfile, adminDeleteUser, getUserById } from '@/lib/users-store'

const patchSchema = z.object({
  name: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  bio: z.string().max(600).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  try {
    const user = await updateUserProfile(id, parsed.data)
    if (!user) return NextResponse.json({ success: false, error: 'Usuario no encontrado.' }, { status: 404 })
    return NextResponse.json({ success: true, user })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const existing = await getUserById(id)
  if (!existing) return NextResponse.json({ success: false, error: 'Usuario no encontrado.' }, { status: 404 })
  const removed = await adminDeleteUser(id)
  if (!removed) return NextResponse.json({ success: false, error: 'No se pudo eliminar.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
