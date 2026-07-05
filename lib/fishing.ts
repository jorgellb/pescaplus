/**
 * Single source of truth for fishing modalities.
 *
 * Every page, component and API route derives its labels, icons, colours,
 * descriptions and AliExpress search keywords from this module. Keeping this
 * in one place avoids the label/keyword drift that happened when the same data
 * was copy-pasted across the home page, navbar, cards and API routes.
 */

export const FISHING_TYPE_IDS = [
  'canas',
  'carretes',
  'senuelos',
  'spinning',
  'carpfishing',
  'mar',
  'accesorios',
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
    id: 'canas',
    name: 'Cañas',
    icon: '🎣',
    description:
      'Cañas de carbono para spinning, surfcasting, carpa y todas las modalidades.',
    tagline: 'Cañas de carbono ligeras, telescópicas y de tramos para cada técnica.',
    color: 'from-blue-500/20 to-cyan-500/20',
    keyword: 'fishing rod carbon',
    featured: true,
  },
  {
    id: 'carretes',
    name: 'Carretes',
    icon: '🌀',
    description:
      'Carretes frontales, de baitcasting y de surfcasting con freno potente.',
    tagline: 'Carretes frontales, baitcasting y de surfcasting anticorrosión.',
    color: 'from-cyan-500/20 to-teal-500/20',
    keyword: 'fishing reel spinning',
    featured: true,
  },
  {
    id: 'senuelos',
    name: 'Señuelos',
    icon: '🐠',
    description:
      'Vinilos, minnows, cucharillas y kits de cebos artificiales para depredadores.',
    tagline: 'Vinilos, minnows, cucharillas y cebos artificiales.',
    color: 'from-emerald-500/20 to-teal-500/20',
    keyword: 'fishing lure bait set',
    featured: true,
  },
  {
    id: 'spinning',
    name: 'Spinning',
    icon: '🎯',
    description:
      'Equipos de lanzado de señuelos: combos de caña y carrete ligeros y sensibles.',
    tagline: 'Cañas y carretes ligeros para el lanzado de señuelos artificiales.',
    color: 'from-violet-500/20 to-purple-500/20',
    keyword: 'spinning fishing rod reel combo',
    featured: true,
  },
  {
    id: 'carpfishing',
    name: 'Carpfishing',
    icon: '🐟',
    description:
      'Pesca de grandes carpas: alarmas, cañas potentes, montajes hair rig y cebado.',
    tagline: 'Alarmas, cañas de carpa, montajes y sistemas de cebado.',
    color: 'from-amber-500/20 to-orange-500/20',
    keyword: 'carp fishing gear',
    featured: true,
  },
  {
    id: 'mar',
    name: 'Mar',
    icon: '🌊',
    description:
      'Surfcasting y pesca costera con equipos reforzados resistentes a la salinidad.',
    tagline: 'Aparejos anticorrosión para surfcasting y pesca costera.',
    color: 'from-indigo-500/20 to-blue-500/20',
    keyword: 'sea fishing surfcasting saltwater',
    featured: true,
  },
  {
    id: 'accesorios',
    name: 'Accesorios',
    icon: '🧰',
    description:
      'Alicates, básculas, cajas, mochilas y complementos tácticos para cualquier salida.',
    tagline: 'Alicates, básculas de precisión, cajas, mochilas y complementos.',
    color: 'from-slate-500/20 to-cyan-500/20',
    keyword: 'fishing accessories tackle tools',
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
