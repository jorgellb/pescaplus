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
const WMS = 'https://ows.emodnet-seabedhabitats.eu/geoserver/emodnet_open/wms'
const LAYER = 'eusm2025_subs_full'

export const SEABED_ATTRIBUTION = '© EMODnet Seabed Habitats (EUSeaMap)'
export const SEABED_NOTE =
  'Mapa predictivo de escala amplia: describe la zona, no el punto exacto. No sustituye a una ecosonda.'

/** La leyenda oficial, para que los colores de la capa signifiquen algo. */
export const SEABED_LEGEND_URL =
  `${WMS}?service=WMS&version=1.3.0&request=GetLegendGraphic&layer=${LAYER}&format=image%2Fpng`

export interface Seabed {
  /** null cuando no hay dato en ese punto: no se rellena con lo más probable. */
  substrate: string | null
  /** El valor original en inglés, por si la traducción se queda corta. */
  raw: string | null
  label: string
}

const DESCONOCIDO: Seabed = { substrate: null, raw: null, label: 'Sin datos de fondo aquí' }

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
  return { substrate: es ?? limpio, raw: limpio, label: es ?? limpio }
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
