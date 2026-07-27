import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserFromRequest } from '@/lib/auth'
import { getTrack, renameTrack, deleteTrack } from '@/lib/tracks-store'

const patch = z.object({
  name: z.string().min(1).max(90),
  notes: z.string().max(1000).optional(),
})

/** Una ruta con sus puntos, para volver a pintarla en la carta. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })
  const { id } = await params
  const track = await getTrack(id, user.id)
  // Que no exista y que no sea tuya devuelven lo mismo: no se confirma la
  // existencia de rutas ajenas.
  if (!track) return NextResponse.json({ success: false, error: 'Ruta no encontrada.' }, { status: 404 })
  return NextResponse.json({ success: true, track })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })
  const { id } = await params
  const parsed = patch.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  try {
    const track = await renameTrack(id, user.id, parsed.data.name, parsed.data.notes)
    if (!track) return NextResponse.json({ success: false, error: 'Ruta no encontrada.' }, { status: 404 })
    return NextResponse.json({ success: true, track: { ...track, points: [] } })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })
  const { id } = await params
  try {
    const ok = await deleteTrack(id, user.id)
    if (!ok) return NextResponse.json({ success: false, error: 'Ruta no encontrada.' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
  }
}
