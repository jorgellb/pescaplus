/* PescaPlus service worker — network-first, con modo pescador sin cobertura:
   las páginas de previsión que visitas quedan guardadas y se sirven tal cual
   (última consulta) si te quedas sin red en la playa o en el barco.

   LA CARTA NÁUTICA ES EL CASO QUE MÁS IMPORTA. A tres millas de la costa no hay
   4G, y es justo donde se usa: sonda, tipo de fondo, isóbatas, rampas. Sin esto
   la carta se queda en blanco precisamente cuando hace falta.

   QUÉ SE GUARDA Y QUÉ NO, Y POR QUÉ:

   - Las teselas que YA HAS MIRADO. Nunca se descargan zonas por adelantado: la
     política de uso de las teselas de OpenStreetMap lo prohíbe expresamente, y
     saltársela nos dejaría sin fuente. Lo que se guarda es lo que tu navegador
     ya había pedido para pintarte el mapa.
   - Las respuestas que NO cambian: la sonda de un punto y el tipo de fondo. El
     fondo del mar es el mismo mañana, así que se sirven de la caché sin más.
   - El parte del mar se guarda, pero se sirve de red primero: una previsión de
     ayer es mejor que nada, pero solo si lo de hoy no llega. */

const VERSION = 'pescaplus-v4'
const PAGES = 'pescaplus-pages-v4'
const TILES = 'pescaplus-tiles-v4'
const SEABED = 'pescaplus-seabed-v4'
const VIGENTES = [VERSION, PAGES, TILES, SEABED]

const OFFLINE_URL = '/offline.html'
const MAX_PAGES = 40
/* Unas 1.200 teselas son ~40 MB: cubre de sobra las zonas que uno frecuenta sin
   comerse el almacenamiento del móvil. */
const MAX_TILES = 1200
const MAX_SEABED = 800

/* Solo estos orígenes. Una lista blanca y no un comodín: así el service worker
   no se convierte en un almacén de lo que pida cualquier script de terceros. */
const SERVIDORES_DE_TESELAS = [
  'tile.openstreetmap.org',
  'tiles.openseamap.org',
  'tiles.emodnet-bathymetry.eu',
  'ows.emodnet-bathymetry.eu',
  'ows.emodnet-seabedhabitats.eu',
]

/* Respuestas propias que no cambian nunca: el fondo del mar no se mueve. */
const API_INMUTABLE = ['/api/sonda', '/api/fondo', '/api/puntos-nauticos']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll([OFFLINE_URL])).then(() =>
      /* La carta se guarda ya en la instalación. La primera navegación de un
         visitante ocurre ANTES de que el service worker exista, así que esa
         página no se llega a interceptar nunca: sin esto, quien entra por
         primera vez y se va al mar se encuentra la página de sin conexión. */
      caches.open(PAGES).then((cache) => cache.add('/carta').catch(() => {})),
    ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !VIGENTES.includes(k)).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

/** Páginas de herramientas que merece la pena guardar para usarlas sin red. */
function isToolPage(pathname) {
  return (
    pathname.startsWith('/mejores-horas') ||
    pathname.startsWith('/especies') ||
    pathname === '/donde-pescar' ||
    pathname === '/carta' ||
    pathname === '/diario' ||
    pathname === '/calendario'
  )
}

/** Recorta una caché por orden de llegada cuando pasa de su tope. */
async function recortar(nombre, tope) {
  const cache = await caches.open(nombre)
  const keys = await cache.keys()
  if (keys.length > tope) {
    await Promise.all(keys.slice(0, keys.length - tope).map((k) => cache.delete(k)))
  }
}

/**
 * Primero la caché, y de fondo se refresca.
 *
 * Es lo que corresponde a algo que no cambia: se pinta al instante, sin gastar
 * datos, y si hay red se actualiza para la próxima.
 */
async function cachePrimero(request, nombre, tope) {
  const cache = await caches.open(nombre)
  const guardada = await cache.match(request)
  const red = fetch(request)
    .then((res) => {
      // `opaque` es lo que devuelve una tesela sin CORS: no se puede leer su
      // estado, pero sirve igual para pintarla, así que se guarda.
      if (res && (res.ok || res.type === 'opaque')) {
        cache.put(request, res.clone()).then(() => recortar(nombre, tope))
      }
      return res
    })
    .catch(() => guardada)
  return guardada || red
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Teselas de la carta, de otros dominios. Se atienden ANTES del corte por
  // origen: son el motivo de que la carta funcione o no sin cobertura.
  if (SERVIDORES_DE_TESELAS.includes(url.hostname)) {
    event.respondWith(cachePrimero(request, TILES, MAX_TILES))
    return
  }

  if (url.origin !== self.location.origin) return

  // Navegación: primero la red; sin ella, la última copia guardada de ESA
  // página, y como último recurso la página de sin conexión.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok && isToolPage(url.pathname)) {
            const copy = res.clone()
            caches
              .open(PAGES)
              .then((cache) => cache.put(request, copy))
              .then(() => recortar(PAGES, MAX_PAGES))
          }
          return res
        })
        .catch(async () => {
          // Primero la copia exacta, con su consulta: es la que devuelve la
          // carta centrada donde estabas.
          const exacta = await caches.match(request, { ignoreSearch: false })
          if (exacta) return exacta
          // Si no, la misma página sin la consulta. La carta se abrirá en la
          // vista por defecto en vez de sobre tu zona, pero se abre — que es
          // infinitamente mejor que un aviso de sin conexión con el barco parado.
          const base = await caches.match(url.origin + url.pathname, { ignoreSearch: true })
          if (base) return base
          return caches.match(OFFLINE_URL)
        }),
    )
    return
  }

  // Sonda, tipo de fondo y puntos náuticos: el fondo del mar es el mismo
  // mañana, así que se sirven de la caché sin pensarlo.
  if (API_INMUTABLE.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(cachePrimero(request, SEABED, MAX_SEABED))
    return
  }

  // El parte del mar sí caduca: red primero, y lo guardado solo si no hay red.
  // Una previsión de ayer es mejor que un hueco, pero nunca mejor que la de hoy.
  if (url.pathname.startsWith('/api/condiciones')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone()
            caches.open(SEABED).then((cache) => cache.put(request, copy))
          }
          return res
        })
        .catch(async () => (await caches.match(request)) || Response.error()),
    )
    return
  }

  // Recursos de compilación, inmutables por su propio nombre.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cachePrimero(request, VERSION, 400))
  }
  // Lo demás pasa a la red sin tocarlo.
})
