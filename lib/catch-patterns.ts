import type { CatchContext } from '@/lib/catch-context'

/**
 * Qué patrón siguen TUS capturas.
 *
 * Es la razón de sellar cada captura con sus condiciones: tras una temporada se
 * puede responder a lo que de verdad importa —con qué marea, sobre qué fondo, a
 * qué profundidad y a qué hora pica cada especie para este pescador—, con sus
 * propios datos y no con un consejo genérico de revista.
 *
 * LA REGLA QUE GOBIERNA ESTE FICHERO: un patrón con tres capturas es
 * superstición con barra de progreso. Aquí no se afirma nada por debajo de
 * MIN_MUESTRAS, y todo lo que se dice va acompañado del número de capturas que
 * lo sostienen. Alguien va a planificar su madrugón con esto.
 *
 * TAMPOCO SE CONFUNDE FRECUENCIA CON CAUSA. Si alguien solo sale con marea viva,
 * todas sus capturas serán con marea viva, y eso no significa que la marea viva
 * sea mejor: significa que es cuando sale. Se dice "tus capturas se reparten
 * así", nunca "pica mejor con".
 */

/** Por debajo de esto no se enseña ningún patrón. */
export const MIN_MUESTRAS = 5

export interface CatchWithContext {
  speciesId: string
  dateISO: string
  qty: number
  context: CatchContext & { puntoExacto?: boolean }
}

export interface Rango {
  min: number
  max: number
  /** La mediana, que aguanta mejor una captura rara que la media. */
  mediana: number
  n: number
}

export interface PatronEspecie {
  speciesId: string
  capturas: number
  piezas: number
  /** Coeficiente de marea de tus capturas. */
  coeficiente: Rango | null
  sondaM: Rango | null
  aguaC: Rango | null
  vientoKmh: Rango | null
  /** Franja del día donde más capturas has apuntado. */
  franja: { tipo: string; n: number } | null
  /** Sustrato más repetido, con cuántas capturas lo respaldan. */
  fondo: { tipo: string; n: number } | null
  /** Qué falta para poder afirmar más cosas. */
  avisos: string[]
}

function rango(valores: number[]): Rango | null {
  const v = valores.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  if (v.length < MIN_MUESTRAS) return null
  const mediana = v.length % 2
    ? v[(v.length - 1) / 2]
    : (v[v.length / 2 - 1] + v[v.length / 2]) / 2
  return {
    min: Math.round(v[0] * 10) / 10,
    max: Math.round(v[v.length - 1] * 10) / 10,
    mediana: Math.round(mediana * 10) / 10,
    n: v.length,
  }
}

/** Franjas tal como se habla de ellas a pie de agua, no horas cerradas. */
function franjaDe(t: number): string {
  const h = new Date(t).getUTCHours()
  if (h < 6) return 'de noche'
  if (h < 10) return 'al amanecer'
  if (h < 16) return 'a mediodía'
  if (h < 21) return 'al atardecer'
  return 'de noche'
}

function masRepetido<T extends string>(valores: T[]): { tipo: T; n: number } | null {
  if (valores.length < MIN_MUESTRAS) return null
  const cuenta = new Map<T, number>()
  for (const v of valores) cuenta.set(v, (cuenta.get(v) ?? 0) + 1)
  const [tipo, n] = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]
  return { tipo, n }
}

/** El patrón de una especie a partir de las capturas selladas del usuario. */
export function patronDe(speciesId: string, capturas: CatchWithContext[]): PatronEspecie | null {
  const mias = capturas.filter((c) => c.speciesId === speciesId && c.context)
  if (mias.length < MIN_MUESTRAS) return null

  const avisos: string[] = []
  const sinPuntoExacto = mias.filter((c) => c.context.puntoExacto === false).length
  if (sinPuntoExacto > 0) {
    // El centro de una zona y el sitio exacto pueden tener fondos distintos: el
    // sustrato cambia de roca a arena en cien metros.
    avisos.push(`${sinPuntoExacto} de ${mias.length} se apuntaron sin marcar el punto exacto: su fondo es el del centro de la zona.`)
  }
  const sinHora = mias.filter((c) => c.context.faltan?.includes('hora de la captura')).length
  if (sinHora > 0) avisos.push(`${sinHora} sin hora: no cuentan para la franja del día.`)

  const conHora = mias.filter((c) => !c.context.faltan?.includes('hora de la captura'))
  const franja = masRepetido(conHora.map((c) => franjaDe(c.context.t)))
  const fondo = masRepetido(
    mias.map((c) => c.context.fondo?.sustrato).filter((x): x is string => !!x),
  )

  return {
    speciesId,
    capturas: mias.length,
    piezas: mias.reduce((s, c) => s + (c.qty || 1), 0),
    coeficiente: rango(mias.map((c) => c.context.luna?.coeficiente).filter((x): x is number => x != null)),
    sondaM: rango(mias.map((c) => c.context.fondo?.sondaM).filter((x): x is number => x != null)),
    aguaC: rango(mias.map((c) => c.context.mar?.aguaC).filter((x): x is number => x != null)),
    vientoKmh: rango(mias.map((c) => c.context.mar?.vientoKmh).filter((x): x is number => x != null)),
    franja,
    fondo,
    avisos,
  }
}

/** Todos los patrones que dan las capturas de un usuario, de más a menos datos. */
export function patrones(capturas: CatchWithContext[]): PatronEspecie[] {
  const especies = [...new Set(capturas.map((c) => c.speciesId))]
  return especies
    .map((id) => patronDe(id, capturas))
    .filter((p): p is PatronEspecie => p !== null)
    .sort((a, b) => b.capturas - a.capturas)
}

/**
 * Cuántas capturas faltan para que una especie empiece a decir algo.
 *
 * Se enseña para que el diario no parezca roto cuando aún no hay bastante: "te
 * faltan 2 lubinas para ver tu patrón" invita a seguir; un hueco en blanco, no.
 */
export function cuantasFaltan(capturas: CatchWithContext[], speciesId: string): number {
  const n = capturas.filter((c) => c.speciesId === speciesId).length
  return Math.max(0, MIN_MUESTRAS - n)
}
