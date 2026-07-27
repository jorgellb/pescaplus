/**
 * Tipos de las rutas grabadas, SIN nada de servidor.
 *
 * Vive aparte porque la carta es componente de cliente e importar el store le
 * metería Prisma en el paquete del navegador — el mismo reparto que ya se hizo
 * con los waypoints y con los puntos náuticos.
 */

/** Un punto de la derrota. Nombres cortos: van miles en cada ruta. */
export interface TrackPoint {
  lat: number
  lon: number
  /** Instante UTC en ms. */
  t: number
  /** Precisión declarada por el GPS, en metros. */
  acc?: number
  /** Velocidad en m/s si el aparato la da. */
  spd?: number
}

export type Visibility = 'private' | 'public'

export interface Track {
  id: string
  userId: string
  name: string
  notes: string
  points: TrackPoint[]
  distanceM: number
  durationS: number
  startedAt: number
  visibility: Visibility
  createdAt: number
  updatedAt: number
}

/**
 * Cuántos puntos se guardan como mucho. A un punto cada 3 s son unas 8 horas
 * seguidas; pasado eso se diezma en vez de cortar, para no perder el final de
 * la jornada, que es justo el trozo que interesa al volver a puerto.
 */
export const MAX_TRACK_POINTS = 10000

/**
 * Precisión peor que esto y el punto se descarta.
 *
 * Un GPS de móvil bajo cubierta o con el cielo tapado devuelve posiciones con
 * cientos de metros de error. Meterlas en la derrota no la completa: la
 * ensucia con dientes de sierra que además inflan la distancia recorrida.
 */
export const MAX_ACCURACY_M = 50

/**
 * Velocidad por encima de la cual el salto se considera un error del GPS.
 *
 * Se pone alta a propósito: una lancha rápida pasa de 60 km/h sin despeinarse y
 * no queremos borrarle medio trayecto. Lo que se filtra aquí es el salto
 * imposible de 5 km en dos segundos, típico cuando el aparato cambia de satélite
 * o pasa de red a GPS.
 */
export const MAX_SPEED_MS = 42 // ~150 km/h

const R = 6371000

/** Distancia en metros entre dos puntos (haversine). */
export function distanceBetween(a: TrackPoint, b: TrackPoint): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const lat1 = a.lat * rad
  const lat2 = b.lat * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Longitud total de la derrota, en metros. */
export function trackDistance(points: TrackPoint[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += distanceBetween(points[i - 1], points[i])
  return total
}

/** Duración en segundos entre el primer y el último punto. */
export function trackDuration(points: TrackPoint[]): number {
  if (points.length < 2) return 0
  return Math.max(0, Math.round((points[points.length - 1].t - points[0].t) / 1000))
}

/**
 * ¿Merece la pena añadir este punto a la derrota?
 *
 * Devuelve el motivo del descarte, o null si el punto vale. Se devuelve el
 * motivo y no un simple booleano para poder decirle al usuario por qué la ruta
 * no avanza —"esperando cobertura" no es lo mismo que "estás parado"—.
 */
export function rejectReason(prev: TrackPoint | null, next: TrackPoint): string | null {
  if (!Number.isFinite(next.lat) || !Number.isFinite(next.lon)) return 'posición no válida'
  if (Math.abs(next.lat) > 90 || Math.abs(next.lon) > 180) return 'posición no válida'
  if (next.acc != null && next.acc > MAX_ACCURACY_M) return 'poca precisión'
  if (!prev) return null

  const dt = (next.t - prev.t) / 1000
  // El mismo instante o hacia atrás: el reloj del aparato ha dado un salto.
  if (dt <= 0) return 'marca de tiempo repetida'
  const d = distanceBetween(prev, next)
  if (d / dt > MAX_SPEED_MS) return 'salto imposible del GPS'
  // Parado en el fondeo: no se guarda un punto por segundo para no engordar la
  // ruta con ruido que además falsea la distancia.
  if (d < 3) return 'sin movimiento'
  return null
}

/** Diezma la ruta conservando principio y final cuando se pasa del tope. */
export function decimate(points: TrackPoint[], max = MAX_TRACK_POINTS): TrackPoint[] {
  if (points.length <= max) return points
  const paso = Math.ceil(points.length / max)
  const out = points.filter((_, i) => i % paso === 0)
  const ultimo = points[points.length - 1]
  if (out[out.length - 1] !== ultimo) out.push(ultimo)
  return out
}

/** "2 h 14 min" / "45 min" / "38 s" */
export function formatDuration(s: number): string {
  if (s < 60) return `${Math.round(s)} s`
  const min = Math.round(s / 60)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`
}

/** Distancia en millas náuticas, que es como se habla en el mar. */
export function formatDistance(m: number): string {
  const nm = m / 1852
  if (nm < 1) return `${m.toLocaleString('es-ES', { maximumFractionDigits: 0 })} m`
  return `${nm.toLocaleString('es-ES', { maximumFractionDigits: 2 })} M`
}
