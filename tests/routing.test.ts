import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'

/**
 * `dynamicParams = false` NO se puede usar en este proyecto.
 *
 * Le dice a Next que fuera de `generateStaticParams` no hay nada que servir. El
 * problema no es la generación: es que cuando la copia prerenderizada se marca
 * OBSOLETA, Next tiene que regenerarla y no encuentra respaldo que mostrar entre
 * tanto, así que responde `NoFallbackError` y un 404 para TODAS las rutas del
 * grupo, incluidas las buenas.
 *
 * Medido en producción, no deducido: se reinició el contenedor y se vigiló
 * `/categories/senuelos` cada 60 s.
 *
 *     +  0 s  200      +183 s  200
 *     + 61 s  200      +246 s  200
 *     +122 s  200      +307 s  404   ← y ya no vuelve
 *
 * Se rompe a los ~300 s, que es exactamente el `x-nextjs-stale-time: 300` de las
 * cabeceras. La tienda llevaba así desde el principio: viva cinco minutos
 * después de cada despliegue y caída el resto del tiempo.
 *
 * El precio de quitarla es que `notFound()` responde 200 en vez de 404 —medido
 * en la primera petición, no es un efecto de la caché—, así que las URLs
 * inventadas se marcan `noindex` en `generateMetadata`. Entre un soft 404 en
 * direcciones que nadie enlaza y la tienda caída, no hay discusión.
 */
function paginas(dir: string): string[] {
  const salida: string[] = []
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada)
    if (statSync(ruta).isDirectory()) salida.push(...paginas(ruta))
    else if (entrada === 'page.tsx') salida.push(ruta)
  }
  return salida
}

describe('enrutado', () => {
  it('ninguna página usa dynamicParams = false', () => {
    const culpables = paginas(join(process.cwd(), 'app'))
      .filter((f) => /export const dynamicParams\s*=\s*false/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(process.cwd(), f))

    expect(
      culpables,
      `Con la caché obsoleta devuelve 404 tambien en las rutas buenas
(NoFallbackError), a los ~300 s de cada despliegue. Usa notFound() y marca
noindex en generateMetadata. Ficheros:\n${culpables.join('\n')}`,
    ).toEqual([])
  })

  /**
   * Toda página que pueda llamar a `notFound()` tiene que marcar `noindex` en
   * sus metadatos.
   *
   * Motivo: `notFound()` responde 200, no 404 (medido). Sin el noindex, una URL
   * inventada es una página viva y vacía para Google. Y no es un caso raro: la
   * malla /pesca/[especie]/[zona] admite 30 especies x 195 zonas = 5.850
   * combinaciones y solo 1.123 existen, así que había 4.727 páginas fantasma
   * respondiendo "index, follow" — más cualquier slug que alguien se inventara.
   */
  it('toda página con notFound() marca noindex en sus metadatos', () => {
    const app = join(process.cwd(), 'app')
    const sinNoindex = paginas(app)
      .filter((f) => readFileSync(f, 'utf8').includes('notFound()'))
      .filter((f) => {
        // Los metadatos pueden estar en la propia página o en su layout.
        const layout = join(dirname(f), 'layout.tsx')
        const fuentes = [readFileSync(f, 'utf8')]
        if (existsSync(layout)) fuentes.push(readFileSync(layout, 'utf8'))
        return !fuentes.some((s) => /robots:\s*\{\s*index:\s*false/.test(s))
      })
      .map((f) => relative(process.cwd(), f))

    expect(
      sinNoindex,
      `Estas páginas pueden responder 200 con la página de "no encontrado" y
dejar que Google la indexe. Añade robots: { index: false, follow: false } al
return del caso que no existe, en generateMetadata:\n${sinNoindex.join('\n')}`,
    ).toEqual([])
  })
})
