import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { listTracks } from '@/lib/tracks-store'
import { toGrid, CSB_DISCLAIMER, type Sounding } from '@/lib/csb'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/**
 * El fondo medido por TI: las sondas de tus propias derrotas, agregadas.
 *
 * Es privado y sin discusión: son tus caladeros. No hay listado global ni forma
 * de ver el de otro, igual que con las marcas y las rutas.
 *
 * Las profundidades vienen del grabador con el calado del transductor ya sumado
 * —el valor crudo no llega nunca a guardarse—, así que aquí solo hay que
 * agrupar.
 */
export async function GET(request: NextRequest) {
  const limit = rateLimit(`mifondo:${clientIp(request)}`, 120, 60 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiadas consultas.' }, { status: 429 })
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })

  const p = request.nextUrl.searchParams
  const nums = ['w', 's', 'e', 'n'].map((k) => ({ raw: p.get(k), v: Number(p.get(k)) }))
  if (nums.some(({ raw, v }) => raw === null || !Number.isFinite(v))) {
    return NextResponse.json({ success: false, error: 'Recuadro no válido.' }, { status: 400 })
  }
  const [w, s, e, n] = nums.map(({ v }) => v)
  // Celda en metros: por debajo de 10 m se estaría fingiendo una resolución que
  // el cono de la sonda no da (a 50 m de fondo ilumina 17 m de diámetro).
  const celdaM = Math.min(200, Math.max(10, Number(p.get('celda')) || 20))

  const tracks = await listTracks(user.id, true)
  const sondas: Sounding[] = []
  for (const t of tracks) {
    for (const punto of t.points) {
      if (punto.depthM == null) continue
      if (punto.lat < s || punto.lat > n || punto.lon < w || punto.lon > e) continue
      sondas.push({ lat: punto.lat, lon: punto.lon, depthM: punto.depthM, t: punto.t })
    }
  }

  const celdas = toGrid(sondas, celdaM)
  return NextResponse.json(
    {
      success: true,
      celdaM,
      sondas: sondas.length,
      aviso: CSB_DISCLAIMER,
      geojson: {
        type: 'FeatureCollection',
        features: celdas.map((c) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
          properties: { depthM: c.depthM, samples: c.samples, spreadM: c.spreadM },
        })),
      },
    },
    // Datos privados: que no los guarde ninguna caché por el camino.
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
