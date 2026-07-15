/**
 * Sea-fishing species profiles that tune the hourly fishing score to how each
 * species actually feeds (wind, wave, light, pressure). Orientative, based on
 * common Spanish shore/boat angling experience.
 */
export interface SpeciesProfile {
  id: string
  name: string
  emoji: string
  tagline: string
  solunar: number
  dawnDusk: number
  night: number
  windSweet: [number, number]
  windBonus: number
  windStrongAt: number
  wavePref: 'rough' | 'moderate' | 'calm'
  pressureFall: number
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
}

export const SEA_SPECIES: SpeciesProfile[] = [
  { id: 'lubina', name: 'Lubina', emoji: '🐟', tagline: 'Rompiente, viento y poca luz', solunar: 26, dawnDusk: 22, night: 16, windSweet: [10, 35], windBonus: 16, windStrongAt: 55, wavePref: 'rough', pressureFall: 16 },
  { id: 'dorada', name: 'Dorada', emoji: '🐟', tagline: 'Aguas templadas y calmadas', solunar: 28, dawnDusk: 20, night: 8, windSweet: [5, 18], windBonus: 14, windStrongAt: 35, wavePref: 'calm', pressureFall: 12 },
  { id: 'sargo', name: 'Sargo', emoji: '🐟', tagline: 'Roca con algo de marejada', solunar: 26, dawnDusk: 18, night: 6, windSweet: [8, 22], windBonus: 14, windStrongAt: 40, wavePref: 'moderate', pressureFall: 12 },
  { id: 'corvina', name: 'Corvina', emoji: '🐟', tagline: 'Noche y agua removida', solunar: 26, dawnDusk: 20, night: 22, windSweet: [8, 28], windBonus: 14, windStrongAt: 48, wavePref: 'rough', pressureFall: 14 },
  { id: 'denton', name: 'Dentón', emoji: '🐟', tagline: 'Agua clara y corriente, a barco', solunar: 30, dawnDusk: 22, night: 2, windSweet: [5, 20], windBonus: 12, windStrongAt: 35, wavePref: 'calm', pressureFall: 12 },
  { id: 'pelagicos', name: 'Bonito / Lampuga', emoji: '🐟', tagline: 'Pelágicos: día y corriente, a barco', solunar: 24, dawnDusk: 22, night: 0, windSweet: [8, 25], windBonus: 12, windStrongAt: 40, wavePref: 'moderate', pressureFall: 10 },
]

export function getSpecies(id?: string | null): SpeciesProfile {
  return SEA_SPECIES.find((s) => s.id === id) ?? GENERAL
}
