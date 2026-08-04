import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import nextConfig from '@/next.config'

/**
 * Guarda la regla que impide que vuelva a pasar lo de la migración: si
 * `expireTime` supera al `revalidate` más corto de la aplicación, Next añade
 * `stale-while-revalidate` a la cabecera y el navegador vuelve a servir HTML
 * viejo de una compilación anterior — con lo que pide ficheros de /_next/static
 * que ya no existen y la web se ve sin estilos ni imágenes.
 *
 * La condición está en `getCacheControlHeader`, en el propio Next:
 *   revalidate < expire  →  `, stale-while-revalidate=${expire - revalidate}`
 */
function revalidatesDeclarados(dir: string): number[] {
  const encontrados: number[] = []
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada)
    if (statSync(ruta).isDirectory()) {
      encontrados.push(...revalidatesDeclarados(ruta))
    } else if (/\.tsx?$/.test(entrada)) {
      for (const m of readFileSync(ruta, 'utf8').matchAll(/export const revalidate = (\d+)/g)) {
        encontrados.push(Number(m[1]))
      }
    }
  }
  return encontrados
}

describe('cabeceras de caché', () => {
  const revalidates = revalidatesDeclarados(join(process.cwd(), 'app'))

  it('la aplicación declara algún revalidate (si no, esta prueba no vigila nada)', () => {
    expect(revalidates.length).toBeGreaterThan(0)
  })

  it('expireTime no supera al revalidate más corto, para que no haya stale-while-revalidate', () => {
    const minimo = Math.min(...revalidates)
    expect(nextConfig.expireTime).toBeDefined()
    expect(nextConfig.expireTime!).toBeLessThanOrEqual(minimo)
  })
})
