import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PescaPlus — Tienda de Pesca con IA',
    short_name: 'PescaPlus',
    description: 'Aparejos de pesca seleccionados de AliExpress con fichas optimizadas por IA.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f2efe6',
    theme_color: '#111111',
    lang: 'es',
    categories: ['shopping', 'sports'],
  }
}
