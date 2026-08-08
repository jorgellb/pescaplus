import crypto from 'crypto'

/**
 * Analítica propia: recogida y normalización.
 *
 * Hasta ahora solo se medía `ProductClick`, o sea la ÚLTIMA milla. Se sabía
 * cuántos clics de afiliado había pero no de dónde salían: ni visitas, ni
 * procedencia, ni qué contenido se leía, ni qué herramienta acababa en clic. Se
 * medía la conversión sin conocer el embudo.
 *
 * Dos ideas mandan aquí:
 *
 *  1. **Normalizar al entrar, no al consultar.** Si `/products/anzuelo-x` y
 *     `/products/anzuelo-y` entran tal cual, agrupar por página es imposible sin
 *     escanear la tabla entera. Se guarda `/products/:id` y ya está agrupado.
 *  2. **Sin cookies ni IP.** El visitante es un hash con sal que cambia cada
 *     día: cuenta únicos de una jornada y no vale para seguir a nadie entre
 *     días. Eso mantiene la analítica fuera del consentimiento de cookies, que
 *     es justo lo que hunde la tasa de medición de todo el mundo.
 */

export type TipoEvento = 'pageview' | 'salida' | 'vital' | 'afiliado' | 'herramienta' | 'busqueda' | 'error'

/** Los ids se sustituyen para poder agrupar por página en vez de por URL. */
const PATRONES: [RegExp, string][] = [
  [/^\/products\/[^/]+$/, '/products/:id'],
  [/^\/especies\/[^/]+$/, '/especies/:especie'],
  [/^\/pesca\/([^/]+)\/[^/]+$/, '/pesca/:especie/:zona'],
  [/^\/mejores-horas\/[^/]+$/, '/mejores-horas/:punto'],
  [/^\/mejores\/[^/]+$/, '/mejores/:slug'],
  [/^\/guias\/[^/]+$/, '/guias/:slug'],
  [/^\/categories\/[^/]+\/[^/]+$/, '/categories/:cat/:sub'],
  [/^\/categories\/[^/]+$/, '/categories/:cat'],
  [/^\/quedadas\/[^/]+$/, '/quedadas/:id'],
  [/^\/charters\/[^/]+$/, '/charters/:id'],
]

export function normalizarRuta(entrada: string): string {
  let p = (entrada || '/').split('?')[0].split('#')[0]
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  if (!p.startsWith('/')) p = '/' + p
  for (const [re, destino] of PATRONES) if (re.test(p)) return destino
  // Cualquier cosa rarísima se recorta: evita que una URL basura infle la tabla.
  return p.slice(0, 120)
}

const BUSCADORES = /google|bing|duckduckgo|yahoo|ecosia|yandex|baidu|qwant|brave/i
const SOCIALES = /facebook|instagram|twitter|^t\.co$|x\.com|tiktok|youtube|whatsapp|telegram|reddit|linkedin|pinterest/i

/**
 * De dónde viene la visita. Se decide UNA vez, al registrar, para que el panel
 * no tenga que reinterpretar cadenas de referrer cada vez que se consulta.
 */
export function canalDe(referrer: string, url: string, propioHost: string): { canal: string; ref: string } {
  let utm = ''
  try {
    utm = new URL(url, `https://${propioHost}`).searchParams.get('utm_source') || ''
  } catch {
    /* url rara: se ignora */
  }
  if (utm) return { canal: 'campaña', ref: utm.toLowerCase().slice(0, 60) }

  let host = ''
  try {
    host = referrer ? new URL(referrer).hostname.replace(/^www\./, '') : ''
  } catch {
    /* referrer no es una URL */
  }
  if (!host) return { canal: 'directo', ref: '' }
  // Navegación dentro del propio sitio: no es una procedencia.
  if (host === propioHost.replace(/^www\./, '')) return { canal: 'interno', ref: '' }
  if (BUSCADORES.test(host)) return { canal: 'organico', ref: host.slice(0, 60) }
  if (SOCIALES.test(host)) return { canal: 'social', ref: host.slice(0, 60) }
  return { canal: 'referido', ref: host.slice(0, 60) }
}

const BOTS = /bot|crawler|spider|crawling|slurp|facebookexternalhit|preview|monitor|curl|wget|python-requests|axios|headless|lighthouse|pingdom|uptime|semrush|ahrefs|dataprovider|screaming/i

/** Filtra en la puerta: un bot contado como visita estropea todas las tasas. */
export function esBot(ua: string): boolean {
  if (!ua || ua.length < 12) return true
  return BOTS.test(ua)
}

export function dispositivoDe(ua: string): string {
  if (/ipad|tablet|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobi|android|iphone|ipod|windows phone/i.test(ua)) return 'movil'
  return 'escritorio'
}

/**
 * Identificador de visitante: anónimo y de un solo día.
 *
 * Incluye la fecha en Madrid, así que a medianoche cambia y el mismo navegador
 * pasa a ser otro. Es a propósito: permite contar «únicos de hoy» sin construir
 * un historial de nadie, y por eso no hace falta banner de consentimiento.
 */
export function hashVisitante(ip: string, ua: string): string {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', dateStyle: 'short' }).format(new Date())
  const sal = process.env.ADMIN_SESSION_SECRET || 'pescaplus-analitica'
  return crypto.createHash('sha256').update(`${dia}|${sal}|${ip}|${ua}`).digest('hex').slice(0, 32)
}

/** Día en Madrid (AAAA-MM-DD). Los agregados van en hora local, no en UTC. */
export function diaMadrid(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', dateStyle: 'short' }).format(d)
}
