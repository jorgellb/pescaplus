/* PescaPlus service worker — network-first, con modo pescador sin cobertura:
   las páginas de previsión que visitas quedan guardadas y se sirven tal cual
   (última consulta) si te quedas sin red en la playa o en el barco. */
const VERSION = 'pescaplus-v2'
const PAGES = 'pescaplus-pages-v2'
const OFFLINE_URL = '/offline.html'
const MAX_PAGES = 40

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll([OFFLINE_URL])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== PAGES).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

/** Forecast-tool pages worth keeping for offline reuse. */
function isToolPage(pathname) {
  return (
    pathname.startsWith('/mejores-horas') ||
    pathname.startsWith('/especies') ||
    pathname === '/donde-pescar' ||
    pathname === '/diario' ||
    pathname === '/calendario'
  )
}

async function trimPages() {
  const cache = await caches.open(PAGES)
  const keys = await cache.keys()
  if (keys.length > MAX_PAGES) {
    // FIFO: drop the oldest entries beyond the cap.
    await Promise.all(keys.slice(0, keys.length - MAX_PAGES).map((k) => cache.delete(k)))
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigations: network first; if offline, the last saved copy of THAT page,
  // and as a last resort the offline page (which lists what IS saved).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok && isToolPage(url.pathname)) {
            const copy = res.clone()
            caches
              .open(PAGES)
              .then((cache) => cache.put(request, copy))
              .then(trimPages)
          }
          return res
        })
        .catch(async () => (await caches.match(request, { ignoreSearch: false })) || caches.match(OFFLINE_URL)),
    )
    return
  }

  // Immutable build assets: cache-first (stale-while-revalidate).
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = await cache.match(request)
        const network = fetch(request)
          .then((res) => {
            if (res && res.status === 200) cache.put(request, res.clone())
            return res
          })
          .catch(() => cached)
        return cached || network
      }),
    )
  }
  // Everything else (API, images, HTML data) passes through to the network.
})
