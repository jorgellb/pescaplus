import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

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

  it('las rutas con lista fija marcan noindex lo que no existe', () => {
    // Sin esto, una URL inventada responde 200 con la página de "no encontrado"
    // y Google puede indexarla como página real.
    const cat = readFileSync(join(process.cwd(), 'app/categories/[category]/layout.tsx'), 'utf8')
    expect(cat).toMatch(/robots:\s*\{\s*index:\s*false/)
    const esp = readFileSync(join(process.cwd(), 'app/especies/[slug]/page.tsx'), 'utf8')
    expect(esp).toMatch(/robots:\s*\{\s*index:\s*false/)
  })
})
