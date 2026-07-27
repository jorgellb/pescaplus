import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getTrack } from '@/lib/tracks-store'
import { trackToGPX } from '@/lib/gpx'

/**
 * La ruta en GPX, que es lo que leen los plotters y OpenCPN.
 *
 * Poder llevarse la derrota es lo que hace que sea de verdad del pescador, y de
 * paso resuelve la portabilidad del RGPD con un fichero que ya sabe usar.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })
  const { id } = await params
  const track = await getTrack(id, user.id)
  if (!track) return NextResponse.json({ success: false, error: 'Ruta no encontrada.' }, { status: 404 })

  const nombre = (track.name || 'ruta').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 60) || 'ruta'
  return new NextResponse(trackToGPX(track), {
    headers: {
      'Content-Type': 'application/gpx+xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nombre}.gpx"`,
      // Es un dato privado: que no lo guarde ninguna caché por el camino.
      'Cache-Control': 'private, no-store',
    },
  })
}
