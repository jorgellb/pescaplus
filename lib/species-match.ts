import { SEA_SPECIES, type SpeciesProfile } from '@/lib/fishing-species'

/**
 * Qué especies encajan con lo que hay en un punto.
 *
 * Cruza la sonda, el tipo de fondo, la temperatura del agua y el mes con los
 * perfiles de especie que ya tenía el sitio. Es la vuelta que le da sentido a
 * todo el trabajo de fondo: convierte "roca a 22 m, agua a 19 °C" en una
 * respuesta que sirve para decidir qué caña montar.
 *
 * LO QUE ESTO ES Y LO QUE NO ES. Dice qué especies son COMPATIBLES con esas
 * condiciones según su ficha; no dice que estén ahí. Un sitio puede reunir todo
 * lo que le gusta a un mero y no tener ninguno. Por eso:
 *
 *  - Se enseñan los criterios que han encajado, uno por uno. Quien lee decide
 *    si le convence, en vez de tragarse una puntuación opaca.
 *  - No se ordena por una probabilidad inventada, sino por cuántos criterios
 *    encajan y con cuántos datos se ha podido comprobar.
 *  - Si falta el dato de fondo o de sonda, se dice; no se rellena con lo más
 *    frecuente.
 *
 * LOS RANGOS NO SE INVENTAN: se derivan de la propia ficha de cada especie, que
 * ya traía "10–50 m sobre piedra" escrito por quien la redactó. Derivar en vez
 * de copiar a mano evita que las dos fuentes se separen cuando alguien edite la
 * prosa, y una prueba comprueba que las 26 especies siguen interpretándose.
 */

export interface Criterio {
  /** Qué se ha comprobado: 'sonda', 'fondo', 'agua', 'época'. */
  que: string
  /** Cómo ha salido. */
  encaja: boolean
  detalle: string
}

export interface Coincidencia {
  speciesId: string
  name: string
  emoji: string
  criterios: Criterio[]
  /** Cuántos criterios se han podido comprobar y cuántos encajan. */
  encajan: number
  comprobados: number
}

/** "10–50 m sobre piedra" → [10, 50]. Null si la ficha no lo dice claro. */
export function depthRange(p: SpeciesProfile): [number, number] | null {
  // Se aceptan el guion normal y el largo, que conviven en las fichas.
  const m = p.depth?.match(/(\d+)\s*[–-]\s*(\d+)\s*m/)
  if (!m) return null
  const min = Number(m[1])
  const max = Number(m[2])
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return null
  return [min, max]
}

/**
 * Qué fondos nombra la ficha, en las mismas clases que devuelve EUSeaMap.
 *
 * Las praderas cuentan como arena: en EUSeaMap la posidonia no es una clase de
 * sustrato, y el fondo que hay debajo es arenoso.
 */
const PISTAS: { clave: RegExp; sustrato: string }[] = [
  { clave: /roca|rocos|piedra|escoller|espigó|espigo|cueva|cantil|veril|pecio|bolos|hura|bajos|estructura/i, sustrato: 'Roca o fondo duro' },
  { clave: /arena|arenal|pradera|playa/i, sustrato: 'Arena' },
  { clave: /fango/i, sustrato: 'Fango' },
  { clave: /mixto/i, sustrato: 'Sedimento mixto' },
  { clave: /grava|cascajo/i, sustrato: 'Fondo grueso (grava y cascajo)' },
]

/**
 * Especies que no viven en el fondo: el sustrato no les aplica y juzgarlas por
 * él sería absurdo. Se declara la lista en vez de deducirla de que no aparezca
 * ninguna palabra clave, porque "no encontré nada" y "no aplica" son cosas
 * distintas y solo una de las dos es una decisión.
 */
export const PELAGICAS = new Set(['atun', 'potas', 'pelagicos'])

export function substratos(p: SpeciesProfile): string[] {
  if (PELAGICAS.has(p.id)) return []
  const texto = `${p.habitat ?? ''} ${p.depth ?? ''}`
  return PISTAS.filter(({ clave }) => clave.test(texto)).map(({ sustrato }) => sustrato)
}

export interface Punto {
  sondaM?: number | null
  sustrato?: string | null
  aguaC?: number | null
  /** Mes 1..12. */
  mes: number
}

function evaluar(p: SpeciesProfile, punto: Punto): Coincidencia | null {
  if (p.id === 'general' || p.id === 'pelagicos') return null
  const criterios: Criterio[] = []

  const rango = depthRange(p)
  if (rango && punto.sondaM != null) {
    // Un margen del 25% arriba: las fichas dan el sitio típico, no la frontera.
    const holgado = rango[1] * 1.25
    const encaja = punto.sondaM >= rango[0] && punto.sondaM <= holgado
    criterios.push({
      que: 'sonda',
      encaja,
      detalle: encaja
        ? `su fondo típico es ${rango[0]}–${rango[1]} m`
        : `busca ${rango[0]}–${rango[1]} m y aquí hay ${Math.round(punto.sondaM)} m`,
    })
  }

  const fondos = substratos(p)
  if (fondos.length > 0 && punto.sustrato) {
    const encaja = fondos.includes(punto.sustrato)
    criterios.push({
      que: 'fondo',
      encaja,
      detalle: encaja ? `busca ${punto.sustrato.toLowerCase()}` : `prefiere ${fondos.join(' o ').toLowerCase()}`,
    })
  }

  if (p.seaTempC && punto.aguaC != null) {
    const [a, b] = p.seaTempC
    const encaja = punto.aguaC >= a - 1 && punto.aguaC <= b + 1
    criterios.push({
      que: 'agua',
      encaja,
      detalle: encaja ? `come entre ${a} y ${b} °C` : `su rango es ${a}–${b} °C`,
    })
  }

  if (p.bestMonths?.length) {
    const encaja = p.bestMonths.includes(punto.mes)
    criterios.push({ que: 'época', encaja, detalle: encaja ? 'está en temporada' : 'fuera de su mejor época' })
  }

  if (criterios.length === 0) return null
  return {
    speciesId: p.id,
    name: p.name,
    emoji: p.emoji,
    criterios,
    encajan: criterios.filter((c) => c.encaja).length,
    comprobados: criterios.length,
  }
}

/**
 * Las especies compatibles con un punto, de más a menos criterios cumplidos.
 *
 * Se exige que encaje MÁS DE LA MITAD de lo comprobado: una especie que solo
 * coincide en el mes no tiene nada que hacer en una lista que alguien va a usar
 * para decidir qué llevarse al barco.
 */
export function especiesCompatibles(punto: Punto, max = 6): Coincidencia[] {
  return SEA_SPECIES
    .map((p) => evaluar(p, punto))
    .filter((c): c is Coincidencia => c !== null && c.encajan > c.comprobados / 2)
    .sort((a, b) => (b.encajan - a.encajan) || (b.comprobados - a.comprobados) || a.name.localeCompare(b.name, 'es'))
    .slice(0, max)
}

/** Qué datos del punto faltaban, para poder decirlo en vez de disimular. */
export function datosQueFaltan(punto: Punto): string[] {
  const faltan: string[] = []
  if (punto.sondaM == null) faltan.push('la sonda')
  if (!punto.sustrato) faltan.push('el tipo de fondo')
  if (punto.aguaC == null) faltan.push('la temperatura del agua')
  return faltan
}
