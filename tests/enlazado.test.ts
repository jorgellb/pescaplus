import { describe, it, expect } from 'vitest'
import type { Product } from '@/types'
import { CATALOG } from '@/lib/catalog'
import { FICHAS } from '@/lib/knots'
import { getSpecies } from '@/lib/fishing-species'
import {
  complementosDe,
  especiesDeNudo,
  especiesDeProducto,
  nudosDeProducto,
  productosParaEspecie,
  productosParecidos,
  tecnicasDeProducto,
  temporada,
  especiesDeGuia,
  productosParaGuia,
  vecinosDe,
  zonasParaEnlazar,
  zonasRepartidas,
} from '@/lib/enlazado'

/*
 * El enlazado interno de las fichas. Antes de esto cada ficha enlazaba a su
 * categoría y a los cuatro primeros de la misma, y a nada más.
 */

function producto(parcial: Partial<Product> & Pick<Product, 'id' | 'title'>): Product {
  return {
    sku: '',
    description: '',
    imageUrl: 'https://x/i.jpg',
    images: [],
    imageAlts: [],
    videoUrl: '',
    price: 10,
    currency: 'EUR',
    affiliateUrl: 'https://x',
    category: 'fishing',
    typeFishing: 'senuelos',
    categories: ['senuelos'],
    subcategory: '',
    subcategories: [],
    rating: 4.5,
    reviews: 100,
    inStock: true,
    seoTitle: '',
    seoDescription: '',
    aiOptimized: false,
    ...parcial,
  }
}

describe('especiesDeProducto', () => {
  it('enlaza las especies que la ficha nombra, en su orden, también en plural', () => {
    const p = producto({ id: 'a', title: 'Señuelo minnow para lubinas', description: 'Atrae a lucios, percas y lubinas.' })
    const e = especiesDeProducto(p)
    expect(e.slice(0, 2).map((x) => x.especie.id)).toEqual(['lubina', 'lucio'])
    expect(e[0].motivo).toBe('menciona')
  })

  it('no confunde palabras: «número» no es mero, «Crazy Anguila» es la forma del señuelo', () => {
    const p = producto({ id: 'b', title: 'Crazy Anguila 80 mm', description: 'Elige el número de piezas.' })
    expect(especiesDeProducto(p).map((x) => x.especie.id)).not.toContain('meros')
    expect(especiesDeProducto(p).map((x) => x.especie.id)).not.toContain('anguila-rio')
  })

  it('por técnica, con la técnica que declara la ficha de la especie', () => {
    // «Plantilla de metal» es como traduce la tienda «metal jig».
    const p = producto({ id: 'c', title: 'Plantilla de metal 30 g para señuelos', description: '' })
    expect(tecnicasDeProducto(p).map((t) => t.id)).toContain('jigging')
    const e = especiesDeProducto(p)
    expect(e.length).toBeGreaterThan(0)
    for (const x of e) {
      expect(x.motivo).toBe('tecnica')
      expect(x.especie.technique.toLowerCase()).toMatch(/jig/)
    }
  })

  it('un flotador de embarcación no es pesca con flotador', () => {
    const p = producto({ id: 'd', title: 'Flotadores de pesca hinchables', typeFishing: 'embarcaciones', categories: ['embarcaciones'] })
    expect(tecnicasDeProducto(p).map((t) => t.id)).not.toContain('flotador')
  })

  it('sin nada que lo diga, no enlaza ninguna especie', () => {
    expect(especiesDeProducto(producto({ id: 'e', title: 'Linterna frontal recargable' }))).toEqual([])
  })
})

describe('producto → producto', () => {
  const caña = producto({ id: 'cana-spin', title: 'Caña de spinning carbono 2,10 m', typeFishing: 'canas', categories: ['canas'], subcategories: ['spinning'] })
  const carreteSpin = producto({ id: 'carrete-spin', title: 'Carrete de spinning 3000', typeFishing: 'carretes', categories: ['carretes'], reviews: 10 })
  const carreteMar = producto({ id: 'carrete-mar', title: 'Carrete de surfcasting 8000', typeFishing: 'carretes', categories: ['carretes'], reviews: 9000 })

  it('el complemento comparte técnica aunque otro venda más', () => {
    const [c] = complementosDe(caña, [caña, carreteSpin, carreteMar])
    expect(c.product.id).toBe('carrete-spin')
    expect(c.categoria).toBe('carretes')
    expect(c.motivo).toContain('spinning')
  })

  it('los parecidos no repiten el mismo artículo dado de alta dos veces', () => {
    const p = producto({ id: 'g1', title: 'Giratorios de 3 vías', typeFishing: 'minuteria', categories: ['minuteria'] })
    const copias = ['g2', 'g3', 'g4'].map((id) => producto({ id, title: 'Giratorios de 3 vías para minutería', typeFishing: 'minuteria', categories: ['minuteria'] }))
    const otro = producto({ id: 'g5', title: 'Giratorios con grapa', typeFishing: 'minuteria', categories: ['minuteria'] })
    const r = productosParecidos(p, [p, ...copias, otro])
    expect(r.map((x) => x.id)).toEqual(['g2', 'g5'])
  })

  it('nunca se enlaza a sí mismo ni a un agotado', () => {
    const agotado = { ...carreteSpin, id: 'agotado', inStock: false }
    for (const r of productosParecidos(carreteSpin, [carreteSpin, carreteMar, agotado])) {
      expect(r.id).not.toBe('carrete-spin')
      expect(r.inStock).toBe(true)
    }
  })

  it('en el catálogo entero, ninguna ficha se queda sin enlaces de entrada', () => {
    const todos = [...CATALOG]
    const entrada = new Map(todos.map((p) => [p.id, 0]))
    for (const p of todos) {
      const destinos = new Set([...productosParecidos(p, todos).map((o) => o.id), ...complementosDe(p, todos).map((c) => c.product.id)])
      const { anterior, siguiente } = vecinosDe(p, todos)
      if (anterior) destinos.add(anterior.id)
      if (siguiente) destinos.add(siguiente.id)
      for (const d of destinos) entrada.set(d, (entrada.get(d) ?? 0) + 1)
    }
    const minimo = Math.min(...entrada.values())
    expect(minimo).toBeGreaterThanOrEqual(1)
    // Y ninguna se lleva una parte desproporcionada.
    expect(Math.max(...entrada.values())).toBeLessThan(todos.length / 2)
  })

  it('las vecinas forman un anillo dentro de la categoría', () => {
    const tres = ['b', 'a', 'c'].map((id) => producto({ id, title: `Señuelo ${id}` }))
    expect(vecinosDe(tres[1], tres)).toEqual({ anterior: tres[2], siguiente: tres[0] })
    expect(vecinosDe(tres[0], tres.slice(0, 1))).toEqual({ anterior: null, siguiente: null })
  })
})

describe('nudos y especies, en los dos sentidos', () => {
  it('los nombres de especie de las fichas de nudos se resuelven a fichas reales', () => {
    const conEspecies = FICHAS.filter((f) => f.especies?.length)
    expect(conEspecies.every((f) => especiesDeNudo(f).length > 0)).toBe(true)
  })

  it('un trenzado recibe nudos de línea', () => {
    const p = producto({ id: 'pe', title: 'Línea trenzada PE x8', typeFishing: 'lineas', categories: ['lineas'] })
    const n = nudosDeProducto(p)
    expect(n.length).toBeGreaterThan(0)
    expect(n.every((f) => f.gearCats.includes('lineas'))).toBe(true)
  })

  it('la especie enlaza a los productos que la nombran antes que a los de técnica', () => {
    const nombra = producto({ id: 'n', title: 'Vinilo para lubina', subcategories: ['vinilos'] })
    const tecnica = producto({ id: 't', title: 'Señuelo de spinning 9 cm' })
    const nada = producto({ id: 'x', title: 'Caja de señuelos' })
    const r = productosParaEspecie(getSpecies('lubina'), [tecnica, nada, nombra])
    expect(r.map((x) => x.product.id)).toEqual(['n', 't'])
    expect(r[0].motivo).toBe('menciona')
  })

  it('por técnica solo entra material de las categorías que pide la especie', () => {
    const emerillon = producto({ id: 'em', title: 'Emerillón para spinning', typeFishing: 'minuteria', categories: ['minuteria'] })
    expect(productosParaEspecie(getSpecies('lubina'), [emerillon])).toEqual([])
  })
})

describe('zonasParaEnlazar', () => {
  it('una zona por región, y fichas distintas reparten zonas distintas', () => {
    const z = zonasParaEnlazar('lubina', 'producto-a')
    expect(z).toHaveLength(4)
    expect(new Set(z.map((x) => x.region)).size).toBe(4)
    // Siempre las mismas para la misma ficha: la página se puede cachear.
    expect(zonasParaEnlazar('lubina', 'producto-a')).toEqual(z)
    const todas = new Set<string>()
    for (let i = 0; i < 60; i++) for (const x of zonasParaEnlazar('lubina', `p-${i}`)) todas.add(x.slug)
    expect(todas.size).toBeGreaterThan(20)
  })

  it('una especie de agua dulce no tiene zonas de costa', () => {
    expect(zonasParaEnlazar('lucio', 'x')).toEqual([])
  })
})

describe('temporada', () => {
  it('resume los meses seguidos aunque crucen el año', () => {
    expect(temporada({ bestMonths: [9, 10, 11, 12, 1, 2, 3] })).toBe('sep–mar')
    expect(temporada({ bestMonths: [5, 6, 7] })).toBe('may–jul')
    expect(temporada({ bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] })).toBe('todo el año')
    expect(temporada({ bestMonths: [3, 7] })).toBe('mar, jul')
  })
})

describe('zonasRepartidas', () => {
  it('reparte las zonas de la lubina por regiones en vez de quedarse en Galicia', () => {
    const z = zonasRepartidas('lubina', 18)
    expect(z).toHaveLength(18)
    expect(new Set(z.map((x) => x.region)).size).toBeGreaterThan(5)
    expect(new Set(z.map((x) => x.slug)).size).toBe(18)
  })
})

describe('guías', () => {
  const guia = { title: 'Señuelos para depredadores', content: 'Para la lubina, vinilos de spinning a primera hora.', typeFishing: 'senuelos' }

  it('enlaza las especies de las que habla la guía', () => {
    expect(especiesDeGuia(guia).map((e) => e.especie.id)).toContain('lubina')
  })

  it('el material va de su categoría, primero lo que comparte especie o técnica', () => {
    const nombra = producto({ id: 'n', title: 'Vinilo para lubina', reviews: 1 })
    const otro = producto({ id: 'o', title: 'Cucharilla giratoria', reviews: 9000 })
    const fuera = producto({ id: 'f', title: 'Carrete para lubina', typeFishing: 'carretes', categories: ['carretes'] })
    expect(productosParaGuia(guia, [otro, fuera, nombra]).map((p) => p.id)).toEqual(['n', 'o'])
    expect(productosParaGuia({ ...guia, typeFishing: '' }, [nombra])).toEqual([])
  })
})
