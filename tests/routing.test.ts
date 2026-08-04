import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import nextConfig from '@/next.config'

/**
 * Vigila la combinación que tumbó la tienda entera en producción.
 *
 * `dynamicParams = false` significa «fuera de `generateStaticParams` no hay nada
 * que servir». Hace falta para que una URL inventada dé un 404 DE VERDAD: con un
 * simple `notFound()` en la página, Next prerenderiza y cachea esa respuesta
 * como una entrada normal de 200 — un "soft 404" indexable, y además un
 * rastreador pidiendo URLs inventadas va dejando una entrada en disco por cada
 * una. Comprobado con las dos formas.
 *
 * El precio es que, cuando la copia prerenderizada CADUCA, Next no tiene
 * respaldo que servir mientras regenera: responde `NoFallbackError` y un 404
 * para TODAS las rutas del grupo, incluidas las buenas.
 *
 * Normalmente no pasa, porque `expire` es un año y `revalidate` una hora: la
 * entrada queda obsoleta mucho antes de caducar y se sirve tal cual mientras se
 * refresca. Se rompió al poner `expireTime: 3600`, igual al `revalidate` de las
 * categorías, con lo que quedaban obsoletas y caducadas en el mismo instante.
 * La correlación medida en producción fue exacta:
 *
 *   /categories/senuelos   rev 3600 · exp 3600 · dynamicParams false  → 404
 *   /especies/dorada       rev 86400 · exp 3600 · dynamicParams false → 200
 *   /mejores-horas/tarifa  sin ISR   · dynamicParams true             → 200
 *   /                      rev 3600 · exp 3600 · dynamicParams true   → 200
 *
 * Hacen falta las DOS condiciones. Esta prueba impide que vuelvan a juntarse.
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

/** Páginas con `dynamicParams = false`, con el `revalidate` que declaran. */
function sinRespaldo(): { fichero: string; revalidate: number | null }[] {
  return paginas(join(process.cwd(), 'app'))
    .map((f) => ({ f, texto: readFileSync(f, 'utf8') }))
    .filter(({ texto }) => /export const dynamicParams\s*=\s*false/.test(texto))
    .map(({ f, texto }) => {
      const m = /export const revalidate\s*=\s*(\d+)/.exec(texto)
      return { fichero: relative(process.cwd(), f), revalidate: m ? Number(m[1]) : null }
    })
}

describe('enrutado y caducidad de la caché', () => {
  const paginasSinRespaldo = sinRespaldo()

  it('las páginas que dependen de dynamicParams=false siguen ahí', () => {
    // Si alguien las quita, el 404 real deja de serlo. Que salte para revisarlo.
    expect(paginasSinRespaldo.map((p) => p.fichero).sort()).toEqual([
      'app/categories/[category]/page.tsx',
      'app/especies/[slug]/page.tsx',
    ])
  })

  it('ninguna de ellas puede caducar a la vez que queda obsoleta', () => {
    const expire = nextConfig.expireTime
    if (expire === undefined) return // el valor por defecto (un año) es seguro

    for (const { fichero, revalidate } of paginasSinRespaldo) {
      expect(
        revalidate,
        `${fichero} usa dynamicParams=false sin declarar revalidate: no se puede comprobar`,
      ).not.toBeNull()
      expect(
        expire,
        `${fichero}: expireTime (${expire}) debe ser MAYOR que su revalidate (${revalidate}).
Si no, la entrada caduca en el mismo instante en que queda obsoleta y Next
responde NoFallbackError → 404 en todas las rutas del grupo, también las buenas.`,
      ).toBeGreaterThan(revalidate!)
    }
  })
})
