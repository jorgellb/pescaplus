/**
 * Batimetría colaborativa (CSB) según el marco de la OHI.
 *
 * La idea: cada barco que sale a pescar lleva una ecosonda encendida. Si esas
 * sondas se guardan con su posición y su hora, se acumula un detalle del fondo
 * que ningún modelo público tiene — porque los modelos interpolan y esto son
 * medidas reales, tomadas justo donde se pesca.
 *
 * HASTA DÓNDE LLEGA ESTO, Y NO MÁS. Una ecosonda de pesca emite un cono de unos
 * 20°: a 50 m de fondo ilumina un círculo de unos 17 m, y a 100 m, de 35 m. La
 * profundidad que devuelve es la del eco más cercano dentro de ese cono, así que
 * una piedra pequeña SÍ se detecta —marca menos fondo del que hay alrededor—
 * pero su posición solo se conoce con la precisión del cono. Repitiendo pasadas
 * se afinan rasgos de 5 a 20 m. Menos que eso no lo da la física del aparato,
 * por muchos datos que se junten.
 *
 * LO QUE ARRUINA UN DATO ASÍ, Y CÓMO SE TRATA AQUÍ:
 *
 *  1. El calado del transductor. Si no se resta, cada barco mete un error
 *     sistemático distinto, y al juntar veinte barcos eso NO se promedia: se
 *     acumula. Es obligatorio y sin él no se acepta la sonda.
 *  2. La marea. En el Atlántico español son metros. No se corrige aquí, y por
 *     eso se guarda la HORA de cada sonda: sin ella la corrección sería
 *     imposible después. Se marca como no corregida y se dice.
 *  3. Los picos. Un banco de peces, una burbuja o el eco de la estela dan
 *     lecturas absurdas. Se reconocen por la FORMA —bajan y vuelven, mientras
 *     que un veril baja y sigue— comparando cada sonda con sus dos vecinas.
 *
 * NADA DE ESTO ES UNA CARTA NÁUTICA. Son medidas de aficionados sin corregir de
 * marea; sirven para encontrar piedra, no para decidir por dónde se pasa.
 */

/** Una sonda tomada por un barco, ya corregida de calado. */
export interface Sounding {
  lat: number
  lon: number
  /** Metros bajo la superficie, positivos. Con el calado ya sumado. */
  depthM: number
  /** Instante UTC en ms. Imprescindible para poder corregir marea después. */
  t: number
}

export interface RawSounding {
  lat: number
  lon: number
  /** Lo que dijo la sonda: distancia desde el transductor. */
  belowTransducerM: number
  t: number
  /** Precisión del GPS en metros, si se conoce. */
  accM?: number
}

export interface QualityOptions {
  /** Metros del transductor bajo la flotación. Obligatorio. */
  transducerDraftM: number
  /** Peor precisión de GPS aceptable. */
  maxAccM?: number
  /** Fondo máximo verosímil para pesca de recreo. */
  maxDepthM?: number
}

export interface QualityResult {
  soundings: Sounding[]
  rejected: { reason: string; count: number }[]
}

const MAX_ACC_DEFAULT = 25
const MAX_DEPTH_DEFAULT = 2000
/**
 * Un pico se reconoce por ser una EXCURSIÓN, no por ser rápido.
 *
 * Primero lo intenté con un umbral de velocidad de cambio, y está mal pensado:
 * un banco de peces que da 8 m donde hay 40 cambia igual de rápido que un veril
 * de verdad, y el umbral que salva al veril deja pasar el banco. La diferencia
 * no es la velocidad, es la FORMA: el pico se va y vuelve, el veril se va y
 * sigue. Así que se compara cada sonda con la anterior Y la siguiente, y solo se
 * descarta si se aparta de las dos en el mismo sentido.
 *
 * El umbral es relativo: 3 m de desvío a 10 m de fondo son un disparate; a 200 m
 * son ruido normal del aparato.
 */
function umbralPico(depthM: number): number {
  return Math.max(2, depthM * 0.15)
}

/**
 * Limpia un lote de sondas y dice qué ha tirado y por qué.
 *
 * Devuelve los motivos agrupados, no un booleano: quien contribuye tiene derecho
 * a saber que se le han descartado cuarenta sondas por precisión de GPS, porque
 * eso se arregla —sacando la antena de debajo del puente, por ejemplo—.
 */
export function qualityFilter(raw: RawSounding[], opts: QualityOptions): QualityResult {
  const motivos = new Map<string, number>()
  const tira = (r: string) => motivos.set(r, (motivos.get(r) ?? 0) + 1)

  const maxAcc = opts.maxAccM ?? MAX_ACC_DEFAULT
  const maxDepth = opts.maxDepthM ?? MAX_DEPTH_DEFAULT
  const calado = opts.transducerDraftM

  // Sin calado no hay dato utilizable: se rechaza el lote entero antes que
  // aportar profundidades con un sesgo desconocido.
  if (!Number.isFinite(calado) || calado < 0 || calado > 10) {
    return { soundings: [], rejected: [{ reason: 'calado del transductor no declarado o absurdo', count: raw.length }] }
  }

  const ordenadas = [...raw].sort((a, b) => a.t - b.t)
  const validas: Sounding[] = []

  for (const s of ordenadas) {
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lon) || Math.abs(s.lat) > 90 || Math.abs(s.lon) > 180) {
      tira('posición no válida'); continue
    }
    if (!Number.isFinite(s.t) || s.t <= 0) { tira('sin hora válida'); continue }
    if (!Number.isFinite(s.belowTransducerM) || s.belowTransducerM <= 0) { tira('sonda no válida'); continue }
    if (s.accM != null && s.accM > maxAcc) { tira('poca precisión de GPS'); continue }

    const depthM = Math.round((s.belowTransducerM + calado) * 100) / 100
    if (depthM > maxDepth) { tira('fondo fuera de rango'); continue }

    validas.push({ lat: s.lat, lon: s.lon, depthM, t: s.t })
  }

  // Segunda pasada: los picos solo se ven mirando lo que hay a cada lado, así
  // que hace falta la lista entera. Los extremos se quedan: no hay con qué
  // compararlos y tirarlos por si acaso perdería el principio de cada derrota.
  const out = validas.filter((p, i) => {
    const antes = validas[i - 1]
    const despues = validas[i + 1]
    if (!antes || !despues) return true
    const dA = p.depthM - antes.depthM
    const dD = p.depthM - despues.depthM
    const u = umbralPico(p.depthM)
    if (Math.abs(dA) > u && Math.abs(dD) > u && Math.sign(dA) === Math.sign(dD)) {
      tira('pico aislado (banco de peces, burbuja o eco de la estela)')
      return false
    }
    return true
  })

  return {
    soundings: out,
    rejected: [...motivos.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
  }
}

/* ------------------------------------------------- formato de la OHI/DCDB --- */

export interface CsbMetadata {
  /** Identificador estable y PSEUDÓNIMO del barco. Nunca la matrícula. */
  uniqueVesselId: string
  /** Quién aporta los datos: nosotros, como nodo. */
  providerName: string
  providerEmail?: string
  /** Marca y modelo de la sonda, si se conocen. Mejoran el valor del dato. */
  sounderMake?: string
  sounderModel?: string
  /** Calado del transductor ya aplicado a las profundidades. */
  draftM?: number
}

/**
 * Las sondas en el CSV que ingiere el archivo de la OHI (DCDB).
 *
 * OJO: los nombres de columna van todos AQUÍ y en ningún otro sitio, porque son
 * lo primero que habrá que ajustar cuando se valide un envío real contra
 * Crowbar. El envío exige además estar registrado como proveedor; esto genera
 * el fichero, no da de alta a nadie.
 */
export function toCsbCsv(soundings: Sounding[], meta: CsbMetadata): string {
  const filas = soundings.map((s) => [
    meta.uniqueVesselId,
    s.lon.toFixed(7),
    s.lat.toFixed(7),
    s.depthM.toFixed(2),
    new Date(s.t).toISOString(),
  ].join(','))
  return ['UNIQUE_ID,LON,LAT,DEPTH,TIME', ...filas].join('\n') + '\n'
}

/**
 * Las sondas en GeoJSON con los metadatos de plataforma.
 *
 * Es el formato que conserva de dónde salió cada cosa: quién lo tomó, con qué
 * aparato y con cuánto calado. Sin eso una sonda suelta no vale para nada serio,
 * porque no se puede juzgar ni corregir.
 */
export function toCsbGeoJson(soundings: Sounding[], meta: CsbMetadata): string {
  return JSON.stringify({
    type: 'FeatureCollection',
    crs: { type: 'name', properties: { name: 'EPSG:4326' } },
    properties: {
      platform: {
        uniqueID: meta.uniqueVesselId,
        ...(meta.draftM != null ? { draft: meta.draftM } : {}),
        ...(meta.sounderMake || meta.sounderModel
          ? { sounder: { ...(meta.sounderMake ? { make: meta.sounderMake } : {}), ...(meta.sounderModel ? { model: meta.sounderModel } : {}) } }
          : {}),
      },
      providerContactPoint: {
        orgName: meta.providerName,
        ...(meta.providerEmail ? { email: meta.providerEmail } : {}),
      },
      // Se declara explícitamente que NO están corregidas de marea. Callarlo
      // sería dejar que otro las use creyendo que sí.
      processingParameters: { tideCorrected: false, verticalDatum: 'instantaneous water level' },
    },
    features: soundings.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number(s.lon.toFixed(7)), Number(s.lat.toFixed(7))] },
      properties: { depth: s.depthM, time: new Date(s.t).toISOString() },
    })),
  })
}

/* --------------------------------------------------------------- rejilla --- */

export interface GridCell {
  lat: number
  lon: number
  /** Profundidad representativa: la MENOR de la celda. Ver el porqué abajo. */
  depthM: number
  /** Cuántas sondas la respaldan: mide en qué se puede confiar. */
  samples: number
  /** Diferencia entre la sonda menor y la mayor dentro de la celda. */
  spreadM: number
}

/**
 * Junta las sondas en una rejilla.
 *
 * SE GUARDA LA MENOR, NO LA MEDIA, y esto es deliberado. Buscamos piedra: si en
 * una celda de 20 m una pasada dio 18 m y otra 31 m, lo interesante es que ahí
 * hay algo que sube a 18. La media (24,5 m) borra exactamente el rasgo que se
 * quiere encontrar. Además, del lado de la seguridad, el fondo menor es el que
 * importa.
 *
 * `spreadM` conserva lo que la media habría escondido: mucha diferencia dentro
 * de una celda es, otra vez, indicio de relieve.
 */
export function toGrid(soundings: Sounding[], cellM = 20): GridCell[] {
  if (soundings.length === 0) return []
  const grados = cellM / 111320
  const celdas = new Map<string, { lat: number; lon: number; min: number; max: number; n: number }>()

  for (const s of soundings) {
    // La celda se mide en metros también en longitud: si no, cerca del polo
    // saldrían rectángulos larguísimos.
    const gLon = grados / Math.max(0.05, Math.cos((s.lat * Math.PI) / 180))
    const iLat = Math.floor(s.lat / grados)
    const iLon = Math.floor(s.lon / gLon)
    const clave = `${iLat}:${iLon}`
    const c = celdas.get(clave)
    if (c) {
      c.min = Math.min(c.min, s.depthM)
      c.max = Math.max(c.max, s.depthM)
      c.n += 1
    } else {
      celdas.set(clave, {
        lat: (iLat + 0.5) * grados,
        lon: (iLon + 0.5) * gLon,
        min: s.depthM, max: s.depthM, n: 1,
      })
    }
  }

  return [...celdas.values()].map((c) => ({
    lat: Math.round(c.lat * 1e6) / 1e6,
    lon: Math.round(c.lon * 1e6) / 1e6,
    depthM: Math.round(c.min * 10) / 10,
    samples: c.n,
    spreadM: Math.round((c.max - c.min) * 10) / 10,
  }))
}

/**
 * El aviso que acompaña a cualquier cosa que salga de estos datos.
 *
 * No es una fórmula legal: es lo que de verdad hay que saber para no meterse en
 * un lío con una sonda ajena sin corregir de marea.
 */
export const CSB_DISCLAIMER =
  'Sondas tomadas por embarcaciones de recreo, sin corregir de marea y con la precisión del propio aparato. '
  + 'Sirven para localizar relieve y piedra, NO para navegar ni para decidir el paso por un bajo.'

/** El tamaño real de lo que ve una ecosonda, para poder decirlo sin adornos. */
export function footprintM(depthM: number, beamDeg = 20): number {
  return Math.round(2 * depthM * Math.tan((beamDeg * Math.PI) / 360) * 10) / 10
}
