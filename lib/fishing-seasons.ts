import { SEA_SPECIES, type SpeciesProfile } from '@/lib/fishing-species'
import { FRESHWATER_SPECIES } from '@/lib/freshwater-species'

/**
 * Orientative best-months-by-species for Spain. General guidance for planning;
 * the exact open/closed seasons ("vedas") and sizes are set by each autonomous
 * community and must always be checked with the regional authority.
 */
export interface SpeciesSeason {
  /** Id de la ficha: permite enlazar a /especies/[id] en vez de a la tienda. */
  id: string
  name: string
  water: 'dulce' | 'mar'
  /** Best months, 1 = enero … 12 = diciembre. */
  best: number[]
  note: string
  /** Related storefront category for internal linking. */
  category?: string
}

/**
 * Notas escritas a mano. Se conservan porque dicen POR QUÉ esos meses y no
 * otros, que es lo que aporta el calendario; lo demás se deriva de la ficha.
 */
const NOTAS: Record<string, string> = {
  'black-bass': 'Muy activo en primavera (freza) y con el descenso térmico de otoño. Señuelos de superficie al amanecer.',
  lucio: 'Depredador de aguas frías: mejor de otoño a inicios de primavera. Respeta la veda de freza.',
  lucioperca: 'Caza a media agua en horas de poca luz; vertical y jigging al atardecer.',
  'trucha-comun': 'Temporada típica de primavera a verano (según coto y comunidad). Cucharilla, mosca y vinilo pequeño.',
  carpa: 'Máxima actividad con agua templada; cebado y pesca a fondo.',
  siluro: 'Gran depredador de aguas cálidas; boyas, clonk y grandes vinilos.',
  barbo: 'Muy activo en primavera y otoño en ríos; pesca a fondo o a coup.',
  lubina: 'Mejor con temporales y agua removida de otoño-invierno; spinning en playa y roca.',
  dorada: 'Aguas templadas de verano-otoño; surfcasting con gusana y cangrejo.',
  sargo: 'Roca y espigón en otoño-invierno; flotador y fondo ligero.',
  corvina: 'Activa de noche en desembocaduras y playas en los meses cálidos.',
}

/**
 * El calendario sale de las MISMAS fichas que el resto del sitio.
 *
 * Antes era una lista escrita aparte con 11 especies de las 44 que existen, así
 * que el calendario y la ficha podían decir cosas distintas de la misma especie
 * y nadie se enteraba — el mes bueno de la dorada estaba escrito en dos sitios.
 * Derivándolo, eso no puede volver a pasar: hay una sola fuente de meses.
 *
 * Las notas a mano se respetan donde existen; para el resto se compone una desde
 * la ficha, que dice dónde vive y con qué se pesca.
 */
function desdeFicha(sp: SpeciesProfile, water: 'mar' | 'dulce'): SpeciesSeason {
  return {
    id: sp.id,
    name: sp.name,
    water,
    best: sp.bestMonths,
    note: NOTAS[sp.id] ?? `${sp.tagline}. ${sp.technique}.`,
    category: sp.gearCats[0],
  }
}

export const SPECIES_SEASONS: SpeciesSeason[] = [
  ...SEA_SPECIES.filter((s) => s.id !== 'general').map((s) => desdeFicha(s, 'mar')),
  ...FRESHWATER_SPECIES.map((s) => desdeFicha(s, 'dulce')),
]

export const MONTHS_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
