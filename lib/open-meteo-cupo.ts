/**
 * Pausa compartida tras un 429 de Open-Meteo.
 *
 * El cupo gratuito es por IP (600 llamadas por minuto, 5.000 por hora y
 * 10.000 al día) y todo el servidor comparte una: la previsión de cada zona, el
 * ranking y la comparativa de modelos tiran del mismo cupo. Next solo guarda en
 * caché las respuestas buenas, así que tras un 429 cada visita volvía a llamar
 * y alargaba el corte. Ahora, tras un 429, nadie llama hasta que pasa la pausa;
 * mientras, cada parte usa su último dato bueno.
 *
 * La pausa depende del cupo agotado, que Open-Meteo dice en `reason`: un minuto
 * si es el de minuto, más si es el de hora o el del día. Vive en memoria del
 * proceso: un reinicio la olvida, y en el peor caso se gasta una llamada más.
 */

const PAUSA_POR_DEFECTO_MS = 5 * 60_000
let pausaHasta = 0

export function openMeteoEnPausa(): boolean {
  return Date.now() < pausaHasta
}

function pausaPara(motivo: string): number {
  if (/minut/i.test(motivo)) return 60_000
  if (/hour/i.test(motivo)) return 10 * 60_000
  if (/dai|day/i.test(motivo)) return 30 * 60_000
  return PAUSA_POR_DEFECTO_MS
}

/** Anota la respuesta: si es un 429, pausa las llamadas de todo el servidor. */
export async function anotarRespuestaOpenMeteo(res: Response): Promise<void> {
  if (res.status !== 429) return
  let motivo = ''
  try {
    motivo = String(((await res.clone().json()) as { reason?: string }).reason ?? '')
  } catch {
    /* sin cuerpo legible: pausa por defecto */
  }
  pausaHasta = Math.max(pausaHasta, Date.now() + pausaPara(motivo))
  console.warn(`[OPEN-METEO] cupo agotado (${motivo || 'sin motivo'}); pausa hasta ${new Date(pausaHasta).toISOString()}`)
}
