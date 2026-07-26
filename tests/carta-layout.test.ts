import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * El bug que motiva estas pruebas: la carta se veía como un recuadro vacío en
 * TODOS los navegadores, escritorio y móvil, sin un solo error en consola.
 *
 * Causa: MapLibre añade la clase `maplibregl-map` a su contenedor, y su hoja de
 * estilos declara `position:relative` con la misma especificidad que el
 * `.absolute` de Tailwind. Como el componente se carga con `next/dynamic`, su
 * CSS se inyecta DESPUÉS del de la app, así que ganaba MapLibre: el div se
 * quedaba estático, `inset:0` dejaba de darle altura, y el mapa entero —los
 * controles de zoom incluidos— desaparecía tras su propio `overflow:hidden`.
 *
 * Aparte, `h-[calc(100vh-4rem)]` ni siquiera llegaba a generarse: Tailwind v4
 * exige subrayados en los espacios de un valor arbitrario.
 *
 * Nada de esto lo ve un test de comportamiento, y en el navegador no deja
 * rastro: solo un hueco gris. Así que se fija por el código fuente.
 */
const dir = join(__dirname, '..', 'components', 'carta')
const chart = readFileSync(join(dir, 'NauticalChart.tsx'), 'utf8')
const loader = readFileSync(join(dir, 'ChartLoader.tsx'), 'utf8')

describe('carta — el contenedor no puede depender del orden de las hojas', () => {
  it('el div del mapa se posiciona inline, no con clases de Tailwind', () => {
    const holder = chart.match(/<div ref=\{holder\}[^/]*\/>/)?.[0]
    expect(holder, 'no se encuentra el div contenedor del mapa').toBeTruthy()
    expect(holder).toContain("position: 'absolute'")
    expect(holder).toContain('inset: 0')
    // Si vuelven las clases, vuelve el recuadro vacío.
    expect(holder).not.toMatch(/className=/)
  })

  it('el marco lleva altura inline: como clase no se genera', () => {
    for (const [nombre, src] of [['NauticalChart', chart], ['ChartLoader', loader]] as const) {
      expect(src, `${nombre}: la altura debe ir inline`).toContain("height: 'calc(100vh - 4rem)'")
      expect(src, `${nombre}: hace falta un suelo de altura`).toContain('minHeight')
    }
  })

  it('ningún className usa la utilidad que Tailwind v4 no llega a emitir', () => {
    // Se miran solo los className: los comentarios citan la clase rota a
    // propósito, para explicar por qué no debe volver.
    for (const [nombre, src] of [['NauticalChart', chart], ['ChartLoader', loader]] as const) {
      const clases = [...src.matchAll(/className="([^"]*)"/g)].map((m) => m[1])
      const rotas = clases.filter((c) => /-\[calc\([^\]]*[^_\s]-[^_\s]/.test(c))
      expect(rotas, `${nombre}: valor arbitrario sin subrayados → no se genera CSS`).toEqual([])
    }
  })

  it('un fallo al construir el mapa se cuenta, no se traga', () => {
    // Antes, una excepción aquí dejaba el hueco gris sin explicación alguna.
    expect(chart).toMatch(/try\s*\{/)
    expect(chart).toMatch(/catch\s*\(/)
    expect(chart).toContain('setFatal')
  })
})
