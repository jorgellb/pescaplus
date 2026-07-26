/**
 * Tipos y constantes de los puntos náuticos, SIN nada de servidor.
 *
 * Vive aparte porque la carta es un componente de cliente: importar desde
 * `nautical-pois.ts` le metía Prisma y `pg` en el paquete del navegador y el
 * build se caía con "Can't resolve 'dns'". Es la misma separación que se hizo
 * en su día para los waypoints, por la misma razón.
 */
export type PoiKind = 'rampa' | 'puerto' | 'pecio'

export const POI_KINDS: { id: PoiKind; label: string; plural: string; emoji: string }[] = [
  { id: 'rampa', label: 'Rampa de varada', plural: 'Rampas', emoji: '🛞' },
  { id: 'puerto', label: 'Puerto', plural: 'Puertos', emoji: '⚓' },
  { id: 'pecio', label: 'Pecio', plural: 'Pecios', emoji: '🚢' },
]

/** Por debajo de este zoom no se piden: serían miles de chinchetas ilegibles. */
export const MIN_POI_ZOOM = 9

export interface NauticalPoi {
  id: string
  kind: PoiKind
  name: string
  lat: number
  lon: number
  details: Record<string, string>
  sourceDate: string
  /** Enlace al objeto original, para corregirlo en OSM si está mal. */
  osmUrl: string
}
