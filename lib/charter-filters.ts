import { TECHNIQUES, TARGET_SPECIES, FISHING_AREAS, resolveOptions } from '@/lib/charter-options'
import { getSpot } from '@/lib/fishing-spots'

/**
 * Charter search filters. Parsed from the URL so a filtered view is
 * shareable and back-button friendly, validated against the same catalogues the
 * listings are built from (an unknown technique is dropped, never queried).
 *
 * `matches()` is the single source of truth for "does this charter qualify":
 * the DB query and the in-memory fallback both defer to it, so results can't
 * diverge between backends.
 */
export interface CharterFilter {
  spotSlug: string
  fromISO: string
  untilISO: string
  techniques: string[]
  species: string[]
  areas: string[]
  tripType: '' | 'privada' | 'compartida'
  maxPrice: number | null
  /** Free text over title, boat and operator name. */
  q: string
}

export const EMPTY_FILTER: CharterFilter = {
  spotSlug: '', fromISO: '', untilISO: '', techniques: [], species: [], areas: [],
  tripType: '', maxPrice: null, q: '',
}

const ISO = /^\d{4}-\d{2}-\d{2}$/

function pickMany(value: string | string[] | undefined, valid: Set<string>): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  return [...new Set(raw.map((v) => v.trim()).filter((v) => valid.has(v)))].slice(0, 12)
}

/** Read the filter out of Next's searchParams (all values optional). */
export function parseCharterFilter(sp: Record<string, string | string[] | undefined>): CharterFilter {
  const one = (k: string): string => {
    const v = sp[k]
    return (Array.isArray(v) ? v[0] : v ?? '').trim()
  }
  const spotSlug = one('zona')
  const maxPriceRaw = Number(one('precio'))
  const tipo = one('tipo')

  return {
    spotSlug: getSpot(spotSlug) ? spotSlug : '',
    fromISO: ISO.test(one('desde')) ? one('desde') : '',
    untilISO: ISO.test(one('hasta')) ? one('hasta') : '',
    techniques: pickMany(sp['tecnica'], new Set(TECHNIQUES.map((t) => t.id))),
    species: pickMany(sp['especie'], new Set(TARGET_SPECIES.map((t) => t.id))),
    areas: pickMany(sp['zonapesca'], new Set(FISHING_AREAS.map((t) => t.id))),
    tripType: tipo === 'privada' || tipo === 'compartida' ? tipo : '',
    maxPrice: Number.isFinite(maxPriceRaw) && maxPriceRaw > 0 ? Math.min(5000, Math.round(maxPriceRaw)) : null,
    q: one('q').slice(0, 80),
  }
}

/** True when any filter is actually narrowing the results. */
export function isFiltered(f: CharterFilter): boolean {
  return !!(f.spotSlug || f.fromISO || f.untilISO || f.tripType || f.maxPrice || f.q
    || f.techniques.length || f.species.length || f.areas.length)
}

/** Rebuild a query string, dropping empties so URLs stay clean. */
export function filterToQuery(f: CharterFilter): string {
  const p = new URLSearchParams()
  if (f.spotSlug) p.set('zona', f.spotSlug)
  if (f.fromISO) p.set('desde', f.fromISO)
  if (f.untilISO) p.set('hasta', f.untilISO)
  if (f.techniques.length) p.set('tecnica', f.techniques.join(','))
  if (f.species.length) p.set('especie', f.species.join(','))
  if (f.areas.length) p.set('zonapesca', f.areas.join(','))
  if (f.tripType) p.set('tipo', f.tripType)
  if (f.maxPrice) p.set('precio', String(f.maxPrice))
  if (f.q) p.set('q', f.q)
  const s = p.toString()
  return s ? `?${s}` : ''
}

/** The shape `matches` needs — a subset of Charter, so tests stay light. */
export interface FilterableCharter {
  spotSlug: string
  dateISO: string
  pricePerPerson: number
  tripType: string
  techniques: string[]
  species: string[]
  areas: string[]
  highlights: string
  operator: { name: string; businessName: string; boatName: string } | null
}

function hasAny(have: string[], wanted: string[]): boolean {
  return wanted.length === 0 || wanted.some((w) => have.includes(w))
}

export function matches(c: FilterableCharter, f: CharterFilter): boolean {
  if (f.spotSlug && c.spotSlug !== f.spotSlug) return false
  if (f.fromISO && c.dateISO < f.fromISO) return false
  if (f.untilISO && c.dateISO > f.untilISO) return false
  if (f.tripType && c.tripType !== f.tripType) return false
  if (f.maxPrice != null && c.pricePerPerson > f.maxPrice) return false
  if (!hasAny(c.techniques, f.techniques)) return false
  if (!hasAny(c.species, f.species)) return false
  if (!hasAny(c.areas, f.areas)) return false
  if (f.q) {
    const hay = [c.highlights, c.operator?.businessName, c.operator?.name, c.operator?.boatName]
      .filter(Boolean).join(' ').toLowerCase()
    // Acentos aparte: quien busca "atun" debe encontrar "atún".
    if (!fold(hay).includes(fold(f.q))) return false
  }
  return true
}

/** Lowercase and strip diacritics for accent-insensitive matching. */
export function fold(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Short human summary of the active filters, for the results heading. */
export function describeFilter(f: CharterFilter): string {
  const bits: string[] = []
  if (f.spotSlug) bits.push(getSpot(f.spotSlug)?.name ?? f.spotSlug)
  if (f.tripType) bits.push(f.tripType === 'privada' ? 'privadas' : 'compartidas')
  const t = resolveOptions(TECHNIQUES, f.techniques).map((o) => o.label.toLowerCase())
  const s = resolveOptions(TARGET_SPECIES, f.species).map((o) => o.label.toLowerCase())
  if (t.length) bits.push(t.join(' o '))
  if (s.length) bits.push(`a por ${s.join(' o ')}`)
  if (f.maxPrice) bits.push(`hasta ${f.maxPrice} €`)
  if (f.q) bits.push(`«${f.q}»`)
  return bits.join(' · ')
}
