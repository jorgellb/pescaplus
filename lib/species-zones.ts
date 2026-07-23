import { FISHING_SPOTS, getSpot, type FishingSpot } from '@/lib/fishing-spots'
import { SEA_SPECIES, SPECIES_KNOWN_TERMS, type SpeciesProfile } from '@/lib/fishing-species'
import { seaName } from '@/lib/zone-facts'

/**
 * Species × zone relevance — the honest basis for the "pescar {especie} en
 * {zona}" landing mesh. A species belongs to a zone if the zone's own blurb
 * names it (strong signal) OR it's a genuine reference species of that zone's
 * sea. We never invent presence: the staple lists below are conservative and
 * only include species actually caught along each coast.
 */

type SeaBucket = 'cantabrico' | 'rias' | 'cadiz' | 'gibraltar' | 'alboran' | 'mediterraneo' | 'canarias'

function seaBucket(spot: FishingSpot): SeaBucket | null {
  const sea = seaName(spot)
  if (sea.includes('canarias')) return 'canarias'
  if (sea.includes('Cantábrico')) return 'cantabrico'
  if (sea.includes('rías')) return 'rias'
  if (sea.includes('golfo de Cádiz')) return 'cadiz'
  if (sea.includes('Gibraltar')) return 'gibraltar'
  if (sea.includes('Alborán')) return 'alboran'
  if (sea.includes('Mediterráneo')) return 'mediterraneo'
  return null // aguas interiores → no sea-species landing pages
}

/** Reference species genuinely present along each coast (conservative). */
const SEA_STAPLES: Record<SeaBucket, string[]> = {
  cantabrico: ['lubina', 'sargo', 'calamares', 'jurel', 'caballa', 'congrio', 'pulpo'],
  rias: ['lubina', 'sargo', 'calamares', 'sepia', 'jurel', 'congrio', 'pulpo', 'lenguado'],
  cadiz: ['dorada', 'lubina', 'corvina', 'sargo', 'herrera', 'lenguado', 'pulpo', 'sepia'],
  gibraltar: ['atun', 'lechas', 'sargo', 'dorada', 'pargos', 'denton', 'pulpo', 'espeton'],
  alboran: ['dorada', 'sargo', 'lubina', 'sepia', 'calamares', 'jurel', 'pulpo', 'espeton'],
  mediterraneo: ['dorada', 'sargo', 'lubina', 'calamares', 'sepia', 'jurel', 'pulpo', 'espeton'],
  canarias: ['sargo', 'meros', 'pargos', 'brecas', 'lechas', 'pulpo'],
}

const MAX_PER_ZONE = 6

function knownSpecies(spot: FishingSpot): SpeciesProfile[] {
  const known = spot.known.toLowerCase()
  return SEA_SPECIES.filter((sp) =>
    (SPECIES_KNOWN_TERMS[sp.id] ?? [sp.name.toLowerCase()]).some((t) => known.includes(t)),
  )
}

/** The species that legitimately anchor landing pages for a coastal zone. */
export function speciesForZone(spot: FishingSpot): SpeciesProfile[] {
  if (spot.type !== 'mar') return []
  const bucket = seaBucket(spot)
  if (!bucket) return []
  const byId = new Map<string, SpeciesProfile>()
  for (const sp of knownSpecies(spot)) byId.set(sp.id, sp) // known first (best signal)
  for (const id of SEA_STAPLES[bucket]) {
    if (byId.size >= MAX_PER_ZONE) break
    const sp = SEA_SPECIES.find((x) => x.id === id)
    if (sp && !byId.has(id)) byId.set(id, sp)
  }
  return [...byId.values()].slice(0, MAX_PER_ZONE)
}

/** Whether this species genuinely belongs to this zone (page should exist). */
export function isSpeciesZone(speciesId: string, zoneSlug: string): boolean {
  const spot = getSpot(zoneSlug)
  return spot ? speciesForZone(spot).some((sp) => sp.id === speciesId) : false
}

/** Every coastal zone where a species is a target — for the species page and
 * for "otras zonas" interlinking. Nearest first when an origin is given. */
export function zonesForSpecies(speciesId: string, near?: FishingSpot, limit?: number): FishingSpot[] {
  const zones = FISHING_SPOTS.filter((s) => s.type === 'mar' && speciesForZone(s).some((sp) => sp.id === speciesId))
  if (near) {
    const km = (s: FishingSpot) => {
      const r = Math.PI / 180
      const a =
        Math.sin(((s.lat - near.lat) * r) / 2) ** 2 +
        Math.cos(near.lat * r) * Math.cos(s.lat * r) * Math.sin(((s.lon - near.lon) * r) / 2) ** 2
      return 2 * 6371 * Math.asin(Math.sqrt(a))
    }
    zones.sort((a, b) => km(a) - km(b))
  }
  return limit ? zones.slice(0, limit) : zones
}

/** All valid (speciesId, zoneSlug) pairs — for sitemap and static params. */
export function allSpeciesZonePairs(): { especie: string; zona: string }[] {
  const out: { especie: string; zona: string }[] = []
  for (const spot of FISHING_SPOTS) {
    for (const sp of speciesForZone(spot)) out.push({ especie: sp.id, zona: spot.slug })
  }
  return out
}
