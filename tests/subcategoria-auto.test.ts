import { describe, it, expect } from 'vitest'
import { SUBCATEGORIES } from '@/lib/fishing'
import { CATALOG } from '@/lib/catalog'
import { conSubcategoria, deducirSubcategoria } from '@/lib/subcategoria-auto'

/*
 * 335 de los 419 productos no tenían tipo (2026-11-11): la importación nunca lo
 * ponía y las páginas de tipo enseñaban una fracción del catálogo.
 */

const p = (typeFishing: string, title: string, description = '') => ({ typeFishing, title, description })

describe('deducirSubcategoria', () => {
  it('manda lo que el título dice primero', () => {
    expect(deducirSubcategoria(p('herramientas', 'Alicates de pesca con pinzas y tijeras'))).toBe('alicates')
    expect(deducirSubcategoria(p('minuteria', 'Conectores giratorios de acero'))).toBe('conectores')
    expect(deducirSubcategoria(p('senuelos', 'Vinilos tipo shad con cabeza plomada'))).toBe('vinilos')
  })

  it('algunos tipos mandan aunque salgan tarde', () => {
    expect(deducirSubcategoria(p('carretes', 'Carrete metal giratorio 12 kg para agua profunda'))).toBe('mar')
    expect(deducirSubcategoria(p('canas', 'Caña de spinning telescópica 2,10 m'))).toBe('telescopicas')
  })

  it('la descripción solo decide si el título no dice nada', () => {
    expect(deducirSubcategoria(p('senuelos', 'Señuelo para lubina', 'Minnow de 9 cm con paleta corta.'))).toBe('duros')
    expect(deducirSubcategoria(p('minuteria', 'Rodamiento giratorio', 'Con emerillones, grapas y perlas.'))).toBe('emerillones')
  })

  it('siempre devuelve un tipo que existe en su categoría', () => {
    for (const prod of CATALOG) {
      const sub = deducirSubcategoria(prod)
      expect(SUBCATEGORIES[prod.typeFishing as keyof typeof SUBCATEGORIES].map((s) => s.id), prod.title).toContain(sub)
    }
  })

  it('una categoría desconocida no se inventa tipo', () => {
    expect(deducirSubcategoria(p('general', 'Lo que sea'))).toBe('')
  })
})

describe('conSubcategoria', () => {
  it('no toca el tipo guardado o elegido en el panel', () => {
    const guardado = { ...p('canas', 'Caña telescópica'), subcategory: 'spinning', subcategories: ['spinning'] }
    expect(conSubcategoria(guardado)).toBe(guardado)
  })

  it('completa el que falta', () => {
    const sinTipo = { ...p('lineas', 'Fluorocarbono 100 % 50 m'), subcategory: '', subcategories: [] as string[] }
    expect(conSubcategoria(sinTipo)).toMatchObject({ subcategory: 'fluorocarbono', subcategories: ['fluorocarbono'] })
  })
})
