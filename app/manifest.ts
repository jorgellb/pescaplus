import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PescaPlus — Tienda de pesca online',
    short_name: 'PescaPlus',
    description: 'Cañas, carretes, señuelos y aparejos de pesca seleccionados por expertos, con guías y un asesor para cada modalidad.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f2efe6',
    theme_color: '#111111',
    lang: 'es',
    categories: ['shopping', 'sports'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
