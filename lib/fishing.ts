/**
 * Single source of truth for fishing modalities.
 *
 * Every page, component and API route derives its labels, icons, colours,
 * descriptions and AliExpress search keywords from this module. Keeping this
 * in one place avoids the label/keyword drift that happened when the same data
 * was copy-pasted across the home page, navbar, cards and API routes.
 */

export const FISHING_TYPE_IDS = [
  'anzuelos',
  'lineas',
  'senuelos',
  'canas',
  'carretes',
  'electronica',
  'embarcaciones',
  'minuteria',
  'plomos',
  'herramientas',
  'equipo',
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
    id: 'anzuelos',
    name: 'Anzuelos',
    icon: '🪝',
    description: 'Anzuelos simples, triples y para montajes, de acero de alto carbono.',
    tagline: 'Anzuelos simples, triples y especiales, afilados y resistentes a la corrosión.',
    color: 'from-cyan-500/20 to-blue-500/20',
    keyword: 'fishing hooks',
    featured: true,
  },
  {
    id: 'lineas',
    name: 'Líneas de pesca',
    icon: '🧵',
    description: 'Hilo trenzado, monofilamento y fluorocarbono para cada técnica.',
    tagline: 'Trenzados de baja elasticidad, monofilamento y fluorocarbono invisible.',
    color: 'from-teal-500/20 to-cyan-500/20',
    keyword: 'fishing line braided',
    featured: true,
  },
  {
    id: 'senuelos',
    name: 'Señuelos',
    icon: '🐠',
    description: 'Vinilos, minnows, cucharillas y kits de cebos artificiales.',
    tagline: 'Vinilos, minnows, cucharillas y cebos artificiales para depredadores.',
    color: 'from-emerald-500/20 to-teal-500/20',
    keyword: 'fishing lure bait set',
    featured: true,
  },
  {
    id: 'canas',
    name: 'Cañas de pesca',
    icon: '🎣',
    description: 'Cañas de carbono telescópicas y de tramos para todas las modalidades.',
    tagline: 'Cañas de carbono ligeras, telescópicas y de tramos para cada técnica.',
    color: 'from-blue-500/20 to-indigo-500/20',
    keyword: 'fishing rod carbon',
    featured: true,
  },
  {
    id: 'carretes',
    name: 'Carretes de pesca',
    icon: '🌀',
    description: 'Carretes frontales, de baitcasting y de surfcasting con freno potente.',
    tagline: 'Carretes frontales, baitcasting y de surfcasting anticorrosión.',
    color: 'from-cyan-500/20 to-teal-500/20',
    keyword: 'fishing reel',
    featured: true,
  },
  {
    id: 'electronica',
    name: 'Electrónica',
    icon: '📟',
    description: 'Sondas, buscadores de peces y GPS para localizar la pesca.',
    tagline: 'Sondas, buscadores de peces (fish finders) y GPS de pesca.',
    color: 'from-violet-500/20 to-purple-500/20',
    keyword: 'fish finder sonar',
    featured: false,
  },
  {
    id: 'embarcaciones',
    name: 'Embarcaciones',
    icon: '⛵',
    description: 'Float tubes, kayaks y botes hinchables para pescar desde el agua.',
    tagline: 'Float tubes, kayaks y botes hinchables de pesca.',
    color: 'from-indigo-500/20 to-blue-500/20',
    keyword: 'fishing float tube boat',
    featured: false,
  },
  {
    id: 'minuteria',
    name: 'Minutería',
    icon: '🔗',
    description: 'Emerillones, grapas, perlas y conectores para tus montajes.',
    tagline: 'Emerillones, grapas, perlas, quitavueltas y conectores.',
    color: 'from-amber-500/20 to-orange-500/20',
    keyword: 'fishing swivels snaps connector',
    featured: false,
  },
  {
    id: 'plomos',
    name: 'Plomos',
    icon: '⚫',
    description: 'Plomos de todas las formas y pesos para fondo, surfcasting y más.',
    tagline: 'Plomos de fondo, surfcasting y lastres de todas las formas y pesos.',
    color: 'from-slate-500/20 to-slate-400/20',
    keyword: 'fishing sinker weights',
    featured: false,
  },
  {
    id: 'herramientas',
    name: 'Herramientas',
    icon: '🔧',
    description: 'Alicates, tijeras, desanzuladores y básculas para la orilla.',
    tagline: 'Alicates, tijeras, desanzuladores, básculas y accesorios de mano.',
    color: 'from-rose-500/20 to-amber-500/20',
    keyword: 'fishing pliers tools',
    featured: false,
  },
  {
    id: 'equipo',
    name: 'Equipo de pesca',
    icon: '🎒',
    description: 'Mochilas, cajas, sillas y complementos para tus jornadas.',
    tagline: 'Mochilas, cajas de aparejos, sillas y complementos de pesca.',
    color: 'from-emerald-500/20 to-cyan-500/20',
    keyword: 'fishing tackle bag box',
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

// ---------------------------------------------------------------------------
// Subcategories
// ---------------------------------------------------------------------------

export interface Subcategory {
  id: string
  name: string
}

/**
 * Gear/technique-based subcategories for each main category. Product-facing
 * taxonomy used to filter within a category page. The first entry of each list
 * is the sensible default for products that don't match a more specific rule.
 */
export const SUBCATEGORIES: Record<FishingTypeId, Subcategory[]> = {
  anzuelos: [
    { id: 'simples', name: 'Simples' },
    { id: 'triples', name: 'Triples' },
    { id: 'montaje', name: 'Montajes y carpa' },
    { id: 'especiales', name: 'Especiales' },
  ],
  lineas: [
    { id: 'trenzado', name: 'Trenzado' },
    { id: 'monofilamento', name: 'Monofilamento' },
    { id: 'fluorocarbono', name: 'Fluorocarbono' },
  ],
  senuelos: [
    { id: 'vinilos', name: 'Vinilos y cebos blandos' },
    { id: 'duros', name: 'Duros (minnow y crank)' },
    { id: 'cucharillas', name: 'Cucharillas y jigs' },
    { id: 'superficie', name: 'Superficie y otros' },
  ],
  canas: [
    { id: 'spinning', name: 'Spinning' },
    { id: 'mar', name: 'Mar y surfcasting' },
    { id: 'telescopicas', name: 'Telescópicas' },
    { id: 'baitcasting', name: 'Baitcasting y otras' },
  ],
  carretes: [
    { id: 'spinning', name: 'Spinning / frontales' },
    { id: 'baitcasting', name: 'Baitcasting' },
    { id: 'mar', name: 'Surfcasting y mar' },
  ],
  electronica: [
    { id: 'sondas', name: 'Sondas y GPS' },
    { id: 'camaras', name: 'Cámaras' },
    { id: 'accesorios', name: 'Accesorios electrónicos' },
  ],
  embarcaciones: [
    { id: 'floattube', name: 'Float tubes' },
    { id: 'kayaks', name: 'Kayaks y botes' },
    { id: 'accesorios', name: 'Accesorios náuticos' },
  ],
  minuteria: [
    { id: 'emerillones', name: 'Emerillones y giratorios' },
    { id: 'conectores', name: 'Grapas y conectores' },
    { id: 'montaje', name: 'Perlas, gomas y montaje' },
    { id: 'kits', name: 'Kits de montaje' },
  ],
  plomos: [
    { id: 'fondo', name: 'Fondo y surfcasting' },
    { id: 'jig', name: 'Jigs y lastres' },
    { id: 'especiales', name: 'Especiales' },
  ],
  herramientas: [
    { id: 'alicates', name: 'Alicates y pinzas' },
    { id: 'corte', name: 'Tijeras y cortahilos' },
    { id: 'otras', name: 'Medición y otras' },
  ],
  equipo: [
    { id: 'almacenaje', name: 'Cajas y bolsas' },
    { id: 'vestuario', name: 'Guantes y ropa' },
    { id: 'accesorios', name: 'Accesorios varios' },
  ],
}

/** Subcategories for a category id (empty array for unknown categories). */
export function getSubcategories(categoryId: string): Subcategory[] {
  return isFishingTypeId(categoryId) ? SUBCATEGORIES[categoryId] : []
}

/** Whether `subId` is a valid subcategory of `categoryId`. */
export function isValidSubcategory(categoryId: string, subId: string): boolean {
  return getSubcategories(categoryId).some((s) => s.id === subId)
}

/** Human-readable subcategory name, or '' if unknown. */
export function subcategoryLabel(categoryId: string, subId: string): string {
  return getSubcategories(categoryId).find((s) => s.id === subId)?.name ?? ''
}
