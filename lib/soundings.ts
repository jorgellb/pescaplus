/**
 * Sondas: qué fondo hay en un punto, en metros.
 *
 * La fuente es el servicio de muestreo de EMODnet Bathymetry, que compila los
 * modelos digitales del terreno submarino europeos (incluidos los del IHM
 * español) y rellena los huecos con GEBCO, el modelo global.
 *
 * TRES REGLAS, aprendidas sondeando la API antes de escribir esto:
 *
 *  1. Se usa `avg`, NUNCA `smoothed`. En Columbretes el suavizado devuelve
 *     +5,4 m —por encima del agua— donde la media dice −42,1 m: sobre un bajo
 *     con paredes, suavizar destruye el dato. Es justo donde se pesca.
 *  2. `interpolationType: true` significa que el valor sale de GEBCO, no de un
 *     levantamiento. Se marca como aproximado y se dice de dónde viene. La API
 *     contesta en TODO el mundo —en el Caribe también—, así que nunca avisa
 *     ella de que estás fuera de cobertura fina: hay que mirarlo aquí.
 *  3. Sobre el nivel del mar no hay sonda. Un valor positivo es altitud de
 *     tierra (Madrid devuelve +677 m tan tranquilo) y se informa como tal, no
 *     como fondo de 0 m.
 *
 * Y la que gobierna todo el fichero: esto es una ayuda para preparar la salida,
 * no una carta náutica corregida. Si no se puede responder, se dice; no se
 * interpola, no se redondea a algo verosímil, no se inventa.
 */
export type SoundingKind =
  /** Medida sobre un modelo batimétrico real (levantamiento). */
  | 'medida'
  /** Sale del modelo global GEBCO: sirve para hacerse una idea, poco más. */
  | 'aproximada'
  /** El punto está por encima del nivel del mar. */
  | 'tierra'
  /** No se ha podido consultar. */
  | 'desconocida'

export interface Sounding {
  kind: SoundingKind
  /** Metros de fondo, SIEMPRE positivos. null salvo en 'medida'/'aproximada'. */
  depthM: number | null
  /** Fondo mínimo y máximo dentro de la celda muestreada, si la fuente los da. */
  minM: number | null
  maxM: number | null
  /** Altitud en metros cuando el punto cae en tierra. */
  elevationM: number | null
  /** Modelo del que sale el dato, tal cual lo declara la fuente. */
  source: string | null
  /** Ficha del modelo, para quien quiera comprobarlo. */
  sourceUrl: string | null
  /** Texto listo para pintar. Nunca promete más de lo que hay. */
  label: string
}

const ENDPOINT = 'https://rest.emodnet-bathymetry.eu/depth_sample'
export const SOUNDING_ATTRIBUTION = '© EMODnet Bathymetry'
export const SOUNDING_NOTE =
  'Profundidad orientativa procedente de modelos batimétricos. No sustituye a la sonda de a bordo ni a una carta náutica corregida.'

interface RawSample {
  avg?: number
  min?: number
  max?: number
  stdev?: number
  interpolationType?: boolean
  reference?: { identifier?: string; type?: string; metadata_url?: string }
}

const UNKNOWN: Sounding = {
  kind: 'desconocida', depthM: null, minM: null, maxM: null, elevationM: null,
  source: null, sourceUrl: null, label: 'Sonda no disponible aquí',
}

/**
 * El fondo de un punto no cambia, así que se cachea de verdad. La clave se
 * redondea a 4 decimales (~11 m): más precisión sería cachear ruido.
 */
const CACHE_MAX = 3000
const cache = new Map<string, Sounding>()

function keyOf(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`
}

function remember(key: string, value: Sounding): Sounding {
  // Los fallos no se cachean: mañana puede responder.
  if (value.kind === 'desconocida') return value
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, value)
  return value
}

/** Redondeo a media braza larga: la fuente no da para más finura. */
function round(m: number): number {
  return Math.round(m * 10) / 10
}

/** En español el decimal va con coma. "872.2 m" chirría en una carta náutica. */
export function metros(m: number): string {
  return m.toLocaleString('es-ES', { maximumFractionDigits: 1 })
}

export function interpretSample(raw: RawSample): Sounding {
  const avg = raw.avg
  if (typeof avg !== 'number' || !Number.isFinite(avg)) return UNKNOWN

  const rawId = raw.reference?.identifier?.trim() || null
  // EMODnet identifica algunos levantamientos solo con un número ("291711"),
  // que como "Fuente:" no informa de nada. Se le pone nombre.
  const source = rawId && /^\d+$/.test(rawId) ? `Levantamiento nº ${rawId}` : rawId
  const sourceUrl = raw.reference?.metadata_url?.trim() || null

  // Positivo = por encima del nivel del mar. No es un fondo de 0 m.
  if (avg >= 0) {
    return {
      kind: 'tierra', depthM: null, minM: null, maxM: null,
      elevationM: round(avg), source, sourceUrl,
      label: 'Este punto está en tierra',
    }
  }

  const depthM = round(-avg)
  // min/max vienen con el signo de la fuente: el mínimo (más negativo) es el
  // fondo MÁS hondo. Al invertir, se cruzan.
  const deepest = typeof raw.min === 'number' ? round(-raw.min) : null
  const shallowest = typeof raw.max === 'number' ? round(-raw.max) : null

  const aproximada = raw.interpolationType === true
  // Justo en la línea de costa el modelo devuelve centímetros, que redondeados
  // dan "0 m": un número que no informa de nada y parece un error.
  const enLaOrilla = depthM < 0.5
  return {
    kind: aproximada ? 'aproximada' : 'medida',
    depthM,
    minM: shallowest,
    maxM: deepest,
    elevationM: null,
    source,
    sourceUrl,
    label: enLaOrilla
      ? 'Justo en la orilla (menos de 0,5 m)'
      : aproximada ? `≈ ${metros(depthM)} m (modelo global)` : `${metros(depthM)} m`,
  }
}

/**
 * La sonda de un punto. No lanza nunca: un fallo devuelve 'desconocida', que
 * la interfaz sabe contar sin mentir.
 */
export async function getSounding(lat: number, lon: number): Promise<Sounding> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return UNKNOWN
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return UNKNOWN

  const key = keyOf(lat, lon)
  const hit = cache.get(key)
  if (hit) return hit

  const url = `${ENDPOINT}?geom=POINT(${lon.toFixed(6)}%20${lat.toFixed(6)})`
  /*
   * Los reintentos NO son defensa por si acaso: sin ellos la primera consulta
   * de cada punto fallaba SIEMPRE. El host resuelve a IPv4 y a IPv6, y el
   * intento muere con `TypeError: fetch failed` (causa: AggregateError) allí
   * donde no hay ruta IPv6 viva. Con dos intentos seguidos, sin pausa, caían
   * los dos: hace falta darle margen a la pila de red entre uno y otro. Se veía
   * como "sonda no disponible" en el primer clic y bien en el segundo, que es
   * de los fallos más desconcertantes de perseguir.
   */
  // Las esperas van holgadas a propósito: el fallo observado es un ETIMEDOUT
  // de la primera conexión saliente del proceso, y tres intentos pegados caen
  // los tres. Peor caso, el usuario espera un par de segundos más antes de leer
  // "no disponible", que es preferible a enseñarle una sonda inventada.
  const ESPERAS = [0, 400, 1200]
  for (let attempt = 0; attempt < ESPERAS.length; attempt++) {
    if (ESPERAS[attempt] > 0) await new Promise((r) => setTimeout(r, ESPERAS[attempt]))
    try {
      // EMODnet tarda un par de segundos largos; pasado ese margen es mejor
      // decir "no disponible" que dejar la ficha colgada.
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json', 'User-Agent': 'PescaPlus/1.0 (+https://pescaplus.es)' },
      })
      if (!res.ok) continue
      return remember(key, interpretSample((await res.json()) as RawSample))
    } catch (error) {
      if (attempt === ESPERAS.length - 1) console.warn('Sonda EMODnet no disponible:', error)
    }
  }
  return UNKNOWN
}
