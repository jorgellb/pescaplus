import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { listWaypoints } from '@/lib/waypoints-store'
import { toGPX } from '@/lib/gpx'
import { toCSV, toKML } from '@/lib/marks-io'

const TIPOS: Record<string, { mime: string; ext: string }> = {
  gpx: { mime: 'application/gpx+xml', ext: 'gpx' },
  csv: { mime: 'text/csv', ext: 'csv' },
  kml: { mime: 'application/vnd.google-earth.kml+xml', ext: 'kml' },
}

/** Las marcas propias en el formato que pida el aparato de destino. */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })

  const formato = (request.nextUrl.searchParams.get('formato') ?? 'gpx').toLowerCase()
  const tipo = TIPOS[formato]
  if (!tipo) return NextResponse.json({ success: false, error: 'Formato no admitido.' }, { status: 400 })

  const marcas = await listWaypoints(user.id)
  const cuerpo = formato === 'gpx' ? toGPX(marcas) : formato === 'csv' ? toCSV(marcas) : toKML(marcas)

  return new NextResponse(cuerpo, {
    headers: {
      'Content-Type': `${tipo.mime}; charset=utf-8`,
      'Content-Disposition': `attachment; filename="pescaplus-marcas.${tipo.ext}"`,
      // Son datos privados: que no los guarde ninguna caché por el camino.
      'Cache-Control': 'private, no-store',
    },
  })
}
