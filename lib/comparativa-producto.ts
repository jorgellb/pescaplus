import type { Product } from '@/types'
import { precioEnTexto } from '@/lib/seo-producto'

/**
 * Cómo queda un producto frente a los demás de su tipo.
 *
 * Es lo único de una ficha que no está en la tienda de origen. El título, la
 * foto y la descripción son, con otras palabras, los del vendedor, y Google ya
 * tiene ese producto indexado allí y en cientos de webs: una ficha que no añade
 * nada se rastrea y no se indexa («afiliación pobre», en sus normas). Su puesto
 * por precio, por precio por unidad y por ventas entre los N de su tipo es un
 * dato que solo existe aquí, y cambia de una ficha a otra.
 *
 * Todo sale del catálogo, con cifras que se pueden comprobar en la propia
 * página. Nada lo escribe la IA.
 */

export type Unidad = 'unidad' | 'par'

export interface Unidades {
  cantidad: number
  unidad: Unidad
}

/** Por debajo, comparar no dice nada: «el 2.º más barato de 3». */
export const MINIMO_GRUPO = 4
/** Puesto por precio por unidad: solo si al menos tantos dicen cuántas traen. */
const MINIMO_POR_UNIDAD = 3
const MAX_ALTERNATIVAS = 4

/** Palabras que, tras un número al principio, son medidas o variantes, no unidades. */
const NO_SON_UNIDADES = new Set([
  'm', 'mm', 'cm', 'metros', 'g', 'gr', 'gramos', 'kg', 'lb', 'lbs', 'oz', 'hebras', 'hilos', 'colores', 'tamanos',
  'tallas', 'secciones', 'tramos', 'rodamientos', 'velocidades', 'pulgadas', 'pies', 'anos', 'horas', 'modos', 'niveles',
])

function sinTildes(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Cuántas trae, si el título lo dice: «200 uds», «30 piezas», «100x», «pack de
 * 25», «5 pares», o un número al principio seguido del nombre en plural («12
 * líderes»). Una medida («100m», «8 hebras») o un modelo («3000 carrete») no.
 */
const UNIDAD = String.raw`(?:uds?|unidades|piezas|pcs|pzs|pzas)\b`
/**
 * «20-100 ud», «de 20 a 100 unidades», «10/20 uds», «50~200», «25 y 50 uds»:
 * la tienda vende varias cantidades y el precio que se ve es el de la pequeña.
 */
const RANGO = new RegExp(String.raw`\d+\s*(?:-|–|~|/|\sa\s|\sy\s|\so\s)\s*\d+(?:\s*[/-]\s*\d+)*\s*${UNIDAD}`)

export function unidadesDelTitulo(titulo: string): Unidades | null {
  const t = sinTildes(titulo)
  const vale = (n: number, unidad: Unidad): Unidades | null => (n >= 2 && n <= 10000 ? { cantidad: n, unidad } : null)

  if (RANGO.test(t)) return null
  // «12 uds – 24 uds»: dos cantidades, la misma duda que un rango.
  const cantidades = new Set([...t.matchAll(new RegExp(String.raw`\b(\d+)\s*${UNIDAD}`, 'g'))].map((m) => m[1]))
  if (cantidades.size > 1) return null

  const pares = t.match(/\b(\d+)\s*pares\b/)
  if (pares) return vale(Number(pares[1]), 'par')

  const conUnidad = t.match(new RegExp(String.raw`\b(\d+)\s*${UNIDAD}`))
  if (conUnidad) return vale(Number(conUnidad[1]), 'unidad')

  // «100x conectores». Por debajo de 10, «3X» y «4X» son la resistencia del
  // alambre de un anzuelo, no cuántos trae.
  const porX = t.match(/\b(\d+)\s*x\s(?!\d)/)
  if (porX && Number(porX[1]) >= 10) return vale(Number(porX[1]), 'unidad')

  const lote = t.match(/\b(?:pack|lote|set|caja|kit|bolsa|juego)\s+de\s+(\d+)\b/)
  if (lote) return vale(Number(lote[1]), 'unidad')

  const alPrincipio = t.match(/^(\d+)\s+([a-zñ]+)\b/)
  if (alPrincipio && alPrincipio[2].endsWith('s') && !NO_SON_UNIDADES.has(alPrincipio[2])) {
    return vale(Number(alPrincipio[1]), 'unidad')
  }
  return null
}

/** «0,055 €» para céntimos de céntimo; «1,20 €» lo demás. */
export function precioUnitarioEnTexto(precio: number, moneda: string): string {
  if (precio >= 0.1) return precioEnTexto(precio, moneda)
  return `${precio.toFixed(3).replace('.', ',')} ${moneda === 'EUR' ? '€' : moneda}`
}

export interface FilaComparativa {
  id: string
  title: string
  price: number
  currency: string
  rating: number
  reviews: number
  /** Precio por unidad o por par, si el título dice cuántas trae. */
  porUnidad: number | null
  unidad: Unidad | null
  /** Por qué está en la tabla: «Esta ficha», «El más barato»… */
  motivo: string
  esEste: boolean
}

export interface Comparativa {
  /** Productos comparados, esta ficha incluida. */
  total: number
  /** La ruta del grupo: «Minutería › Emerillones y giratorios», o «Minutería». */
  grupo: string
  moneda: string
  /** Puesto 1 = el más barato; `puestoCaro` 1 = el más caro. Los empates comparten puesto. */
  precio: { puesto: number; puestoCaro: number; mediana: number }
  /** Puesto 1 = el más vendido. */
  ventas: { puesto: number }
  /** Valoración media del grupo (los que tienen nota). */
  valoracion: { media: number | null }
  porUnidad: { cantidad: number; unidad: Unidad; precio: number; puesto: number | null; deCuantos: number } | null
  /** El más barato de los demás, si esta ficha no lo es. */
  masBarato: Product | null
  /** Esta ficha y sus alternativas, de más barata a más cara. */
  filas: FilaComparativa[]
}

function mediana(valores: number[]): number {
  const v = [...valores].sort((a, b) => a - b)
  const mitad = Math.floor(v.length / 2)
  return v.length % 2 ? v[mitad] : (v[mitad - 1] + v[mitad]) / 2
}

function precioUnitario(p: Product): { precio: number; unidad: Unidad; cantidad: number } | null {
  const u = unidadesDelTitulo(p.title)
  return u ? { precio: p.price / u.cantidad, unidad: u.unidad, cantidad: u.cantidad } : null
}

/**
 * La comparativa de `p` con `otros` (los demás de su tipo, sin él). `null` si
 * el grupo es tan pequeño que los puestos no dirían nada.
 */
export function compararProducto(p: Product, otros: readonly Product[], grupo: string): Comparativa | null {
  if (!(p.price > 0)) return null
  const resto = otros.filter((o) => o.id !== p.id && o.price > 0)
  if (resto.length + 1 < MINIMO_GRUPO) return null

  const todos = [p, ...resto]
  const conNota = todos.filter((o) => o.rating > 0)
  const propio = precioUnitario(p)

  let porUnidad: Comparativa['porUnidad'] = null
  if (propio) {
    const comparables = resto
      .map(precioUnitario)
      .filter((u): u is NonNullable<typeof u> => u !== null && u.unidad === propio.unidad)
    const deCuantos = comparables.length + 1
    porUnidad = {
      cantidad: propio.cantidad,
      unidad: propio.unidad,
      precio: propio.precio,
      deCuantos,
      puesto: deCuantos >= MINIMO_POR_UNIDAD ? 1 + comparables.filter((u) => u.precio < propio.precio).length : null,
    }
  }

  const masBaratos = [...resto].sort((a, b) => a.price - b.price || b.reviews - a.reviews)
  const masBarato = masBaratos[0].price < p.price ? masBaratos[0] : null

  /*
   * Las alternativas, cada una con su motivo. El orden decide qué motivo gana
   * si un producto cumple dos: el más barato pesa más que el más vendido.
   */
  const elegidas = new Map<string, { producto: Product; motivo: string }>()
  const elegir = (producto: Product | undefined, motivo: string) => {
    if (producto && !elegidas.has(producto.id) && elegidas.size < MAX_ALTERNATIVAS) elegidas.set(producto.id, { producto, motivo })
  }
  elegir(masBaratos[0], 'El más barato')
  elegir([...resto].sort((a, b) => b.reviews - a.reviews)[0], 'El más vendido')
  const conVentas = resto.filter((o) => o.reviews >= 50)
  elegir(
    [...(conVentas.length ? conVentas : resto)].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)[0],
    'El mejor valorado',
  )
  for (const o of [...resto].sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price))) {
    elegir(o, 'Precio parecido')
  }

  const fila = (o: Product, motivo: string, esEste: boolean): FilaComparativa => {
    const u = precioUnitario(o)
    return {
      id: o.id,
      title: o.title,
      price: o.price,
      currency: o.currency,
      rating: o.rating,
      reviews: o.reviews,
      porUnidad: u?.precio ?? null,
      unidad: u?.unidad ?? null,
      motivo,
      esEste,
    }
  }

  return {
    total: todos.length,
    grupo,
    moneda: p.currency,
    precio: {
      puesto: 1 + resto.filter((o) => o.price < p.price).length,
      puestoCaro: 1 + resto.filter((o) => o.price > p.price).length,
      mediana: mediana(todos.map((o) => o.price)),
    },
    ventas: { puesto: 1 + resto.filter((o) => o.reviews > p.reviews).length },
    valoracion: { media: conNota.length ? conNota.reduce((s, o) => s + o.rating, 0) / conNota.length : null },
    porUnidad,
    masBarato,
    filas: [fila(p, 'Esta ficha', true), ...[...elegidas.values()].map((e) => fila(e.producto, e.motivo, false))].sort(
      (a, b) => a.price - b.price || Number(b.esEste) - Number(a.esEste),
    ),
  }
}

/** «el más barato», «el 3.º más barato», «el más caro». */
function puesto(n: number, total: number, mejor: string, peor: string | null): string {
  if (n === 1) return `el más ${mejor}`
  if (peor && n === total) return `el más ${peor}`
  return `el ${n}.º más ${mejor}`
}

/** En la mitad buena del grupo: «3 de 6» sí, «4 de 6» no. */
function enLaMitadBuena(n: number, total: number): boolean {
  return n <= Math.ceil(total / 2)
}

function nota(n: number): string {
  return n.toFixed(1).replace('.', ',')
}

/** La comparativa en frases, para la ficha y para las preguntas frecuentes. */
export function resumenComparativa(c: Comparativa): string[] {
  const frases: string[] = []
  const este = c.filas.find((f) => f.esEste)
  // «el 5.º más barato de 6» se lee mejor como «el 2.º más caro»; y unas
  // ventas en la mitad floja no se presumen.
  const precio = enLaMitadBuena(c.precio.puesto, c.total)
    ? puesto(c.precio.puesto, c.total, 'barato', 'caro')
    : puesto(c.precio.puestoCaro, c.total, 'caro', null)
  const ventas = enLaMitadBuena(c.ventas.puesto, c.total) ? ` y ${puesto(c.ventas.puesto, c.total, 'vendido', null)}` : ''
  frases.push(`De los ${c.total} artículos que comparamos en ${c.grupo}, es ${precio}${ventas}.`)
  frases.push(`La mitad cuesta ${precioEnTexto(c.precio.mediana, c.moneda)} o menos.`)

  if (c.porUnidad) {
    const { cantidad, unidad, precio, puesto: n, deCuantos } = c.porUnidad
    const cuantas = `${cantidad} ${unidad === 'par' ? 'pares' : 'unidades'}`
    const cada = unidad === 'par' ? 'el par' : 'la unidad'
    frases.push(
      `Trae ${cuantas}: sale a ${precioUnitarioEnTexto(precio, c.moneda)} ${cada}` +
        (n ? `, ${puesto(n, deCuantos, 'barato', 'caro')} por ${unidad} de los ${deCuantos} que dicen cuántas traen.` : '.'),
    )
  }

  if (este && este.rating > 0 && c.valoracion.media !== null) {
    const diferencia = este.rating - c.valoracion.media
    const donde = diferencia >= 0.05 ? 'por encima de' : diferencia <= -0.05 ? 'por debajo de' : 'en'
    frases.push(`Su valoración, ${nota(este.rating)}, está ${donde} la media del grupo (${nota(c.valoracion.media)}).`)
  }
  return frases
}
