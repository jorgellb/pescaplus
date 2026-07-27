/**
 * NMEA 0183: el idioma que hablan las sondas y los GPS náuticos.
 *
 * Todo aparato de a bordo —sonda, plotter, GPS, veleta— emite frases NMEA. Da
 * igual la marca: una Garmin, una Lowrance y una Furuno dicen la profundidad
 * con la misma sentencia. Por eso el lector va aquí, separado de CÓMO llegan
 * esas frases (cable USB, Bluetooth, un fichero grabado): el transporte cambia
 * con el aparato, el idioma no.
 *
 * LA SUMA DE COMPROBACIÓN NO ES OPCIONAL. Una línea serie a 4800 baudios en un
 * barco pierde bytes: hay ruido eléctrico, cables viejos y conectores con
 * salitre. Una frase corrompida puede convertir 12 m en 120 m sin que nada lo
 * delate. Aquí se descarta todo lo que no cuadre, y se cuenta cuántas se han
 * descartado para poder decírselo al usuario.
 */

/** Una lectura instantánea de lo que dice el aparato. */
export interface NmeaFix {
  /** Profundidad bajo la superficie, en metros. */
  depthM?: number
  /** Profundidad bajo el transductor, sin corregir su calado. */
  depthBelowTransducerM?: number
  /** Calado del transductor declarado por el aparato. */
  transducerOffsetM?: number
  lat?: number
  lon?: number
  /** Velocidad sobre el fondo, en nudos. */
  knots?: number
  /** Rumbo sobre el fondo, en grados. */
  courseDeg?: number
  /** Temperatura del agua, en grados Celsius. */
  waterTempC?: number
  /** Hora UTC de la frase, en ms, cuando la trae. */
  timeMs?: number
}

export interface ParsedSentence {
  /** El tipo sin el hablante: DBT, DPT, GGA, RMC, MTW… */
  type: string
  fix: NmeaFix
}

/**
 * Suma de comprobación NMEA: XOR de todo lo que hay entre `$` y `*`.
 *
 * Las frases sin `*` se aceptan —los hay que no la mandan— pero si viene, tiene
 * que cuadrar. Aceptar una que no cuadra es peor que perder el dato.
 */
export function checksumOk(sentence: string): boolean {
  const s = sentence.trim()
  const inicio = s.indexOf('$') >= 0 ? s.indexOf('$') : s.indexOf('!')
  if (inicio < 0) return false
  const estrella = s.lastIndexOf('*')
  if (estrella < 0) return true
  const cuerpo = s.slice(inicio + 1, estrella)
  const declarada = s.slice(estrella + 1, estrella + 3)
  if (!/^[0-9A-Fa-f]{2}$/.test(declarada)) return false
  let x = 0
  for (let i = 0; i < cuerpo.length; i++) x ^= cuerpo.charCodeAt(i)
  return x === parseInt(declarada, 16)
}

/** ddmm.mmm + hemisferio → grados decimales. Es el formato de NMEA. */
function coord(valor: string, hemisferio: string): number | undefined {
  if (!valor) return undefined
  const n = Number(valor)
  if (!Number.isFinite(n)) return undefined
  // Los grados son los dígitos antes de los DOS de los minutos: en longitud
  // pueden ser tres (01131.000 = 11° 31,000'), y ahí es donde falla quien
  // asume que siempre son dos.
  const grados = Math.floor(n / 100)
  const minutos = n - grados * 100
  if (minutos >= 60) return undefined
  const dec = grados + minutos / 60
  const h = hemisferio.toUpperCase()
  if (h === 'S' || h === 'W') return -dec
  if (h === 'N' || h === 'E') return dec
  return undefined
}

const num = (v: string): number | undefined => {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/** hhmmss.ss (+ ddmmyy) → ms UTC. Sin fecha se usa la de hoy. */
function hora(hhmmss: string, ddmmyy?: string): number | undefined {
  if (!/^\d{6}/.test(hhmmss)) return undefined
  const h = Number(hhmmss.slice(0, 2))
  const m = Number(hhmmss.slice(2, 4))
  const s = Number(hhmmss.slice(4, 6))
  const frac = hhmmss.includes('.') ? Number(`0.${hhmmss.split('.')[1]}`) : 0
  const ahora = new Date()
  let año = ahora.getUTCFullYear()
  let mes = ahora.getUTCMonth()
  let dia = ahora.getUTCDate()
  if (ddmmyy && /^\d{6}$/.test(ddmmyy)) {
    dia = Number(ddmmyy.slice(0, 2))
    mes = Number(ddmmyy.slice(2, 4)) - 1
    // NMEA da el año con dos dígitos; el siglo se decide por sentido común.
    const yy = Number(ddmmyy.slice(4, 6))
    año = yy >= 70 ? 1900 + yy : 2000 + yy
  }
  return Date.UTC(año, mes, dia, h, m, s, Math.round(frac * 1000))
}

const PIES_A_M = 0.3048
const BRAZAS_A_M = 1.8288

/**
 * Interpreta una frase. Devuelve null si no cuadra la suma o no se reconoce.
 *
 * Solo se leen las sentencias que aportan algo al fondo; el resto se ignora en
 * silencio, que es lo correcto: un flujo NMEA real trae decenas de tipos.
 */
export function parseSentence(linea: string): ParsedSentence | null {
  const s = linea.trim()
  if (!s.startsWith('$') && !s.startsWith('!')) return null
  if (!checksumOk(s)) return null

  const cuerpo = s.slice(1, s.lastIndexOf('*') >= 0 ? s.lastIndexOf('*') : undefined)
  const campos = cuerpo.split(',')
  const cabecera = campos[0] ?? ''
  // Los dos primeros caracteres son el hablante (SD sonda, GP GPS, II integrado,
  // GN multiconstelación…). Lo que importa es el tipo, que va detrás.
  const type = cabecera.length >= 5 ? cabecera.slice(2) : cabecera

  switch (type) {
    /** Profundidad bajo el transductor, en pies / metros / brazas. */
    case 'DBT': {
      const pies = num(campos[1])
      const metros = num(campos[3])
      const brazas = num(campos[5])
      const v = metros ?? (pies != null ? pies * PIES_A_M : undefined) ?? (brazas != null ? brazas * BRAZAS_A_M : undefined)
      return v == null ? null : { type, fix: { depthBelowTransducerM: v } }
    }
    /** Profundidad del agua + calado del transductor: la buena, si viene. */
    case 'DPT': {
      const bajo = num(campos[1])
      const offset = num(campos[2])
      if (bajo == null) return null
      const fix: NmeaFix = { depthBelowTransducerM: bajo }
      if (offset != null) {
        fix.transducerOffsetM = offset
        // Offset positivo = distancia de la quilla a la superficie, así que se
        // suma para dar profundidad real. Negativo es el calado bajo la quilla y
        // no se toca: sumarlo daría un fondo menor del que hay.
        if (offset >= 0) fix.depthM = bajo + offset
      }
      return { type, fix }
    }
    /** Profundidad bajo la quilla / superficie / transductor. */
    case 'DBK':
    case 'DBS': {
      const metros = num(campos[3]) ?? (num(campos[1]) != null ? num(campos[1])! * PIES_A_M : undefined)
      return metros == null ? null : { type, fix: type === 'DBS' ? { depthM: metros } : { depthBelowTransducerM: metros } }
    }
    case 'GGA': {
      const lat = coord(campos[2], campos[3])
      const lon = coord(campos[4], campos[5])
      // Calidad 0 = sin posición válida. Usarla pondría la marca en el golfo de
      // Guinea, que es adonde va todo lo que vale cero.
      if (campos[6] === '0') return null
      if (lat == null || lon == null) return null
      return { type, fix: { lat, lon, timeMs: hora(campos[1]) } }
    }
    case 'RMC': {
      // 'V' es aviso de datos no válidos: el aparato dice que no se fíe.
      if (campos[2] && campos[2].toUpperCase() !== 'A') return null
      const lat = coord(campos[3], campos[4])
      const lon = coord(campos[5], campos[6])
      if (lat == null || lon == null) return null
      return {
        type,
        fix: { lat, lon, knots: num(campos[7]), courseDeg: num(campos[8]), timeMs: hora(campos[1], campos[9]) },
      }
    }
    case 'MTW': {
      const t = num(campos[1])
      if (t == null) return null
      // Puede venir en Fahrenheit, aunque sea raro.
      const c = (campos[2] ?? 'C').toUpperCase() === 'F' ? (t - 32) * 5 / 9 : t
      return { type, fix: { waterTempC: Math.round(c * 10) / 10 } }
    }
    default:
      return null
  }
}

export interface NmeaState extends NmeaFix {
  /** Frases leídas y descartadas: mide la salud del cable. */
  read: number
  discarded: number
}

/**
 * Acumula el estado a partir de un flujo de frases.
 *
 * Los datos llegan repartidos: la profundidad en una frase y la posición en
 * otra, décimas de segundo después. Para grabar el fondo hay que juntarlos, y
 * eso obliga a llevar un estado.
 */
export function createNmeaReader() {
  const state: NmeaState = { read: 0, discarded: 0 }
  let resto = ''

  return {
    /** Digiere un trozo del flujo y devuelve el estado actualizado. */
    push(chunk: string): NmeaState {
      const texto = resto + chunk
      const lineas = texto.split(/\r?\n/)
      // La última puede venir cortada: se guarda para el siguiente trozo.
      resto = lineas.pop() ?? ''
      for (const linea of lineas) {
        if (!linea.trim()) continue
        state.read += 1
        const p = parseSentence(linea)
        if (!p) { state.discarded += 1; continue }
        Object.assign(state, p.fix)
      }
      return { ...state }
    },
    get state(): NmeaState { return { ...state } },
  }
}

/**
 * La profundidad utilizable, corrigiendo el calado del transductor.
 *
 * Casi todas las sondas dan la distancia DESDE EL TRANSDUCTOR, que va medio
 * metro o más bajo la flotación. Sin corregirlo, cada sonda aporta un error
 * sistemático distinto, y al juntar datos de varios barcos eso no se promedia:
 * se acumula. Por eso el calado se pide y no se supone.
 */
export function usableDepth(fix: NmeaFix, caladoManualM?: number): number | null {
  if (fix.depthM != null) return Math.round(fix.depthM * 100) / 100
  if (fix.depthBelowTransducerM == null) return null
  const offset = fix.transducerOffsetM != null && fix.transducerOffsetM >= 0
    ? fix.transducerOffsetM
    : caladoManualM
  if (offset == null) return null
  return Math.round((fix.depthBelowTransducerM + offset) * 100) / 100
}
