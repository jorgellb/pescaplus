import { nearestSpots, type FishingSpot } from '@/lib/fishing-spots'
import { SEA_SPECIES, SPECIES_KNOWN_TERMS, MONTHS_SHORT } from '@/lib/fishing-species'
import { SPECIES_SEASONS } from '@/lib/fishing-seasons'
import { seawardBearing } from '@/lib/coast'

/**
 * The unique fact sheet for a zone that feeds the local-guide generator. Every
 * fact is derived from our own data (coordinates, coast orientation, sea,
 * tidal regime, known species with their real seasons, neighbours) so the
 * writer model has something DISTINCT to anchor each of the 195 guides on.
 */
export interface ZoneFacts {
  name: string
  region: string
  waterType: 'mar' | 'interior'
  sea: string
  orientation: string | null
  tides: string
  knownFor: string
  speciesLines: string[]
  neighbors: string[]
}

const COMPASS_WORDS: Record<string, string> = {
  N: 'norte', NNE: 'norte-nordeste', NE: 'nordeste', ENE: 'este-nordeste',
  E: 'este', ESE: 'este-sudeste', SE: 'sudeste', SSE: 'sur-sudeste',
  S: 'sur', SSO: 'sur-sudoeste', SO: 'sudoeste', OSO: 'oeste-sudoeste',
  O: 'oeste', ONO: 'oeste-noroeste', NO: 'noroeste', NNO: 'norte-noroeste',
}
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO']

export function seaName(s: FishingSpot): string {
  if (s.type === 'interior') return 'aguas interiores'
  if (s.region === 'Canarias') return 'océano Atlántico (aguas canarias)'
  if (['Asturias', 'Cantabria', 'País Vasco'].includes(s.region)) return 'mar Cantábrico'
  if (s.region === 'Galicia') return s.lat > 43.2 ? 'mar Cantábrico' : 'océano Atlántico (rías gallegas)'
  if (s.region === 'Andalucía' && s.lon < -5.9) return 'océano Atlántico (golfo de Cádiz)'
  if (s.lon >= -5.9 && s.lon < -5.1 && s.lat < 36.4) return 'estrecho de Gibraltar'
  if (s.region === 'Ceuta') return 'estrecho de Gibraltar'
  if (s.region === 'Melilla') return 'mar de Alborán'
  if (s.region === 'Andalucía') return 'mar de Alborán (Mediterráneo)'
  return 'mar Mediterráneo'
}

function tideRegime(sea: string): string {
  if (sea.includes('Atlántico') || sea.includes('Cantábrico') || sea.includes('Gibraltar'))
    return 'mareas amplias que mandan en la pesca (pleamares y bajamares muy marcadas)'
  if (sea === 'aguas interiores') return 'sin mareas; mandan el nivel del embalse y la presión'
  return 'marea de escaso recorrido: pesan más el viento, la corriente y la luz'
}

function monthsLabel(months: number[]): string {
  if (months.length >= 11) return 'todo el año'
  const sorted = [...months]
  // Find best contiguous run (wrapping) for a compact "sep–mar" label.
  const set = new Set(sorted)
  let start = sorted[0]
  for (const m of sorted) {
    const prev = ((m + 10) % 12) + 1
    if (!set.has(prev)) start = m
  }
  let end = start
  while (set.has((end % 12) + 1) && end !== ((start + 10) % 12) + 1) end = (end % 12) + 1
  return `${MONTHS_SHORT[start - 1].toLowerCase()}–${MONTHS_SHORT[end - 1].toLowerCase()}`
}

export function buildZoneFacts(s: FishingSpot): ZoneFacts {
  const sea = seaName(s)
  const bearing = seawardBearing(s)
  const orientation = bearing != null ? COMPASS_WORDS[COMPASS[Math.round(bearing / 22.5) % 16]] : null

  const speciesLines: string[] = []
  if (s.type === 'mar') {
    const known = s.known.toLowerCase()
    for (const sp of SEA_SPECIES) {
      const terms = SPECIES_KNOWN_TERMS[sp.id] ?? [sp.name.toLowerCase()]
      if (terms.some((t) => known.includes(t))) {
        speciesLines.push(`${sp.name} (${monthsLabel(sp.bestMonths)}; ${sp.technique.toLowerCase()})`)
      }
    }
    // Always give the writer 2 staple species of that sea as secondary targets.
    if (speciesLines.length < 3) {
      const staples = sea.includes('Cantábrico') || sea.includes('rías')
        ? ['lubina', 'sargo', 'calamares']
        : sea.includes('golfo de Cádiz') || sea.includes('Gibraltar')
          ? ['dorada', 'corvina', 'lubina']
          : ['dorada', 'sargo', 'calamares']
      for (const id of staples) {
        const sp = SEA_SPECIES.find((x) => x.id === id)!
        const line = `${sp.name} (${monthsLabel(sp.bestMonths)}; ${sp.technique.toLowerCase()})`
        if (!speciesLines.includes(line)) speciesLines.push(line)
        if (speciesLines.length >= 4) break
      }
    }
  } else {
    const known = s.known.toLowerCase()
    for (const sp of SPECIES_SEASONS.filter((x) => x.water === 'dulce')) {
      if (known.includes(sp.name.toLowerCase().split(' ')[0])) {
        speciesLines.push(`${sp.name} (${monthsLabel(sp.best)}; ${sp.note.toLowerCase()})`)
      }
    }
  }

  return {
    name: s.name,
    region: s.region,
    waterType: s.type,
    sea,
    orientation,
    tides: tideRegime(sea),
    knownFor: s.known,
    speciesLines: speciesLines.slice(0, 5),
    neighbors: nearestSpots(s, 2).map((n) => n.name),
  }
}
