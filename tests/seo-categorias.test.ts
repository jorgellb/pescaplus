import { describe, it, expect } from 'vitest'
import { SUBCATEGORIES } from '@/lib/fishing'
import { TECNICAS } from '@/lib/enlazado'
import { DESCRIPCION_MAX, TITULO_MAX } from '@/lib/seo-producto'
import { descripcionDeTipo, nombreDeTipo, TIPOS_SEO, tituloDeTipo } from '@/lib/seo-categorias'

/*
 * Las páginas de tipo («Cañas de spinning») eran las más pobres del sitio: H1
 * «Spinning», título sin la marca y una frase de plantilla.
 */

const todos = Object.entries(SUBCATEGORIES).flatMap(([cat, subs]) => subs.map((s) => ({ cat, sub: s })))

describe('TIPOS_SEO', () => {
  it('cada tipo del catálogo tiene nombre y guía propios', () => {
    for (const { cat, sub } of todos) {
      const t = TIPOS_SEO[`${cat}/${sub.id}`]
      expect(t, `${cat}/${sub.id}`).toBeDefined()
      expect(t.guia.length).toBeGreaterThan(80)
      expect(t.guia).toMatch(/\.$/)
    }
  })

  it('no hay dos tipos con el mismo nombre ni con la misma guía', () => {
    const tipos = Object.values(TIPOS_SEO)
    expect(new Set(tipos.map((t) => t.nombre)).size).toBe(tipos.length)
    expect(new Set(tipos.map((t) => t.guia)).size).toBe(tipos.length)
  })

  it('las técnicas que nombran existen en el enlazado', () => {
    const ids = new Set(TECNICAS.map((t) => t.id))
    for (const t of Object.values(TIPOS_SEO)) if (t.tecnica) expect(ids.has(t.tecnica)).toBe(true)
  })

  it('un tipo creado en el admin se nombra con su categoría', () => {
    expect(nombreDeTipo('canas', { id: 'spinning', name: 'Spinning' }, 'Cañas de pesca')).toBe('Cañas de spinning')
    expect(nombreDeTipo('canas', { id: 'nuevo', name: 'Rockfishing' }, 'Cañas de pesca')).toBe('Cañas de pesca: rockfishing')
  })
})

describe('tituloDeTipo y descripcionDeTipo', () => {
  it('título con datos, la marca si cabe y nunca más de 60 caracteres', () => {
    expect(tituloDeTipo('Cañas de spinning', 12, 9.99)).toBe('Cañas de spinning: 12 modelos desde 9,99 € · PescaPlus')
    expect(tituloDeTipo('Carretes de spinning', 1, null)).toBe('Carretes de spinning: 1 modelo · PescaPlus')
    expect(tituloDeTipo('Cañas de spinning', 1, 71.53)).toBe('Cañas de spinning: 1 modelo a 71,53 € · PescaPlus')
    for (const t of Object.values(TIPOS_SEO)) {
      const titulo = tituloDeTipo(t.nombre, 123, 1234.56)
      expect(titulo.length, titulo).toBeLessThanOrEqual(TITULO_MAX)
      expect(titulo).not.toMatch(/: .*: /)
    }
  })

  it('con un solo modelo no habla de «los más elegidos» ni de comparar', () => {
    expect(descripcionDeTipo('Cañas de spinning', 1, 71.53, ['Caña de pesca para float tube'])).toBe('Cañas de spinning: 1 modelo, a 71,53 €.')
  })

  it('descripción hecha de frases enteras y de 160 caracteres como mucho', () => {
    const d = descripcionDeTipo('Líneas trenzadas (PE)', 51, 0.99, ['Línea trenzada PE x8 de 300 m para spinning en mar', 'Trenzado de 4 hilos'])
    expect(d.startsWith('Líneas trenzadas (PE): 51 modelos desde 0,99 €')).toBe(true)
    expect(d.length).toBeLessThanOrEqual(DESCRIPCION_MAX)
    expect(d).toMatch(/\.$/)
    for (const t of Object.values(TIPOS_SEO)) {
      const x = descripcionDeTipo(t.nombre, 999, 1234.56, ['Un título de producto bastante largo para probar', 'Otro título largo de producto'])
      expect(x.length, x).toBeLessThanOrEqual(DESCRIPCION_MAX)
    }
  })
})
