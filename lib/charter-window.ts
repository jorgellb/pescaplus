import { solunarDay, type SolunarDay } from '@/lib/solunar'
import { getSpot } from '@/lib/fishing-spots'
import { fmtTime } from '@/lib/solunar-format'

/**
 * La ventana de pesca de una salida: qué se espera del día en el que sale ese
 * barco, en esa zona.
 *
 * Es lo que ninguna otra plataforma de chárters enseña. Se vende una salida por
 * la foto del barco y el precio; nadie te dice si ese día pica. Nosotros ya
 * calculamos la actividad solunar por zona y fecha, así que la salida puede
 * llevarla en la propia tarjeta.
 *
 * DELIBERADAMENTE SIN RED. `solunarDay` es cálculo astronómico local y
 * memoizado: sol, luna, tránsitos y periodos de actividad. Eso permite ponerlo
 * en cada tarjeta de un listado sin coste. El viento y el estado del mar SÍ
 * necesitan API, así que se quedan donde ya estaban — en la ficha de la salida,
 * una llamada por página y no una por tarjeta. Es justo la diferencia entre un
 * listado gratis y uno que se come la CPU del servidor, que ya nos costó el
 * despliegue una vez.
 */
export interface CharterWindow {
  /** 1..5, actividad esperada del día. */
  rating: number
  /** Etiqueta corta y honesta del día. */
  label: string
  /** Mejor tramo del día, ya formateado («07:12–09:40»), o null si no hay. */
  best: string | null
  /** Fracción iluminada de la luna, 0..1. */
  moonIllumination: number
  moonPhaseName: string
  /** Periodos del día normalizados a fracción [0..1] del día, para pintarlos. */
  periods: { kind: 'mayor' | 'menor'; from: number; to: number }[]
  /** Amanecer y ocaso como fracción del día, para situar la franja de luz. */
  daylight: { from: number; to: number } | null
}

/**
 * Etiquetas del 1 al 5. Se evita el superlativo: prometer «excelente» un día que
 * luego sale malo es la forma más rápida de perder la confianza de un pescador,
 * y aquí hay dinero de por medio.
 */
const LABELS = ['', 'Día flojo', 'Día discreto', 'Día correcto', 'Buen día', 'Gran día'] as const

/**
 * Fracción [0..1] del día que ocupa un instante, en hora LOCAL de Madrid.
 *
 * Se saca de la hora local formateada y no restando medianoche UTC: España va
 * una o dos horas por delante según la estación, así que restar sobre UTC
 * desplazaría toda la franja — y justo en los cambios de hora, que es cuando
 * nadie lo miraría.
 */
const RELOJ = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function fraccionDelDia(ms: number): number {
  const [h, m] = RELOJ.format(new Date(ms)).split(':').map(Number)
  return Math.min(1, Math.max(0, (h * 60 + m) / 1440))
}

export function charterWindow(spotSlug: string, dateISO: string): CharterWindow | null {
  const spot = getSpot(spotSlug)
  if (!spot) return null

  let dia: SolunarDay
  try {
    dia = solunarDay(spot.lat, spot.lon, dateISO)
  } catch {
    // Una fecha imposible no debe tumbar un listado entero.
    return null
  }

  const mayores = dia.periods.filter((p) => p.kind === 'mayor')
  const mejor = mayores[0] ?? dia.periods[0] ?? null

  return {
    rating: dia.rating,
    label: LABELS[Math.min(5, Math.max(1, Math.round(dia.rating)))] ?? '',
    best: mejor ? `${fmtTime(mejor.start)}–${fmtTime(mejor.end)}` : null,
    moonIllumination: dia.moonIllumination,
    moonPhaseName: dia.moonPhaseName,
    periods: dia.periods.map((p) => ({
      kind: p.kind,
      from: fraccionDelDia(p.start),
      to: fraccionDelDia(p.end),
    })),
    daylight:
      dia.sunrise && dia.sunset
        ? { from: fraccionDelDia(dia.sunrise), to: fraccionDelDia(dia.sunset) }
        : null,
  }
}

/**
 * Zonas emblemáticas para chárter, la lista corta que se mira en la portada.
 *
 * Se recorre una lista CURADA y no las 197 zonas del sitio a propósito:
 * `solunarDay` avanza minuto a minuto sobre el día, así que son ~1.440 vueltas
 * por zona. Con doce sale gratis; con doscientas serían cientos de miles de
 * iteraciones en cada regeneración, y en un servidor de 2 núcleos eso ya no es
 * gratis. Es exactamente el tipo de cálculo que nos costó el despliegue en
 * Vercel.
 */
export const ZONAS_CHARTER = [
  'tarifa', 'estepona', 'denia', 'palma', 'eivissa',
  'a-coruna', 'vigo', 'santander', 'cadiz', 'alicante',
  'arrecife', 'santa-cruz-tenerife',
] as const

/** La zona con mejor pinta hoy, de la lista corta. Null si ninguna resuelve. */
export function bestSpotToday(dateISO: string): { slug: string; window: CharterWindow } | null {
  let mejor: { slug: string; window: CharterWindow } | null = null
  for (const slug of ZONAS_CHARTER) {
    const window = charterWindow(slug, dateISO)
    if (!window) continue
    if (!mejor || window.rating > mejor.window.rating) mejor = { slug, window }
  }
  return mejor
}
