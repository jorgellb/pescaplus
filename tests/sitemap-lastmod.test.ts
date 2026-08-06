import { describe, it, expect } from 'vitest'
import sitemap from '@/app/sitemap'
import { getSpeciesGuide } from '@/lib/species-guides'

/**
 * El `lastmod` del sitemap tiene que ser VERDAD.
 *
 * Durante meses todas las URLs llevaron `lastModified: now`, la hora del build:
 * 1.768 páginas anunciando un cambio cada vez que se desplegaba. Google
 * documenta que un `lastmod` que no se corresponde con cambios reales termina
 * ignorándose para el sitio entero, y entonces deja de servir justo cuando de
 * verdad reescribes algo — que es exactamente lo que acabábamos de hacer con las
 * fichas de especie y la malla.
 *
 * Es un fallo invisible: el XML se genera igual de bien mintiendo. Solo se ve
 * comparando fechas entre URLs, así que se comprueba aquí.
 */
describe('lastmod del sitemap', () => {
  it('no le pone la misma fecha a todo el sitio', async () => {
    const urls = await sitemap()
    const fechas = new Set(
      urls
        .map((u) => u.lastModified)
        .filter((f): f is Date | string => f !== undefined)
        .map((f) => new Date(f).toISOString()),
    )
    // Con `now` en todas partes esto valía 1. Debe haber varias fechas reales.
    expect(fechas.size).toBeGreaterThan(1)
  })

  it('las fichas de especie llevan la fecha de SU guía, no la del build', async () => {
    const urls = await sitemap()
    const dorada = urls.find((u) => u.url.endsWith('/especies/dorada'))
    expect(dorada).toBeDefined()

    const guia = getSpeciesGuide('dorada')
    expect(guia).not.toBeNull()
    expect(new Date(dorada!.lastModified!).toISOString()).toBe(new Date(guia!.generatedAt).toISOString())
  })

  it('lo que no tiene fecha conocida va SIN lastmod, no con una inventada', async () => {
    const urls = await sitemap()
    // Las páginas legales no cambian cuando se despliega; mentir sobre ellas es
    // lo que quema la credibilidad del resto del fichero.
    for (const ruta of ['/privacidad', '/cookies', '/aviso-legal']) {
      const u = urls.find((x) => x.url.endsWith(ruta))
      expect(u, ruta).toBeDefined()
      expect(u!.lastModified, ruta).toBeUndefined()
    }
  })

  it('lo que sí cambia a diario conserva su fecha', async () => {
    const urls = await sitemap()
    const prevision = urls.find((u) => u.url.endsWith('/mejores-horas'))
    expect(prevision?.lastModified).toBeDefined()
  })
})
