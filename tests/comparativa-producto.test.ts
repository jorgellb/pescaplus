import { describe, it, expect } from 'vitest'
import type { Product } from '@/types'
import {
  compararProducto,
  precioUnitarioEnTexto,
  resumenComparativa,
  unidadesDelTitulo,
} from '@/lib/comparativa-producto'

/*
 * Lo único de una ficha que no está en la tienda de origen: cómo queda frente a
 * los demás de su tipo. Las cifras salen del catálogo, no de la IA.
 */

function producto(id: string, title: string, price: number, rating = 4.7, reviews = 100): Product {
  return {
    id,
    sku: id,
    title,
    description: '',
    imageUrl: '',
    images: [],
    imageAlts: [],
    videoUrl: '',
    price,
    currency: 'EUR',
    affiliateUrl: '',
    category: 'minuteria',
    typeFishing: 'minuteria',
    categories: ['minuteria'],
    subcategory: 'emerillones',
    subcategories: ['emerillones'],
    rating,
    reviews,
    inStock: true,
    seoTitle: '',
    seoDescription: '',
    aiOptimized: true,
  }
}

describe('unidadesDelTitulo', () => {
  it('lee la cantidad cuando el título la dice con su unidad', () => {
    expect(unidadesDelTitulo('200 uds anzuelos Baitholder carpa')).toEqual({ cantidad: 200, unidad: 'unidad' })
    expect(unidadesDelTitulo('30 piezas de pesas de tungsteno')).toEqual({ cantidad: 30, unidad: 'unidad' })
    expect(unidadesDelTitulo('DNDYUJU 100x conectores giratorios')).toEqual({ cantidad: 100, unidad: 'unidad' })
    expect(unidadesDelTitulo('Pack de 25 emerillones de acero')).toEqual({ cantidad: 25, unidad: 'unidad' })
    expect(unidadesDelTitulo('Anzuelos para Carpa Juego de 6 con Sedal y Boilie')).toEqual({ cantidad: 6, unidad: 'unidad' })
    expect(unidadesDelTitulo('5 Pares Anzuelos Dobles con Púas')).toEqual({ cantidad: 5, unidad: 'par' })
  })

  it('y cuando empieza por un número seguido del nombre en plural', () => {
    expect(unidadesDelTitulo('12 líderes de pesca fluorocarbono')).toEqual({ cantidad: 12, unidad: 'unidad' })
    expect(unidadesDelTitulo('300 topes de silicona tipo Space Bean')).toEqual({ cantidad: 300, unidad: 'unidad' })
  })

  it('no confunde medidas, hebras ni modelos con unidades', () => {
    expect(unidadesDelTitulo('Línea trenzada 8 hebras 100m PE')).toBeNull()
    expect(unidadesDelTitulo('100m línea de fluorocarbono')).toBeNull()
    expect(unidadesDelTitulo('3000 carrete de spinning')).toBeNull()
    expect(unidadesDelTitulo('8 hilos trenzado multifilamento')).toBeNull()
    expect(unidadesDelTitulo('3 colores de vinilo para lubina')).toBeNull()
    expect(unidadesDelTitulo('Caña telescópica de carbono 2,7 m')).toBeNull()
    expect(unidadesDelTitulo('1 ud de carrete')).toBeNull()
  })

  it('un rango no es una cantidad: el precio que se ve es el de la variante pequeña', () => {
    // Títulos reales del catálogo. Con la cantidad grande, el precio por unidad
    // saldría falso y la ficha presumiría de ser «la más barata por unidad».
    expect(unidadesDelTitulo('Anillo sólido de pesca 20-100 ud')).toBeNull()
    expect(unidadesDelTitulo('Anzuelo de pesca de 50 ~ 200 ud')).toBeNull()
    expect(unidadesDelTitulo('Giratorios de pesca de 20 a 100 unidades con conector')).toBeNull()
    expect(unidadesDelTitulo('Línea de fluorocarbono pike 10/20 unidades')).toBeNull()
    expect(unidadesDelTitulo('Anzuelos para pulpo rojos 50-100PCS')).toBeNull()
    expect(unidadesDelTitulo('Conector Flotador Acero Inoxidable 15-60uds para Carpa')).toBeNull()
    expect(unidadesDelTitulo('Soporte caña kayak riel deslizante 2/6/8 unidades')).toBeNull()
    expect(unidadesDelTitulo('Giratorios de 3 vías clásicos, packs de 25 y 50 uds')).toBeNull()
    expect(unidadesDelTitulo('Anzuelo de acero FTK 12 uds – 24 uds para pesca de fondo')).toBeNull()
    expect(unidadesDelTitulo('Kit de Pesca Profesional 170-410 Piezas Completo')).toBeNull()
    // Un rango de gramos no estorba a una cantidad clara.
    expect(unidadesDelTitulo('Señuelos de metal con ojos 3D de 10 a 60 g, pack de 5')).toEqual({ cantidad: 5, unidad: 'unidad' })
  })

  it('«3X» y «4X» en un anzuelo son la resistencia del alambre, no cuántos trae', () => {
    expect(unidadesDelTitulo('Anzuelo con cabeza jig 3X para señuelo blando')).toBeNull()
    expect(unidadesDelTitulo('Anzuelos triples LUREHOLIC 3X 4X recubiertos')).toBeNull()
    expect(unidadesDelTitulo('Anzuelos triples de pesca 4X, 10 unidades')).toEqual({ cantidad: 10, unidad: 'unidad' })
  })
})

describe('precioUnitarioEnTexto', () => {
  it('con céntimos de céntimo, tres decimales; si no, dos', () => {
    expect(precioUnitarioEnTexto(2.74 / 50, 'EUR')).toBe('0,055 €')
    expect(precioUnitarioEnTexto(1.2, 'EUR')).toBe('1,20 €')
  })
})

describe('compararProducto', () => {
  const este = producto('este', '50 giratorios de acero inoxidable', 2.74, 4.9, 5066)
  const otros = [
    producto('a', 'Conectores giratorios acero 304', 2.64, 4.9, 6053),
    producto('b', '100 uds emerillones con mosquetón', 3.5, 4.6, 800),
    producto('c', 'Emerillones de rodamiento', 5.2, 4.8, 300),
    producto('d', 'Giratorios con anillo partido', 1.66, 4.5, 90),
    producto('e', 'Emerillones de barril', 3.1, 4.7, 1200),
  ]

  it('con muy pocos de su tipo no hay comparativa', () => {
    expect(compararProducto(este, otros.slice(0, 2), 'Minutería › Emerillones y giratorios')).toBeNull()
  })

  it('da el puesto por precio y por ventas, y la mediana del grupo', () => {
    const c = compararProducto(este, otros, 'Minutería › Emerillones y giratorios')!
    expect(c.total).toBe(6)
    expect(c.precio.puesto).toBe(3) // 1,66 y 2,64 son más baratos
    expect(c.ventas.puesto).toBe(2) // solo «a» vende más
    expect(c.precio.mediana).toBeCloseTo((2.74 + 3.1) / 2)
    expect(c.masBarato?.id).toBe('d')
  })

  it('compara el precio por unidad solo entre los que dicen cuántas traen', () => {
    const c = compararProducto(este, otros, 'Minutería › Emerillones y giratorios')!
    expect(c.porUnidad).toMatchObject({ cantidad: 50, unidad: 'unidad', deCuantos: 2 })
    expect(c.porUnidad?.precio).toBeCloseTo(2.74 / 50)
    // Con solo dos que dicen la cantidad no hay puesto que dar.
    expect(c.porUnidad?.puesto).toBeNull()
  })

  it('la tabla lleva esta ficha y las alternativas con su motivo, de más barata a más cara', () => {
    const c = compararProducto(este, otros, 'Minutería › Emerillones y giratorios')!
    expect(c.filas.find((f) => f.esEste)?.id).toBe('este')
    const motivos = Object.fromEntries(c.filas.map((f) => [f.id, f.motivo]))
    expect(motivos.d).toBe('El más barato')
    expect(motivos.a).toBe('El más vendido')
    expect(c.filas.length).toBeLessThanOrEqual(5)
    const precios = c.filas.map((f) => f.price)
    expect(precios).toEqual([...precios].sort((x, y) => x - y))
    expect(new Set(c.filas.map((f) => f.id)).size).toBe(c.filas.length)
  })

  it('no compara con productos sin precio', () => {
    const c = compararProducto(este, [...otros, producto('gratis', 'Sin precio', 0)], 'Minutería › Emerillones y giratorios')!
    expect(c.total).toBe(6)
    expect(c.filas.some((f) => f.id === 'gratis')).toBe(false)
  })
})

describe('resumenComparativa', () => {
  const este = producto('este', '50 giratorios de acero inoxidable', 2.74, 4.9, 5066)
  const otros = [
    producto('a', 'Conectores giratorios acero 304', 2.64, 4.9, 6053),
    producto('b', '100 uds emerillones con mosquetón', 3.5, 4.6, 800),
    producto('c', 'Emerillones de rodamiento', 5.2, 4.8, 300),
    producto('d', '20 uds giratorios con anillo partido', 1.66, 4.5, 90),
    producto('e', 'Emerillones de barril', 3.1, 4.7, 1200),
  ]

  it('cuenta en frases las cifras de esta ficha', () => {
    const texto = resumenComparativa(compararProducto(este, otros, 'Minutería › Emerillones y giratorios')!).join(' ')
    // La ruta entera: «Simples» o «Spinning» solos no dicen de qué.
    expect(texto).toContain('De los 6 artículos que comparamos en Minutería › Emerillones y giratorios, es')
    expect(texto).toContain('el 3.º más barato')
    expect(texto).toContain('el 2.º más vendido')
    expect(texto).toContain('2,92 €') // mediana de 2,74 y 3,10
    expect(texto).toContain('50 unidades')
    expect(texto).toContain('0,055 €')
    expect(texto).toMatch(/por encima de la media/)
  })

  it('el primero y el último se dicen sin número', () => {
    const barato = producto('x', 'Giratorios baratos', 1, 4.7, 7000)
    const texto = resumenComparativa(compararProducto(barato, otros, 'Minutería › Emerillones y giratorios')!).join(' ')
    expect(texto).toContain('es el más barato y el más vendido')
    const caro = producto('y', 'Giratorios caros', 9, 4.7, 1)
    expect(resumenComparativa(compararProducto(caro, otros, 'Minutería › Emerillones y giratorios')!).join(' ')).toContain('es el más caro')
  })

  it('de la mitad cara para arriba se cuenta desde el más caro, y las ventas flojas no se presumen', () => {
    // «el 5.º más barato de 6» se lee mejor como «el 2.º más caro».
    const casiCaro = producto('z', 'Giratorios de rodamiento', 4, 4.7, 10)
    const texto = resumenComparativa(compararProducto(casiCaro, otros, 'Minutería › Emerillones y giratorios')!).join(' ')
    expect(texto).toContain('es el 2.º más caro.')
    expect(texto).not.toContain('más vendido')
  })
})
