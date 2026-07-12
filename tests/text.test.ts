import { describe, it, expect } from 'vitest'
import { decodeEntities } from '@/lib/text'
import { CATALOG } from '@/lib/catalog'
import { isFishingTypeId, isValidSubcategory } from '@/lib/fishing'

describe('decodeEntities', () => {
  it('decodes named accented entities', () => {
    expect(decodeEntities('La L&iacute;nea')).toBe('La Línea')
    expect(decodeEntities('Se&ntilde;uelo')).toBe('Señuelo')
    expect(decodeEntities('caña &amp; carrete')).toBe('caña & carrete')
  })

  it('decodes numeric references', () => {
    expect(decodeEntities('a&#241;o')).toBe('año')
  })

  it('leaves unknown entities and plain ampersands untouched', () => {
    expect(decodeEntities('AT&T')).toBe('AT&T')
    expect(decodeEntities('R&B &foo; text')).toBe('R&B &foo; text')
  })

  it('is a no-op for strings without ampersands', () => {
    expect(decodeEntities('caña de pescar')).toBe('caña de pescar')
  })
})

describe('catalog integrity', () => {
  it('has no leftover HTML entities in product copy', () => {
    for (const p of CATALOG) {
      for (const field of [p.title, p.description, p.seoTitle, p.seoDescription]) {
        expect(field).not.toMatch(/&[a-zA-Z][a-zA-Z0-9]+;|&#\d+;/)
      }
    }
  })

  it('tags every product with a valid fishing category', () => {
    for (const p of CATALOG) {
      expect(isFishingTypeId(p.typeFishing), `${p.id} -> ${p.typeFishing}`).toBe(true)
    }
  })

  it('assigns every product valid subcategories within its categories', () => {
    for (const p of CATALOG) {
      for (const sub of p.subcategories) {
        const ok = p.categories.some((c) => isValidSubcategory(c, sub))
        expect(ok, `${p.id} -> ${sub}`).toBe(true)
      }
    }
  })
})
