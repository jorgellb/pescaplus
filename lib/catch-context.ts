import { lunarInfo } from '@/lib/solunar'
import { tideCoefficient, coefficientLabel, getTides, tideRisingAt } from '@/lib/tides'
import { getSounding } from '@/lib/soundings'
import { getSeabed } from '@/lib/seabed'
import { getForecastAt } from '@/lib/marine-forecast'

/**
 * La foto de las condiciones que rodearon una captura.
 *
 * Es lo que convierte el diario en una herramienta. Sin esto queda "una lubina
 * en Tarifa el 20 de julio", que no enseña nada; con esto, tras una temporada,
 * se puede responder a lo que de verdad importa: con qué marea, sobre qué fondo
 * y a qué profundidad pica cada especie PARA ESTE PESCADOR.
 *
 * QUÉ SE PUEDE SABER Y QUÉ NO, SEGÚN CUÁNDO SE APUNTE:
 *
 *  - La LUNA y el COEFICIENTE de marea se calculan para cualquier fecha, pasada
 *    o futura: son astronomía. Siempre están.
 *  - El FONDO y la SONDA no cambian: da igual apuntar hoy una captura de hace
 *    tres meses, el fondo era el mismo.
 *  - El VIENTO, la OLA y la TEMPERATURA del agua solo se conocen dentro de la
 *    ventana de previsión. Para una captura vieja NO se rellenan: se dejan a
 *    null. Estimarlas después sería inventarse la mitad del diario, y encima la
 *    mitad de la que uno saca conclusiones.
 *
 * Nada de esto lanza: una captura debe poder apuntarse aunque las fuentes estén
 * caídas. Lo que falte, falta, y se ve que falta.
 */
export interface CatchContext {
  /** Momento al que se refiere la foto, en ms UTC. */
  t: number
  luna: { fase: string; coeficiente: number; coeficienteTexto: string }
  marea: { subiendo: boolean | null; disponible: boolean }
  fondo: {
    sondaM: number | null
    /** Relieve dentro de la celda: el indicio de roca. */
    relieve: string | null
    sustrato: string | null
  }
  /** Solo si la captura cae dentro de la ventana de previsión. */
  mar: {
    disponible: boolean
    vientoKmh: number | null
    vientoDir: string | null
    olaM: number | null
    aguaC: number | null
    /** Puntuación de actividad que daba el sitio a esa hora. */
    actividad: number | null
  }
  /** Qué no se pudo averiguar y por qué. Se enseña, no se esconde. */
  faltan: string[]
}

/** Fuera de esta ventana el parte ya no cubre la fecha pedida. */
const DIAS_CON_PARTE = 10

/**
 * Reúne todo lo que se sabe de un punto en un instante.
 *
 * Las fuentes van en paralelo: son cuatro servicios distintos y en serie apuntar
 * una captura tardaría medio minuto.
 */
export async function buildCatchContext(
  lat: number,
  lon: number,
  dateISO: string,
  timeISO?: string | null,
): Promise<CatchContext> {
  const faltan: string[] = []
  // Sin hora se toma el mediodía: es un compromiso explícito, no un descuido.
  // Se apunta en `faltan` para que quien lea el patrón sepa que la marea de esa
  // captura es orientativa.
  const hora = timeISO && /^\d{2}:\d{2}$/.test(timeISO) ? timeISO : null
  if (!hora) faltan.push('hora de la captura')
  const t = new Date(`${dateISO}T${hora ?? '12:00'}:00Z`).getTime()

  const luna = lunarInfo(dateISO)
  const coef = tideCoefficient(luna.phase)

  const dias = Math.abs(Date.now() - t) / 86_400_000
  const dentroDeParte = dias <= DIAS_CON_PARTE

  const [tides, sonda, seabed, fc] = await Promise.all([
    getTides(lat, lon).catch(() => null),
    getSounding(lat, lon).catch(() => null),
    getSeabed(lat, lon).catch(() => null),
    dentroDeParte ? getForecastAt(lat, lon).catch(() => null) : Promise.resolve(null),
  ])

  // La hora del parte más cercana al momento de la captura.
  const hueco = fc?.available
    ? fc.hours.reduce<{ h: (typeof fc.hours)[number]; d: number } | null>((mejor, h) => {
        const d = Math.abs(h.time - t)
        return !mejor || d < mejor.d ? { h, d } : mejor
      }, null)
    : null
  // Más de tres horas de diferencia y ya no describe esa captura.
  const parte = hueco && hueco.d <= 3 * 3600_000 ? hueco.h : null
  if (!parte) {
    faltan.push(dentroDeParte ? 'viento y ola de ese momento' : 'viento y ola (la captura es anterior al parte disponible)')
  }
  if (sonda?.kind !== 'medida' && sonda?.kind !== 'aproximada') faltan.push('sonda del punto')
  if (!seabed?.substrate) faltan.push('tipo de fondo')

  return {
    t,
    luna: { fase: luna.name, coeficiente: coef, coeficienteTexto: coefficientLabel(coef) },
    marea: {
      // Subiendo o bajando solo se sabe con alturas reales contratadas.
      subiendo: tides?.available ? tideRisingAt(tides.all, t) : null,
      disponible: !!tides?.available,
    },
    fondo: {
      sondaM: sonda?.depthM ?? null,
      relieve: sonda && sonda.relief.kind !== 'desconocido' ? sonda.relief.kind : null,
      sustrato: seabed?.substrate ?? null,
    },
    mar: {
      disponible: !!parte,
      vientoKmh: parte?.windKmh ?? null,
      vientoDir: parte?.windDirLabel ?? null,
      olaM: parte?.waveM ?? null,
      aguaC: parte?.seaTempC ?? null,
      actividad: parte?.activity ?? null,
    },
    faltan,
  }
}
