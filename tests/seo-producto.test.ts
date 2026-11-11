import { describe, it, expect } from 'vitest'
import {
  descripcionSeo,
  esTituloGenerico,
  esPlural,
  preguntasDeProducto,
  productoJsonLd,
  quitarMarca,
  recortarPorPalabras,
  tituloSeo,
  titulosRepetidos,
  TITULO_MAX,
  DESCRIPCION_MAX,
} from '@/lib/seo-producto'
import { CATALOG } from '@/lib/catalog'

/*
 * Medido en las 415 fichas públicas el 2026-11-11: 266 títulos con la marca dos
 * veces, 101 títulos repetidos (29 fichas llamadas «Anzuelos de pesca»), 193
 * títulos de más de 60 caracteres y 253 descripciones cortadas a media palabra.
 * Los casos de abajo son textos reales de aquellas fichas.
 */

describe('tituloSeo', () => {
  it('no repite la marca aunque el meta título ya la traiga', () => {
    const t = tituloSeo({ title: 'Rodamientos giratorios', seoTitle: 'Rodamientos giratorios para pesca | PescaPlus' })
    expect(t).toBe('Rodamientos giratorios para pesca · PescaPlus')
    expect(t.match(/PescaPlus/g)).toHaveLength(1)
  })

  it('un meta título genérico o compartido cede al nombre del producto', () => {
    const p = { title: 'Anzuelos BKK Raptor-Z 6071 triples', seoTitle: 'Anzuelos de pesca | PescaPlus' }
    expect(esTituloGenerico(p.seoTitle)).toBe(true)
    expect(tituloSeo(p)).toBe('Anzuelos BKK Raptor-Z 6071 triples · PescaPlus')

    const propio = { title: 'Otro', seoTitle: 'Carrete Shimano Catana 3000 de spinning' }
    const repetidos = titulosRepetidos([propio, { seoTitle: 'Carrete Shimano Catana 3000 de spinning | PescaPlus' }])
    expect(tituloSeo(propio, repetidos)).toBe('Otro · PescaPlus')
  })

  it('nunca pasa de 60 caracteres y no acaba en un conector ni en «|»', () => {
    const largos = [
      'Soporte de caña de pesca para embarcaciones en PVC, ideal para Kayak, barcos de agua, inflables',
      'Líneas de pesca multifilamento PE 100% Trenzado 8-100LB para pesca en cualquier condición',
      'Señuelos de pesca | Cucharas de fundición para jigging en',
      'Señuelo Hunthouse Monster Slayer – captura depredadores |',
    ]
    for (const title of largos) {
      const t = tituloSeo({ title, seoTitle: '' })
      expect(t.length).toBeLessThanOrEqual(TITULO_MAX)
      expect(t).not.toMatch(/\s(de|para|en|con|y|ideal)$|[|,–-]$/)
    }
    expect(tituloSeo({ title: largos[0], seoTitle: '' })).toBe('Soporte de caña de pesca para embarcaciones en PVC')
  })

  it('en el catálogo semilla no deja títulos repetidos ni largos', () => {
    const repetidos = titulosRepetidos(CATALOG)
    const titulos = CATALOG.map((p) => tituloSeo(p, repetidos))
    expect(titulos.every((t) => t.length <= TITULO_MAX)).toBe(true)
    expect(titulos.every((t) => (t.match(/PescaPlus/g) ?? []).length <= 1)).toBe(true)
  })

  it('si el corte deja sitio, la marca vuelve', () => {
    const t = tituloSeo({ title: 'x', seoTitle: 'Señuelos blandos 5-7 cm para perca y lubina | Spiker TPE y TPR con brillo UV' })
    expect(t).toBe('Señuelos blandos 5-7 cm para perca y lubina · PescaPlus')
  })

  it('quitarMarca limpia las formas que escribía la IA', () => {
    expect(quitarMarca('Caña X | PescaPlus')).toBe('Caña X')
    expect(quitarMarca('Caña X - PescaPlus')).toBe('Caña X')
    expect(quitarMarca('Caña X en PescaPlus')).toBe('Caña X')
    expect(quitarMarca('Caña X')).toBe('Caña X')
  })

  it('recortarPorPalabras no parte palabras', () => {
    expect(recortarPorPalabras('uno dos tres cuatro', 12)).toBe('uno dos tres')
    expect(recortarPorPalabras('corto', 60)).toBe('corto')
  })
})

describe('descripcionSeo', () => {
  it('quita la frase cortada a media palabra y se queda con las enteras', () => {
    const d = descripcionSeo({
      seoDescription:
        'Mejora tu pesca con el gancho magnético neodimio 16-90mm. Resistente a la corrosión y fácil de usar en ríos o mar. ¡Aumenta tus capturas hoy mismo! Compra ahora y ll',
      description: '',
    })
    expect(d).toBe(
      'Mejora tu pesca con el gancho magnético neodimio 16-90mm. Resistente a la corrosión y fácil de usar en ríos o mar. ¡Aumenta tus capturas hoy mismo!',
    )
  })

  it('si se queda corta, completa con la descripción visible sin repetirse', () => {
    const d = descripcionSeo({
      seoDescription: 'Anzuelos de acero inoxidable, resistentes y afilados. Compra ahora y mejora tus capturas en la próxima jornada de pesca con PescaPlus, la tienda especialist',
      description: 'Anzuelos de acero inoxidable muy resistentes y afilados. Pack de 50 unidades con caja de transporte. Válidos para mar y río.',
    })
    expect(d.length).toBeGreaterThanOrEqual(70)
    expect(d.length).toBeLessThanOrEqual(DESCRIPCION_MAX)
    expect(d).toContain('Pack de 50 unidades')
    expect(d).not.toContain('Anzuelos de acero inoxidable muy resistentes')
  })

  it('no parte «4.1:1» ni «0.8 mm» como si fueran fin de frase', () => {
    const d = descripcionSeo({ seoDescription: 'Carrete con ratio 4.1:1 y línea de 0.8 mm. Freno de 10 kg para peces grandes.', description: '' })
    expect(d).toBe('Carrete con ratio 4.1:1 y línea de 0.8 mm. Freno de 10 kg para peces grandes.')
  })

  it('en el catálogo semilla toda descripción cabe y acaba en frase completa', () => {
    for (const p of CATALOG) {
      const d = descripcionSeo(p)
      expect(d.length).toBeLessThanOrEqual(DESCRIPCION_MAX)
      expect(d).toMatch(/[.!?…]["»)]?$/)
    }
  })
})

describe('productoJsonLd', () => {
  it('no publica las unidades vendidas como opiniones', () => {
    const ld = productoJsonLd(CATALOG[0], { url: 'https://x/p', imagenes: [], categoria: 'Anzuelos', descripcion: 'd' })
    expect(ld).not.toHaveProperty('aggregateRating')
    expect(JSON.stringify(ld)).not.toContain('reviewCount')
    expect(ld.offers.price).toBe(CATALOG[0].price.toFixed(2))
    expect(ld.url).toBe('https://x/p')
  })
})

describe('preguntasDeProducto', () => {
  const base = {
    nombre: 'Señuelo Minnow 110',
    ruta: 'Señuelos › Duros (minnow y crank)',
    nombradas: [] as string[],
    tecnicas: [] as { nombre: string; especies: string[] }[],
    nudos: [] as { name: string; para: string; resistencia: string }[],
    precio: '9,90 €',
    alternativas: { cuantas: 0, desde: null, donde: 'Señuelos', ranking: null },
  }

  it('cada ficha responde con sus datos: especies, técnica, nudo, precio y alternativas', () => {
    const faqs = preguntasDeProducto({
      ...base,
      nombradas: ['la lubina', 'el lucio'],
      tecnicas: [{ nombre: 'spinning', especies: ['la corvina'] }],
      nudos: [{ name: 'Nudo palomar', para: 'Atar un anzuelo con la máxima resistencia.', resistencia: '95-100 % de la línea' }],
      alternativas: { cuantas: 12, desde: '3,50 €', donde: 'Señuelos › Duros', ranking: 'Los mejores señuelos de pesca de 2026' },
    })
    const texto = faqs.map((f) => `${f.q} ${f.a}`).join(' ')
    expect(texto).toContain('la lubina y el lucio')
    expect(texto).toContain('spinning')
    expect(texto).toContain('Nudo palomar')
    expect(texto).toContain('9,90 €')
    expect(texto).toContain('12 modelos más, desde 3,50 €')
    expect(faqs.at(-1)?.a).toContain('afiliados')
  })

  it('concuerda el verbo con el nombre del producto', () => {
    expect(esPlural('Señuelos blandos 5-7 cm')).toBe(true)
    expect(esPlural('50 conectores de acero')).toBe(true)
    expect(esPlural('Caña telescópica')).toBe(false)
    const faqs = preguntasDeProducto({ ...base, nombre: 'Señuelos blandos', nombradas: ['la lubina'] })
    expect(faqs[0].q).toBe('¿Para qué peces sirven Señuelos blandos?')
    expect(faqs[0].a).toBe('Su ficha los recomienda para la lubina.')
    expect(faqs.find((f) => f.q.startsWith('¿Cuánto'))?.q).toBe('¿Cuánto cuestan Señuelos blandos?')
  })

  it('sin datos no se inventa preguntas', () => {
    const faqs = preguntasDeProducto(base)
    expect(faqs.map((f) => f.q)).toEqual([
      '¿Para qué tipo de pesca es Señuelo Minnow 110?',
      '¿Cuánto cuesta Señuelo Minnow 110?',
      '¿Cómo se realiza la compra?',
    ])
  })
})
