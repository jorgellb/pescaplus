/**
 * Single source of truth for fishing modalities.
 *
 * Every page, component and API route derives its labels, icons, colours,
 * descriptions and AliExpress search keywords from this module. Keeping this
 * in one place avoids the label/keyword drift that happened when the same data
 * was copy-pasted across the home page, navbar, cards and API routes.
 */

export const FISHING_TYPE_IDS = [
  'spinning',
  'flyfishing',
  'carp',
  'sea',
  'baitcasting',
  'accessories',
] as const

export type FishingTypeId = (typeof FISHING_TYPE_IDS)[number]

export interface FishingType {
  id: FishingTypeId
  /** Display name, e.g. "Fly Fishing" */
  name: string
  /** Emoji used as the modality glyph */
  icon: string
  /** Marketing copy shown on the home page cards */
  description: string
  /** One-line summary shown in the category header */
  tagline: string
  /** Tailwind gradient fragment used for accent glows */
  color: string
  /** Keyword used when querying the AliExpress affiliate API */
  keyword: string
  /** Whether the modality is surfaced in the main navigation */
  featured: boolean
}

export const FISHING_TYPES: readonly FishingType[] = [
  {
    id: 'spinning',
    name: 'Spinning',
    icon: '🎣',
    description:
      'Pesca deportiva dinámica usando señuelos artificiales. Cañas sensibles y recogidas activas.',
    tagline: 'Cañas ligeras, carretes veloces y señuelos artificiales activos.',
    color: 'from-blue-500/20 to-cyan-500/20',
    keyword: 'spinning fishing rod reel',
    featured: true,
  },
  {
    id: 'flyfishing',
    name: 'Fly Fishing',
    icon: '🪰',
    description:
      'Pesca con mosca artificial. Todo sobre el arte del lanzado y derivas naturales.',
    tagline: 'El arte de la pesca a látigo: moscas, líneas pesadas y ninfas.',
    color: 'from-emerald-500/20 to-teal-500/20',
    keyword: 'fly fishing rod reel set',
    featured: true,
  },
  {
    id: 'carp',
    name: 'Carp Fishing',
    icon: '🐟',
    description:
      'Pesca de grandes carpas con boiles, montajes hair rig y sistemas de alarma.',
    tagline: 'Material pesado, alarmas electrónicas y montajes de fondear.',
    color: 'from-amber-500/20 to-orange-500/20',
    keyword: 'carp fishing gear accessories',
    featured: true,
  },
  {
    id: 'sea',
    name: 'Sea Fishing',
    icon: '🌊',
    description:
      'Surfcasting, rockfishing o pesca desde embarcación. Equipos resistentes a la salinidad.',
    tagline: 'Aparejos reforzados anticorrosión para surfcasting y pesca costera.',
    color: 'from-indigo-500/20 to-blue-500/20',
    keyword: 'sea fishing rod reel',
    featured: true,
  },
  {
    id: 'baitcasting',
    name: 'Baitcasting',
    icon: '🎯',
    description:
      'Técnica de precisión para lances quirúrgicos con carrete de tambor giratorio.',
    tagline: 'Carretes de bobina giratoria para lanzamientos rápidos y precisos.',
    color: 'from-violet-500/20 to-purple-500/20',
    keyword: 'baitcasting reel fishing',
    featured: false,
  },
  {
    id: 'accessories',
    name: 'Accesorios',
    icon: '🧰',
    description:
      'Alicates, básculas, mochilas y complementos tácticos para cualquier modalidad.',
    tagline: 'Alicates de corte, básculas de precisión, bolsas y complementos tácticos.',
    color: 'from-slate-500/20 to-cyan-500/20',
    keyword: 'fishing accessories tackle',
    featured: false,
  },
]

const FISHING_TYPE_MAP = new Map<string, FishingType>(
  FISHING_TYPES.map((type) => [type.id, type]),
)

/** Modalities shown in the primary navigation / footer. */
export const FEATURED_FISHING_TYPES = FISHING_TYPES.filter((t) => t.featured)

export function isFishingTypeId(value: string): value is FishingTypeId {
  return FISHING_TYPE_MAP.has(value)
}

export function getFishingType(id: string): FishingType | undefined {
  return FISHING_TYPE_MAP.get(id)
}

/** Human-readable label with a safe fallback for unknown ids ("general"). */
export function fishingLabel(id: string): string {
  return FISHING_TYPE_MAP.get(id)?.name ?? (id === 'general' ? 'General' : id)
}

/** AliExpress search keyword for a modality, with a generic fallback. */
export function fishingKeyword(id: string): string {
  return FISHING_TYPE_MAP.get(id)?.keyword ?? 'fishing gear'
}
