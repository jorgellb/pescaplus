'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { medirHerramienta } from '@/lib/medir'
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
    <div className="w-full flex items-center justify-center bg-ink/[0.03]" style={{ height: 'calc(100vh - 4rem)', minHeight: '420px' }}>
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
  /*
   * Aquí sí se mide al abrir, al revés que en /aqui.
   *
   * La carta es una herramienta de lectura: mirar el fondo, las isóbatas y el
   * balizamiento YA es usarla, no hace falta pulsar nada. En /aqui, en cambio,
   * entrar sin consultar un punto no es usar nada, y por eso allí se mide la
   * consulta.
   */
  useEffect(() => {
    medirHerramienta('carta')
  }, [])

  return <NauticalChart {...props} />
}
