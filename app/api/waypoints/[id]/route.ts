import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserFromRequest } from '@/lib/auth'
import { updateWaypoint, deleteWaypoint } from '@/lib/waypoints-store'

const patch = z.object({
  name: z.string().min(1).max(80).optional(),
  type: z.string().max(20).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  depthM: z.number().min(0).max(11000).nullable().optional(),
  notes: z.string().max(500).optional(),
  visibility: z.enum(['private', 'public']).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })
  const { id } = await params
  const parsed = patch.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  try {
    const wp = await updateWaypoint(id, user.id, parsed.data)
    // Que no exista y que no sea tuya devuelven lo mismo: no confirmamos
    // la existencia de marcas ajenas.
    if (!wp) return NextResponse.json({ success: false, error: 'Marca no encontrada.' }, { status: 404 })
    return NextResponse.json({ success: true, waypoint: wp })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })
  const { id } = await params
  const ok = await deleteWaypoint(id, user.id)
  return ok
    ? NextResponse.json({ success: true })
    : NextResponse.json({ success: false, error: 'Marca no encontrada.' }, { status: 404 })
}
