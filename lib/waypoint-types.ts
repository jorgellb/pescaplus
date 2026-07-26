/**
 * Tipos y catálogo de marcas, SIN dependencias de servidor.
 *
 * Vive aparte del store a propósito: la carta es un componente de cliente y
 * necesita el catálogo de tipos, pero el store importa la capa de base de
 * datos. Importarlo desde el navegador arrastraba Prisma al bundle — el build
 * lo detectó. Aquí no hay nada que no pueda cruzar esa frontera.
 */
export type WaypointType = 'caladero' | 'bajo' | 'naufragio' | 'boya' | 'rampa' | 'peligro' | 'otro'
export type Visibility = 'private' | 'public'

export const WAYPOINT_TYPES: { id: WaypointType; label: string; emoji: string }[] = [
  { id: 'caladero', label: 'Caladero', emoji: '🎣' },
  { id: 'bajo', label: 'Bajo / roca', emoji: '⛰️' },
  { id: 'naufragio', label: 'Naufragio', emoji: '🚢' },
  { id: 'boya', label: 'Boya', emoji: '🛟' },
  { id: 'rampa', label: 'Rampa / varadero', emoji: '🛥️' },
  { id: 'peligro', label: 'Peligro', emoji: '⚠️' },
  { id: 'otro', label: 'Otro', emoji: '📍' },
]

export interface Waypoint {
  id: string
  userId: string
  name: string
  type: WaypointType
  lat: number
  lon: number
  depthM: number | null
  notes: string
  visibility: Visibility
  createdAt: number
  updatedAt: number
}

export interface WaypointInput {
  name: string
  type?: string
  lat: number
  lon: number
  depthM?: number | null
  notes?: string
  visibility?: string
}
