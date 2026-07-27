import { NextRequest, NextResponse } from 'next/server'
import { nearestSpot } from '@/lib/fishing-spots'
import { getRegulation, REGULATIONS_REVIEWED, NATIONAL_SIZES_URL } from '@/lib/fishing-regulations'
import { checkPoint, PESCAREC_NOTE, PESCAREC_URL } from '@/lib/protected-areas'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Qué normativa te aplica en este punto.
 *
 * LO QUE ESTO HACE Y LO QUE NO. Dice QUIÉN manda —de qué comunidad autónoma son
 * las reglas donde estás, con su organismo y su enlace— y avisa de si el punto
 * cae en un espacio protegido. NO dice tallas mínimas, cupos ni vedas.
 *
 * Y no las dice a propósito. Esos números cambian por temporada, por comunidad y
 * hasta por ayuntamiento, y uno equivocado aquí le cuesta una multa a quien se
 * fíe. Antes de publicarlos hace falta una tabla oficial verificada, con su
 * fuente y su fecha; hasta entonces se enlaza a quien sí manda y se dice cuándo
 * se revisó esta información por última vez.
 *
 * La comunidad se deduce de la zona de pesca más cercana. En mar abierto no hay
 * fronteras pintadas, así que es una aproximación y se declara como tal.
 */
export async function GET(request: NextRequest) {
  const limit = rateLimit(`normativa:${clientIp(request)}`, 300, 60 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiadas consultas.' }, { status: 429 })

  const rawLat = request.nextUrl.searchParams.get('lat')
  const rawLon = request.nextUrl.searchParams.get('lon')
  const lat = Number(rawLat)
  const lon = Number(rawLon)
  if (rawLat === null || rawLon === null || !Number.isFinite(lat) || !Number.isFinite(lon)
      || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ success: false, error: 'Coordenadas no válidas.' }, { status: 400 })
  }

  const spot = nearestSpot(lat, lon)
  const reg = getRegulation(spot.region)
  const zona = await checkPoint(lat, lon)

  return NextResponse.json(
    {
      success: true,
      comunidad: {
        region: spot.region,
        // De dónde sale la deducción, para que se pueda juzgar.
        segun: `zona más cercana: ${spot.name}`,
        organismo: reg?.authority ?? null,
        enlace: reg?.licenseUrl ?? null,
      },
      licencia: 'La pesca marítima de recreo exige licencia de la comunidad autónoma.',
      tallasUrl: NATIONAL_SIZES_URL,
      revisado: REGULATIONS_REVIEWED,
      protegido: {
        cobertura: zona.coverage,
        areas: zona.areas.map((a) => ({
          nombre: a.name,
          pescaRecreativa: a.recreationalFishing,
          requierePermiso: a.requiresPermit,
          normativaUrl: a.rulesUrl,
          fuente: a.sourceName,
          fecha: a.sourceDate,
        })),
        pescarec: zona.coverage === 'inside' ? { nota: PESCAREC_NOTE, url: PESCAREC_URL } : null,
      },
      // Se dice en la respuesta, no solo en la interfaz: quien use esta API
      // desde fuera merece la misma advertencia.
      aviso: 'No se publican tallas mínimas, cupos ni vedas: cambian por temporada y comunidad. Confírmalos en el organismo enlazado antes de salir.',
    },
    { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
  )
}
