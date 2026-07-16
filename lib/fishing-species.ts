/**
 * Sea-fishing species: scoring profiles (how each species feeds — used by the
 * hourly forecast) plus rich fact-sheet data for the /especies pages and the
 * "Qué buscar hoy" recommender. All angling guidance is orientative; legal
 * minimum sizes vary by regulation and must be checked at the official source.
 */
export interface SpeciesProfile {
  id: string
  name: string
  emoji: string
  tagline: string
  // -- hourly scoring (activity) --
  solunar: number
  dawnDusk: number
  night: number
  windSweet: [number, number]
  windBonus: number
  windStrongAt: number
  wavePref: 'rough' | 'moderate' | 'calm'
  pressureFall: number
  // -- fact sheet / recommender --
  bestMonths: number[] // 1..12
  seaTempC: [number, number] // comfortable feeding range
  habitat: string
  depth: string
  hours: string
  technique: string
  baits: string
  /** Orientative reference size — the legal one is set by regulation. */
  minSizeNote: string
  gearCats: string[]
}

export const GENERAL: SpeciesProfile = {
  id: 'general',
  name: 'General',
  emoji: '🎣',
  tagline: 'Puntuación general para cualquier especie',
  solunar: 30,
  dawnDusk: 18,
  night: 4,
  windSweet: [8, 25],
  windBonus: 14,
  windStrongAt: 45,
  wavePref: 'moderate',
  pressureFall: 14,
  bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  seaTempC: [10, 28],
  habitat: '—',
  depth: '—',
  hours: '—',
  technique: '—',
  baits: '—',
  minSizeNote: '—',
  gearCats: ['canas', 'carretes'],
}

export const SEA_SPECIES: SpeciesProfile[] = [
  {
    id: 'lubina',
    name: 'Lubina',
    emoji: '🐟',
    tagline: 'Rompiente, viento y poca luz',
    solunar: 26, dawnDusk: 22, night: 16, windSweet: [10, 35], windBonus: 16, windStrongAt: 55, wavePref: 'rough', pressureFall: 16,
    bestMonths: [9, 10, 11, 12, 1, 2, 3],
    seaTempC: [11, 20],
    habitat: 'Rompientes, espigones, desembocaduras y playas batidas',
    depth: '0–10 m, muy pegada a la orilla con mar movida',
    hours: 'Amanecer, atardecer y noche; con temporal, también de día',
    technique: 'Spinning con paseantes y jerkbaits; surfcasting nocturno',
    baits: 'Gusana, cangrejo y lanzón; señuelos de 9–14 cm',
    minSizeNote: '≈36 cm (orientativa; confirma la normativa vigente)',
    gearCats: ['senuelos', 'canas', 'carretes'],
  },
  {
    id: 'dorada',
    name: 'Dorada',
    emoji: '🐟',
    tagline: 'Aguas templadas y calmadas',
    solunar: 28, dawnDusk: 20, night: 8, windSweet: [5, 18], windBonus: 14, windStrongAt: 35, wavePref: 'calm', pressureFall: 12,
    bestMonths: [5, 6, 7, 8, 9, 10],
    seaTempC: [16, 26],
    habitat: 'Arenales, esteros y bajos rocosos con arena',
    depth: '2–15 m; entra a comer a la orilla con la subiente',
    hours: 'Primeras horas del día y cambio de marea',
    technique: 'Surfcasting a fondo con bajos finos; currican ligero',
    baits: 'Gusana americana, cangrejo ermitaño, mejillón, tita',
    minSizeNote: '≈20 cm (orientativa; confirma la normativa vigente)',
    gearCats: ['anzuelos', 'canas', 'plomos'],
  },
  {
    id: 'sargo',
    name: 'Sargo',
    emoji: '🐟',
    tagline: 'Roca con algo de marejada',
    solunar: 26, dawnDusk: 18, night: 6, windSweet: [8, 22], windBonus: 14, windStrongAt: 40, wavePref: 'moderate', pressureFall: 12,
    bestMonths: [10, 11, 12, 1, 2, 3],
    seaTempC: [12, 19],
    habitat: 'Roca batida, espigones y bocanas de puerto',
    depth: '1–8 m, en la espuma de la rompiente',
    hours: 'De día con mar movida; mejor con marea subiendo',
    technique: 'Corcheo/flotador y pesca a fondo ligera entre rocas',
    baits: 'Camarón, mejillón, erizo, gusana de roca',
    minSizeNote: '≈15 cm (orientativa; confirma la normativa vigente)',
    gearCats: ['anzuelos', 'lineas', 'canas'],
  },
  {
    id: 'corvina',
    name: 'Corvina',
    emoji: '🐟',
    tagline: 'Noche y agua removida',
    solunar: 26, dawnDusk: 20, night: 22, windSweet: [8, 28], windBonus: 14, windStrongAt: 48, wavePref: 'rough', pressureFall: 14,
    bestMonths: [5, 6, 7, 8, 9],
    seaTempC: [18, 26],
    habitat: 'Desembocaduras, esteros y playas profundas',
    depth: '2–12 m, cazando en agua turbia',
    hours: 'Noche cerrada, especialmente sin luna',
    technique: 'Surfcasting nocturno; spinning con vinilos grandes',
    baits: 'Sardina, cangrejo, vinilos XL y paseantes lentos',
    minSizeNote: '≈45 cm (orientativa; confirma la normativa vigente)',
    gearCats: ['canas', 'senuelos', 'plomos'],
  },
  {
    id: 'denton',
    name: 'Dentón',
    emoji: '🐟',
    tagline: 'Agua clara y corriente, a barco',
    solunar: 30, dawnDusk: 22, night: 2, windSweet: [5, 20], windBonus: 12, windStrongAt: 35, wavePref: 'calm', pressureFall: 12,
    bestMonths: [4, 5, 6, 9, 10, 11],
    seaTempC: [15, 24],
    habitat: 'Bajos rocosos, caídas y veriles desde embarcación',
    depth: '10–50 m sobre piedra',
    hours: 'Amanecer y horas de corriente',
    technique: 'Curricán con vivo, jigging medio-pesado',
    baits: 'Calamar y caballa viva; jigs de 100–200 g',
    minSizeNote: '≈35 cm (orientativa; confirma la normativa vigente)',
    gearCats: ['senuelos', 'carretes', 'lineas'],
  },
  {
    id: 'pelagicos',
    name: 'Bonito / Lampuga',
    emoji: '🐟',
    tagline: 'Pelágicos: día y corriente, a barco',
    solunar: 24, dawnDusk: 22, night: 0, windSweet: [8, 25], windBonus: 12, windStrongAt: 40, wavePref: 'moderate', pressureFall: 10,
    bestMonths: [6, 7, 8, 9, 10],
    seaTempC: [19, 27],
    habitat: 'Aguas abiertas, líneas de corriente y objetos flotantes',
    depth: '0–30 m, cazando en superficie',
    hours: 'Pleno día, con comidas visibles en superficie',
    technique: 'Curricán costero, spinning a comidas con lanzados largos',
    baits: 'Plumillas, jets, poppers y jigs lanzables',
    minSizeNote: 'Según especie (orientativa; confirma la normativa vigente)',
    gearCats: ['senuelos', 'carretes', 'canas'],
  },
]

export function getSpecies(id?: string | null): SpeciesProfile {
  return SEA_SPECIES.find((s) => s.id === id) ?? GENERAL
}

export const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
