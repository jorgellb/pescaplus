import { esBot } from '@/lib/analytics'

/**
 * Quién pasa de `/go/[id]` a la tienda y quién se queda en un puente.
 *
 * Por qué existe: en octubre-noviembre de 2026 el 98,6 % de los clics de
 * afiliado eran robots. 2.280 de 2.312 venían de visitantes que ese día no
 * habían abierto ni una página, y uno pulsó 429 productos en 5 minutos. Los
 * botones son enlaces normales, así que cualquier programa que descarga la web
 * y sigue sus enlaces «compraba» el catálogo entero. `robots.txt` ya prohíbe
 * `/go/`, pero esos programas no lo leen y se presentan como un Chrome normal,
 * así que `esBot` tampoco los para.
 *
 * El daño era doble: el panel y el ranking de «lo más buscado» se llenaban de
 * ruido, y a la tienda le llegaban miles de clics sin compra, que es lo que un
 * programa de afiliados trata como tráfico no válido.
 *
 * La regla:
 *  - **Directo a la tienda** si el navegador dice que el clic sale de una
 *    página de la propia web (`Sec-Fetch-Site: same-origin`). Lo mandan todos
 *    los navegadores actuales, incluido el WebView de la app, y un programa que
 *    pide la URL por su cuenta no lo manda. Para una persona no cambia nada.
 *  - **Puente** en cualquier otro caso: una página mínima que salta sola con
 *    JavaScript. Quien no ejecuta JavaScript —casi todos los rastreadores— se
 *    queda ahí, sin contar como clic y sin llegar a la tienda.
 *  - **Parada** para los bots que se declaran y para un salto del puente que no
 *    convence: la misma página pero SIN script. Un salto que vuelve al puente
 *    entra en bucle; se vio con Chrome sin ventana, que ejecuta el script y se
 *    anuncia como «HeadlessChrome».
 */

export interface SenalesSalida {
  ua: string
  /** `Sec-Fetch-Site`: same-origin | same-site | cross-site | none, o vacío en navegadores antiguos. */
  secFetchSite: string
  secFetchMode: string
  /** `Sec-Purpose` (o el antiguo `Purpose`): «prefetch» cuando el navegador solo precarga. */
  secPurpose: string
  /** El enlace trae la marca que pone el puente al saltar. */
  confirmada: boolean
}

export type DecisionSalida = 'tienda' | 'puente' | 'parada'

/** Parámetro que añade el puente al saltar. */
export const MARCA_PUENTE = 'vale'

export function senalesDe(h: Headers, url: URL): SenalesSalida {
  return {
    ua: h.get('user-agent') || '',
    secFetchSite: (h.get('sec-fetch-site') || '').toLowerCase(),
    secFetchMode: (h.get('sec-fetch-mode') || '').toLowerCase(),
    secPurpose: (h.get('sec-purpose') || h.get('purpose') || '').toLowerCase(),
    confirmada: url.searchParams.get(MARCA_PUENTE) === '1',
  }
}

export function decidirSalida(s: SenalesSalida): DecisionSalida {
  if (esBot(s.ua)) return 'parada'
  // Una precarga no es un clic: contarla inventaría compradores.
  const precarga = /prefetch|prerender/.test(s.secPurpose)

  if (s.confirmada) {
    // El puente salta desde la propia web. Un navegador antiguo no manda la
    // cabecera y se acepta; uno actual que dice venir de fuera, no. Y nunca se
    // devuelve otro puente: sería un bucle.
    if (precarga) return 'parada'
    return s.secFetchSite === '' || s.secFetchSite === 'same-origin' ? 'tienda' : 'parada'
  }

  // La precarga recibe el puente: si la persona pulsa después, el navegador
  // reutiliza esa página y el script salta entonces.
  if (precarga) return 'puente'
  return s.secFetchSite === 'same-origin' && (s.secFetchMode === '' || s.secFetchMode === 'navigate')
    ? 'tienda'
    : 'puente'
}

/** Ruta interna fiable o vacía: nada de `//otro.com` ni URLs completas. */
function rutaInterna(valor: string): string {
  if (!valor.startsWith('/') || valor.startsWith('//') || valor.startsWith('/go/') || valor.length > 200) return ''
  return valor.split('?')[0].split('#')[0]
}

/**
 * La página desde la que se pulsó. Tras el puente, el Referer ya es el propio
 * `/go/…`, así que el puente la pasa en el enlace (`desde`).
 */
export function origenDeLaSalida(url: URL, referer: string): string {
  const desde = url.searchParams.get('desde')
  if (url.searchParams.get(MARCA_PUENTE) === '1' && desde !== null) return rutaInterna(desde)
  try {
    return referer ? rutaInterna(new URL(referer).pathname) : ''
  } catch {
    return ''
  }
}

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/**
 * El puente. No lleva ningún enlace a `/go/` ni la URL del salto escrita tal
 * cual: un rastreador recoge los `href`, no ejecuta scripts, y así no encuentra
 * por dónde seguir. Tampoco nombra la tienda.
 *
 * Con `saltar = false` es la parada: sin script, solo la vuelta a la ficha.
 */
export function paginaPuente(id: string, saltar = true): string {
  const ficha = `/products/${escapar(encodeURIComponent(id))}`
  const cuerpo = saltar
    ? `<p>Te llevamos a la tienda…</p>
<noscript><p>Para continuar necesitas activar JavaScript. <a href="${ficha}">Volver al producto</a></p></noscript>
<script>
  (function () {
    function saltar() {
      var u = new URL(location.href);
      u.searchParams.set('${MARCA_PUENTE}', '1');
      try {
        var r = new URL(document.referrer);
        if (r.origin === location.origin && r.pathname.indexOf('/go/') !== 0) u.searchParams.set('desde', r.pathname);
      } catch (e) {}
      location.replace(u.pathname + u.search);
    }
    // Si el navegador solo la está precargando, se espera a que la persona la abra.
    if (document.prerendering) document.addEventListener('prerenderingchange', saltar, { once: true });
    else saltar();
  })();
</script>`
    : `<p>No hemos podido abrir la tienda. <a href="${ficha}">Vuelve al producto</a> e inténtalo de nuevo.</p>`
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Abriendo la tienda · PescaPlus</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#fff;color:#0f172a}
  p{margin:0 16px;text-align:center;font-size:17px}
  a{color:#0a7d72}
  @media (prefers-color-scheme:dark){body{background:#0b1220;color:#e2e8f0}a{color:#5eead4}}
</style>
</head>
<body>
${cuerpo}
</body>
</html>`
}
