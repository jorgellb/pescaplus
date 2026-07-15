import type { FishingSpot } from '@/lib/fishing-spots'

/**
 * Approximate seaward bearing (the direction looking out to open sea) for a
 * coastal spot, derived from a per-zone inland reference point: the bearing
 * from inland to the spot points at the sea. Orientative (±45°), which is all
 * the onshore/offshore classification needs.
 */

interface RefPoint {
  lat: number
  lon: number
}

// Island centres (Baleares + Canarias) and mainland/zone anchors.
const ISLAND_CENTRES: RefPoint[] = [
  { lat: 39.61, lon: 2.98 }, // Mallorca
  { lat: 39.95, lon: 4.09 }, // Menorca
  { lat: 38.98, lon: 1.43 }, // Ibiza/Formentera
  { lat: 27.96, lon: -15.6 }, // Gran Canaria
  { lat: 28.27, lon: -16.6 }, // Tenerife
  { lat: 29.03, lon: -13.63 }, // Lanzarote
  { lat: 28.35, lon: -14.02 }, // Fuerteventura
  { lat: 28.11, lon: -17.23 }, // La Gomera
  { lat: 28.66, lon: -17.86 }, // La Palma
  { lat: 27.73, lon: -18.02 }, // El Hierro
]

function bearing(from: RefPoint, to: RefPoint): number {
  const dLat = to.lat - from.lat
  const dLon = (to.lon - from.lon) * Math.cos(((from.lat + to.lat) / 2) * (Math.PI / 180))
  return (Math.atan2(dLon, dLat) * (180 / Math.PI) + 360) % 360
}

function nearest(points: RefPoint[], to: RefPoint): RefPoint {
  let best = points[0]
  let bestD = Infinity
  for (const p of points) {
    const d = (p.lat - to.lat) ** 2 + ((p.lon - to.lon) * Math.cos((to.lat * Math.PI) / 180)) ** 2
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return best
}

/** Inland reference for a spot, chosen by zone. */
function inlandRef(s: FishingSpot): RefPoint {
  if (s.region === 'Baleares' || s.region === 'Canarias') return nearest(ISLAND_CENTRES, s)
  if (s.region === 'Ceuta') return { lat: 35.7, lon: -5.35 }
  if (s.region === 'Melilla') return { lat: 35.1, lon: -3.1 }
  // North coast (Galicia norte, Asturias, Cantabria, País Vasco): due south of the spot.
  if (['Asturias', 'Cantabria', 'País Vasco'].includes(s.region)) return { lat: s.lat - 1, lon: s.lon }
  if (s.region === 'Galicia') return s.lat > 43.2 ? { lat: s.lat - 1, lon: s.lon } : { lat: 42.6, lon: -7.8 }
  if (s.region === 'Cataluña') return { lat: 41.7, lon: 1.0 }
  if (s.region === 'Comunidad Valenciana') return { lat: 39.6, lon: -1.2 }
  if (s.region === 'Murcia') return { lat: 38.3, lon: -1.6 }
  // Andalucía: Atlantic vs Strait vs Mediterranean.
  if (s.lon < -5.9) return { lat: 37.9, lon: -5.0 } // Huelva/Cádiz atlántico
  if (s.lon < -5.2) return { lat: 36.6, lon: -5.5 } // Estrecho
  return { lat: 37.8, lon: -4.2 } // Mediterráneo andaluz
}

export function seawardBearing(s: FishingSpot): number | null {
  if (s.type !== 'mar') return null
  return Math.round(bearing(inlandRef(s), s))
}

export type WindRelation = 'onshore' | 'offshore' | 'cross'

/** Classify wind vs the coast: wind_from within ±60° of seaward = onshore. */
export function windRelation(windFromDeg: number, seawardDeg: number): WindRelation {
  const diff = Math.abs(((windFromDeg - seawardDeg + 540) % 360) - 180)
  // diff is the angle between wind origin and seaward direction, 0..180
  if (diff >= 120) return 'offshore'
  if (diff <= 60) return 'onshore'
  return 'cross'
}

export function windRelationLabel(rel: WindRelation): { label: string; hint: string } {
  switch (rel) {
    case 'onshore':
      return { label: 'Viento de mar (onshore)', hint: 'Empuja comida a la orilla y riza el agua: bueno para depredadores, lances más cortos.' }
    case 'offshore':
      return { label: 'Viento de tierra (offshore)', hint: 'Mar peinado y lances largos, pero menos actividad en la rompiente.' }
    default:
      return { label: 'Viento cruzado', hint: 'Lance incómodo con viento lateral: ajusta el peso del aparejo.' }
  }
}
