'use client'

import dynamic from 'next/dynamic'
import type { ChartProvider } from '@/lib/chart-providers'

/**
 * Carga la carta SOLO en el navegador.
 *
 * MapLibre toca `window` y `document` al evaluarse, así que importarlo desde un
 * módulo que Next también renderiza en servidor es pedir problemas: basta con
 * que algo falle durante el SSR para que el componente no llegue a montar y la
 * página quede en blanco sin decir por qué.
 */
const NauticalChart = dynamic(() => import('./NauticalChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[calc(100vh-4rem)] min-h-[420px] flex items-center justify-center bg-ink/[0.03]">
      <p className="text-[15px] text-ink/60">Cargando la carta…</p>
    </div>
  ),
})

export default function ChartLoader(props: {
  provider: ChartProvider
  attribution: string
  initial: { lon: number; lat: number; zoom: number }
  loggedIn: boolean
}) {
  return <NauticalChart {...props} />
}
