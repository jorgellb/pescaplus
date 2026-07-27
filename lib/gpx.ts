// Desde los módulos de tipos, no desde los stores: así este fichero puede
// usarse también en el navegador sin arrastrar Prisma detrás.
import type { Waypoint, WaypointInput } from '@/lib/waypoint-types'
import type { Track, TrackPoint } from '@/lib/track-types'

/**
 * GPX 1.1 import/export — the format every plotter and chartplotter app reads.
 *
 * Export is what makes the data genuinely the angler's: they can take their
 * marks to OpenCPN, Navionics or a Garmin and leave whenever they want. That's
 * also the RGPD portability right, satisfied with a file they already know how
 * to use.
 *
 * The parser is deliberately small and tolerant: real GPX files come from a
 * dozen devices with different namespaces, orderings and extensions, so it
 * reads what it understands and ignores the rest rather than rejecting a file
 * a plotter wrote perfectly well.
 */
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function toGPX(waypoints: Waypoint[], creator = 'PescaPlus'): string {
  const pts = waypoints.map((w) => {
    const parts = [
      `    <name>${esc(w.name)}</name>`,
      w.depthM != null ? `    <ele>${-Math.abs(w.depthM)}</ele>` : '',
      w.notes ? `    <desc>${esc(w.notes)}</desc>` : '',
      `    <type>${esc(w.type)}</type>`,
    ].filter(Boolean).join('\n')
    return `  <wpt lat="${w.lat}" lon="${w.lon}">\n${parts}\n  </wpt>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="${esc(creator)}" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Marcas de pesca</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
${pts}
</gpx>`
}

/** Pull the first matching tag's text out of a fragment. */
function tag(fragment: string, name: string): string {
  // El nombre puede venir con prefijo de espacio de nombres (gpx:name).
  const m = fragment.match(new RegExp(`<(?:\\w+:)?${name}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`, 'i'))
  if (!m) return ''
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
}

const KNOWN_TYPES = new Set(['caladero', 'bajo', 'naufragio', 'boya', 'rampa', 'peligro', 'otro'])

/**
 * Parse a GPX file into waypoint inputs. Anything imported is PRIVATE: a file
 * from another device says nothing about the owner's intent to publish.
 */
export function fromGPX(xml: string, max = 2000): WaypointInput[] {
  const out: WaypointInput[] = []
  const re = /<(?:\w+:)?wpt\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?wpt>/gi
  let m: RegExpExecArray | null

  while ((m = re.exec(xml)) && out.length < max) {
    const attrs = m[1]
    const body = m[2]
    const lat = Number(attrs.match(/\blat\s*=\s*"([^"]+)"/i)?.[1])
    const lon = Number(attrs.match(/\blon\s*=\s*"([^"]+)"/i)?.[1])
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue

    const rawType = tag(body, 'type').toLowerCase()
    // La elevación en un GPX marino suele venir negativa: es la sonda.
    const ele = Number(tag(body, 'ele'))
    const depth = Number.isFinite(ele) && ele < 0 ? Math.abs(ele) : null

    out.push({
      name: tag(body, 'name') || 'Marca importada',
      type: KNOWN_TYPES.has(rawType) ? rawType : 'otro',
      lat, lon,
      depthM: depth,
      notes: tag(body, 'desc') || tag(body, 'cmt'),
      visibility: 'private',
    })
  }
  return out
}

/**
 * Una ruta grabada, como `<trk>` de GPX 1.1.
 *
 * Los `<trkpt>` llevan su `<time>` porque sin él la derrota deja de ser una
 * derrota: un plotter no puede sacar velocidades ni saber en qué sentido se
 * navegó, y queda como una línea muerta sobre la carta.
 */
export function trackToGPX(track: Track, creator = 'PescaPlus'): string {
  const pts = track.points.map((p) => {
    const cuerpo = [`      <time>${new Date(p.t).toISOString()}</time>`]
      .concat(p.spd != null ? [`      <extensions><speed>${p.spd}</speed></extensions>`] : [])
      .join('\n')
    return `    <trkpt lat="${p.lat}" lon="${p.lon}">\n${cuerpo}\n    </trkpt>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="${esc(creator)}" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${esc(track.name)}</name>
    <time>${new Date(track.startedAt).toISOString()}</time>
  </metadata>
  <trk>
    <name>${esc(track.name)}</name>
${track.notes ? `    <desc>${esc(track.notes)}</desc>\n` : ''}    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>`
}

/**
 * Lee los `<trkpt>` de un GPX. Tolerante como el de waypoints: los ficheros
 * reales vienen de una docena de aparatos con prefijos y extensiones distintas.
 * Un punto sin hora no se descarta —muchos plotters no la escriben—, se le pone
 * la del anterior más un segundo para no romper el orden.
 */
export function trackFromGPX(xml: string, max = 20000): TrackPoint[] {
  const out: TrackPoint[] = []
  const re = /<(?:\w+:)?trkpt\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?trkpt>|<(?:\w+:)?trkpt\b([^>]*)\/>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) && out.length < max) {
    const attrs = m[1] ?? m[3] ?? ''
    const lat = Number(/lat\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1])
    const lon = Number(/lon\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1])
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue
    const iso = /<(?:\w+:)?time>([^<]+)<\/(?:\w+:)?time>/i.exec(m[2] ?? '')?.[1]
    const t = iso ? Date.parse(iso) : NaN
    out.push({
      lat, lon,
      t: Number.isFinite(t) ? t : (out.length > 0 ? out[out.length - 1].t + 1000 : Date.now()),
    })
  }
  return out
}
