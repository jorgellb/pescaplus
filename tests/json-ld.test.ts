import { describe, it, expect } from 'vitest'
import { safeJsonLd } from '@/lib/json-ld'

/**
 * `JSON.stringify` no escapa `</script>`. Si un título de producto —que viene
 * de un feed de AliExpress, no de un texto que controlemos— contuviera
 * literalmente esa secuencia, el navegador cerraría la etiqueta ahí mismo y
 * ejecutaría lo que viniera detrás. Esta prueba reproduce ese ataque exacto.
 */
describe('JSON-LD embebido de forma segura', () => {
  it('escapa una inyección real de </script>', () => {
    const ataque = { name: 'Caña</script><script>alert(document.cookie)</script>' }
    const salida = safeJsonLd(ataque)
    expect(salida).not.toContain('</script>')
    expect(salida).not.toContain('<script>')
    // Y sigue siendo JSON válido con el texto original intacto.
    expect(JSON.parse(salida.replace(/\\u003c/g, '<'))).toEqual(ataque)
  })

  it('sigue siendo JSON parseable tal cual, sin deshacer el escape', () => {
    const d = { a: '<b>' }
    expect(() => JSON.parse(safeJsonLd(d))).not.toThrow()
    expect(JSON.parse(safeJsonLd(d))).toEqual(d)
  })

  it('no toca el texto normal', () => {
    const d = { name: 'Carrete Shimano 4000', price: 89.9 }
    expect(JSON.parse(safeJsonLd(d))).toEqual(d)
  })
})
