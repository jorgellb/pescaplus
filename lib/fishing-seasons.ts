/**
 * Orientative best-months-by-species for Spain. General guidance for planning;
 * the exact open/closed seasons ("vedas") and sizes are set by each autonomous
 * community and must always be checked with the regional authority.
 */
export interface SpeciesSeason {
  name: string
  water: 'dulce' | 'mar'
  /** Best months, 1 = enero … 12 = diciembre. */
  best: number[]
  note: string
  /** Related storefront category for internal linking. */
  category?: string
}

export const SPECIES_SEASONS: SpeciesSeason[] = [
  { name: 'Black bass', water: 'dulce', best: [4, 5, 6, 9, 10], note: 'Muy activo en primavera (freza) y con el descenso térmico de otoño. Señuelos de superficie al amanecer.', category: 'senuelos' },
  { name: 'Lucio', water: 'dulce', best: [10, 11, 12, 1, 2, 3], note: 'Depredador de aguas frías: mejor de otoño a inicios de primavera. Respeta la veda de freza.', category: 'senuelos' },
  { name: 'Lucioperca', water: 'dulce', best: [10, 11, 12, 3, 4], note: 'Caza a media agua en horas de poca luz; vertical y jigging al atardecer.', category: 'senuelos' },
  { name: 'Trucha', water: 'dulce', best: [3, 4, 5, 6, 7], note: 'Temporada típica de primavera a verano (según coto y comunidad). Cucharilla, mosca y vinilo pequeño.', category: 'canas' },
  { name: 'Carpa', water: 'dulce', best: [4, 5, 6, 7, 8, 9], note: 'Máxima actividad con agua templada; cebado y pesca a fondo.', category: 'anzuelos' },
  { name: 'Siluro', water: 'dulce', best: [5, 6, 7, 8, 9, 10], note: 'Gran depredador de aguas cálidas; boyas, clonk y grandes vinilos.', category: 'senuelos' },
  { name: 'Barbo', water: 'dulce', best: [4, 5, 6, 9, 10], note: 'Muy activo en primavera y otoño en ríos; pesca a fondo o a coup.', category: 'anzuelos' },
  { name: 'Lubina', water: 'mar', best: [9, 10, 11, 12, 1, 2], note: 'Mejor con temporales y agua removida de otoño-invierno; spinning en playa y roca.', category: 'canas' },
  { name: 'Dorada', water: 'mar', best: [6, 7, 8, 9, 10], note: 'Aguas templadas de verano-otoño; surfcasting con gusana y cangrejo.', category: 'anzuelos' },
  { name: 'Sargo', water: 'mar', best: [10, 11, 12, 1, 2], note: 'Roca y espigón en otoño-invierno; flotador y fondo ligero.', category: 'anzuelos' },
  { name: 'Corvina', water: 'mar', best: [5, 6, 7, 8, 9], note: 'Activa de noche en desembocaduras y playas en los meses cálidos.', category: 'canas' },
]

export const MONTHS_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
