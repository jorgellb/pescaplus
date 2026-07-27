/**
 * Tipo de fondo: roca, arena, fango, sedimento grueso…
 *
 * Para un pescador esto no es un adorno: el sustrato decide la especie y la
 * técnica. Un fondo de roca y uno de arena a la misma sonda y a cien metros uno
 * del otro son dos pesqueros distintos.
 *
 * La fuente es EUSeaMap (EMODnet Seabed Habitats), un mapa PREDICTIVO de escala
 * amplia: modela el sustrato a partir de batimetría, energía del oleaje y
 * muestras, no dibuja cada mancha de arena. Sirve para saber qué te vas a
 * encontrar en una zona, no para afirmar qué hay bajo la quilla. Eso se dice en
 * la interfaz, no se deja en la letra pequeña.
 *
 * DOS COSAS QUE COSTARON ENCONTRAR:
 *
 *  1. El servidor no dibuja nada por debajo de zoom ~9. Vista España entera la
 *     capa parece vacía y es fácil dar por hecho que no sirve.
 *  2. GetFeatureInfo devuelve por defecto TRES copias de la geometría del
 *     polígono —cientos de KB por clic—. Con `propertyName=substrate` la
 *     respuesta baja a 262 bytes.
 */
import { getSounding } from '@/lib/soundings'

const WMS = 'https://ows.emodnet-seabedhabitats.eu/geoserver/emodnet_open/wms'
const LAYER = 'eusm2025_subs_full'
const LAYER_HABITAT = 'eusm2025_eunis2019_full'
const LAYER_CONF = 'eusm2025_subs_conf'
const DEPTH = 'https://rest.emodnet-bathymetry.eu/depth_sample'

export const SEABED_ATTRIBUTION = '© EMODnet Seabed Habitats (EUSeaMap)'
export const SEABED_NOTE =
  'Mapa predictivo de escala amplia: describe la zona, no el punto exacto. No sustituye a una ecosonda.'

/** La leyenda oficial, para que los colores de la capa signifiquen algo. */
export const SEABED_LEGEND_URL =
  `${WMS}?service=WMS&version=1.3.0&request=GetLegendGraphic&layer=${LAYER}&format=image%2Fpng`

/**
 * La resolución REAL de cada fuente, dicha sin adornos.
 *
 * Se enseña en la interfaz porque sin ella el mapa miente por omisión: un color
 * uniforme parece un dato uniforme, y lo que hay debajo son polígonos de
 * doscientos kilómetros cuadrados. Medido: los polígonos de sustrato del
 * Estrecho miden 228, 160 y 7 km²; la batimetría no distingue dos puntos
 * separados 60 m.
 */
export const SEABED_RESOLUTION =
  'El tipo de fondo procede de un modelo de escala amplia: sus manchas miden kilómetros, no metros. El relieve y la pendiente salen de la batimetría, con celdas de unos 100 m.'

export interface Slope {
  /** Pendiente máxima alrededor del punto, en porcentaje. */
  percent: number | null
  label: string
  hint: string | null
}

export interface Seabed {
  /** null cuando no hay dato en ese punto: no se rellena con lo más probable. */
  substrate: string | null
  /** El valor original en inglés, por si la traducción se queda corta. */
  raw: string | null
  label: string
  /** Hábitat EUNIS: dice bastante más que "roca" (p. ej. coralígeno). */
  habitat: string | null
  /** Piso: infralitoral, circalitoral… Marca la luz y con ella la vida. */
  biozone: string | null
  /** Cuánta confianza declara la fuente en su propia clasificación. */
  confidence: 'alta' | 'media' | 'baja' | null
  /** Pendiente del fondo alrededor: fuerte es indicio de roca. */
  slope: Slope | null
}

const DESCONOCIDO: Seabed = {
  substrate: null, raw: null, label: 'Sin datos de fondo aquí',
  habitat: null, biozone: null, confidence: null, slope: null,
}

/**
 * Las clases de EUSeaMap, en cristiano. Lo que no esté aquí se enseña tal cual
 * viene: mejor un término en inglés que una traducción inventada.
 */
const CLASES: Record<string, string> = {
  'rock or other hard substrata': 'Roca o fondo duro',
  'coarse substrate': 'Fondo grueso (grava y cascajo)',
  'mixed sediment': 'Sedimento mixto',
  'sand': 'Arena',
  'sandy mud': 'Fango arenoso',
  'muddy sand': 'Arena fangosa',
  'sandy mud or muddy sand': 'Arena fangosa o fango arenoso',
  'mud': 'Fango',
  'mud or sandy mud': 'Fango o fango arenoso',
  'seabed': 'Fondo sin clasificar',
  'sediment': 'Sedimento sin clasificar',
  'fine mud, sandy mud or muddy sand': 'Fango fino, fango arenoso o arena fangosa',
}

export function translateSubstrate(raw: string | null | undefined): Seabed {
  const limpio = (raw ?? '').trim()
  if (!limpio) return DESCONOCIDO
  const es = CLASES[limpio.toLowerCase()]
  return {
    substrate: es ?? limpio, raw: limpio, label: es ?? limpio,
    habitat: null, biozone: null, confidence: null, slope: null,
  }
}

/**
 * Un recuadro diminuto alrededor del punto. GetFeatureInfo trabaja en píxeles
 * sobre una imagen imaginaria, así que se le inventa una de 3×3 y se pregunta
 * por el de en medio.
 */
function bboxAlrededor(lat: number, lon: number): string {
  const R = 20037508.34
  const x = (lon * R) / 180
  const y = (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)) * (R / 180)
  const d = 30 // metros a cada lado: la resolución de la fuente es mucho mayor
  return `${x - d},${y - d},${x + d},${y + d}`
}

/** Una consulta a GetFeatureInfo con reintentos, devolviendo las propiedades. */
async function consultarWMS(
  lat: number, lon: number, capa: string, propiedades: string,
): Promise<Record<string, unknown> | null> {
  const url = `${WMS}?service=WMS&version=1.3.0&request=GetFeatureInfo`
    + `&layers=${capa}&query_layers=${capa}&styles=&format=image%2Fpng`
    + `&info_format=application%2Fjson&crs=EPSG%3A3857`
    + `&width=3&height=3&i=1&j=1&feature_count=1`
    + (propiedades ? `&propertyName=${propiedades}` : '')
    + `&bbox=${encodeURIComponent(bboxAlrededor(lat, lon))}`

  // Mismo motivo que en las sondas: la primera conexión saliente puede morir.
  for (const espera of [0, 400, 1200]) {
    if (espera > 0) await new Promise((r) => setTimeout(r, espera))
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json', 'User-Agent': 'PescaPlus/1.0 (+https://pescaplus.es)' },
      })
      if (!res.ok) continue
      const data = (await res.json()) as { features?: { properties?: Record<string, unknown> }[] }
      return data.features?.[0]?.properties ?? null
    } catch (error) {
      if (espera === 1200) console.warn(`Capa de fondo ${capa} no disponible:`, error)
    }
  }
  return null
}

/** La confianza que declara la fuente: 1 baja, 2 media, 3 alta. */
function leerConfianza(v: unknown): Seabed['confidence'] {
  const n = Number(v)
  if (n >= 3) return 'alta'
  if (n === 2) return 'media'
  if (n === 1) return 'baja'
  return null
}

/**
 * Una sonda suelta, con su signo: negativa bajo el agua, positiva en tierra.
 *
 * Pasa por `getSounding` a propósito, en vez de pedirlo por su cuenta. Antes
 * hacía un fetch crudo y cada consulta de fondo volvía a pedir a EMODnet las
 * cinco sondas de la pendiente, incluso para un punto ya visto: con todo lo
 * demás cacheado, /api/fondo seguía costando 649 ms mientras el resto bajaba a
 * 5 ms. Reutilizar el lector aprovecha su caché y de paso sus reintentos.
 */
async function profundidad(lat: number, lon: number): Promise<number | null> {
  const s = await getSounding(lat, lon)
  if (s.depthM != null) return -s.depthM
  if (s.elevationM != null) return s.elevationM
  return null
}

/**
 * Pendiente del fondo alrededor del punto.
 *
 * Se mide contra cuatro vecinos a 200 m, y no a menos, porque la celda de la
 * batimetría ronda los 100 m: a 60 m devuelve el mismo valor y la pendiente
 * saldría siempre cero. Está comprobado midiendo.
 *
 * Una caída fuerte es de los mejores indicios de roca que se pueden sacar a
 * distancia — en Columbretes da 27,8% hacia el islote— pero es un INDICIO: un
 * talud de arena también baja.
 */
export async function getSlope(lat: number, lon: number): Promise<Slope | null> {
  const D = 0.0018 // ≈ 200 m
  const dLon = D / Math.max(0.2, Math.cos((lat * Math.PI) / 180))
  const [centro, n, s, e, o] = await Promise.all([
    profundidad(lat, lon),
    profundidad(lat + D, lon), profundidad(lat - D, lon),
    profundidad(lat, lon + dLon), profundidad(lat, lon - dLon),
  ])
  if (centro == null) return null
  const desniveles = [n, s, e, o]
    .filter((v): v is number => v != null)
    .map((v) => Math.abs(v - centro) / 200 * 100)
  if (desniveles.length === 0) return null

  const pct = Math.round(Math.max(...desniveles) * 10) / 10
  const t = pct.toLocaleString('es-ES', { maximumFractionDigits: 1 })
  if (pct >= 15) return { percent: pct, label: `Fuerte · ${t}%`, hint: 'Caída pronunciada: suele haber roca o veril.' }
  if (pct >= 5) return { percent: pct, label: `Acusada · ${t}%`, hint: 'Cambio de fondo marcado.' }
  return { percent: pct, label: `Suave · ${t}%`, hint: null }
}

/**
 * Todo lo que se puede saber del fondo en un punto, de varias fuentes a la vez.
 *
 * Van en paralelo porque son ocho peticiones a dos servicios distintos y en
 * serie el usuario esperaría medio minuto mirando un panel vacío.
 */
export async function getSeabedDetail(lat: number, lon: number): Promise<Seabed> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return DESCONOCIDO
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return DESCONOCIDO

  const [base, habitat, conf, slope] = await Promise.all([
    getSeabed(lat, lon),
    consultarWMS(lat, lon, LAYER_HABITAT, 'substrate,biozone,all2019d,all2019dl2'),
    consultarWMS(lat, lon, LAYER_CONF, ''),
    getSlope(lat, lon),
  ])

  const texto = (v: unknown) => {
    const t = String(v ?? '').trim()
    return t && t !== ' ' ? t : null
  }
  return {
    ...base,
    // El nivel 2 ("MC1: Circalittoral rock") describe mejor para pescar que el
    // detalle completo, que a veces baja a una especie concreta.
    habitat: texto(habitat?.all2019d) ?? texto(habitat?.all2019dl2),
    biozone: texto(habitat?.biozone),
    confidence: leerConfianza(conf?.GRAY_INDEX),
    slope,
  }
}

/** Qué fondo hay en un punto. No lanza: sin respuesta, se dice que no se sabe. */
export async function getSeabed(lat: number, lon: number): Promise<Seabed> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return DESCONOCIDO
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return DESCONOCIDO

  const url = `${WMS}?service=WMS&version=1.3.0&request=GetFeatureInfo`
    + `&layers=${LAYER}&query_layers=${LAYER}&styles=&format=image%2Fpng`
    + `&info_format=application%2Fjson&crs=EPSG%3A3857`
    + `&width=3&height=3&i=1&j=1&feature_count=1&propertyName=substrate`
    + `&bbox=${encodeURIComponent(bboxAlrededor(lat, lon))}`

  // Mismo motivo que en las sondas: la primera conexión saliente puede morir.
  for (const espera of [0, 400, 1200]) {
    if (espera > 0) await new Promise((r) => setTimeout(r, espera))
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json', 'User-Agent': 'PescaPlus/1.0 (+https://pescaplus.es)' },
      })
      if (!res.ok) continue
      const data = (await res.json()) as { features?: { properties?: { substrate?: string } }[] }
      const valor = data.features?.[0]?.properties?.substrate
      // Sin polígono en ese punto, no hay fondo que contar. No se rellena.
      return valor ? translateSubstrate(valor) : DESCONOCIDO
    } catch (error) {
      if (espera === 1200) console.warn('Tipo de fondo no disponible:', error)
    }
  }
  return DESCONOCIDO
}
