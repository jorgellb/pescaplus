/* PescaPlus service worker — conservative, network-first with offline fallback. */
const VERSION = 'pescaplus-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll([OFFLINE_URL])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigations: try the network, fall back to the cached offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
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
