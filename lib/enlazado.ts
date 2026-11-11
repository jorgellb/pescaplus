import type { Product } from '@/types'
import { SEA_SPECIES, SPECIES_KNOWN_TERMS, type SpeciesProfile } from '@/lib/fishing-species'
import { FRESHWATER_SPECIES } from '@/lib/freshwater-species'
import { FICHAS, type Ficha } from '@/lib/knots'
import { zonesForSpecies } from '@/lib/species-zones'
import type { FishingSpot } from '@/lib/fishing-spots'
import { normalizar } from '@/lib/seo-producto'

/**
 * El enlazado interno: qué enlaza cada página con cuál, y por qué.
 *
 * Medido en las 415 fichas públicas el 2026-11-11: cada ficha enlazaba a su
 * categoría y a 4 productos de la misma categoría (los 4 primeros, siempre los
 * mismos), y a nada más. Ni una a una especie, un ranking, un nudo, una guía o
 * una subcategoría. Para Google eran 415 páginas sueltas al lado de 30 fichas
 * de especie, 8 de nudos y 11 rankings que trataban justo de lo mismo.
 *
 * Aquí se decide el grafo con una regla por enlace:
 *  - Producto → especie: solo si la ficha nombra la especie, o si usa una
 *    técnica que la ficha de la especie declara. Nunca «porque es un anzuelo».
 *  - Producto → producto: parecidos por subcategoría, especie, técnica, título y
 *    precio; complementos de otra categoría para montar el equipo; y el anterior
 *    y el siguiente de su categoría, que garantizan que ninguna ficha se queda
 *    sin enlaces de entrada.
 *  - Producto → nudo: los nudos y montajes de su categoría.
 *  - Y la vuelta: especie → productos, nudo → productos, con las mismas reglas.
 *
 * Todo es puro y determinista: misma entrada, mismos enlaces. Así la página se
 * puede cachear y las pruebas pueden medir el grafo entero.
 */

export const TODAS_LAS_ESPECIES: SpeciesProfile[] = [...SEA_SPECIES, ...FRESHWATER_SPECIES]

/**
 * Cómo se nombra cada especie de agua dulce en las fichas. Las de mar ya tienen
 * los suyos en `SPECIES_KNOWN_TERMS`.
 *
 * Faltan a propósito el cacho («un cacho de cebo» es un trozo), la boga a
 * secas, que en el mar es otro pez, y la anguila: en las fichas casi siempre es
 * la FORMA del señuelo («Crazy Anguila 80 mm», «suave anguila viva»), no el pez
 * que se pesca. Mejor no enlazar que enlazar mal.
 */
const TERMINOS_AGUA_DULCE: Record<string, string[]> = {
  'black-bass': ['black bass', 'blackbass', 'perca americana'],
  lucio: ['lucio'],
  lucioperca: ['lucioperca', 'zander'],
  'trucha-comun': ['trucha'],
  'trucha-arcoiris': ['trucha arcoiris', 'trucha arco iris'],
  barbo: ['barbo'],
  carpa: ['carpa', 'carpfishing'],
  siluro: ['siluro'],
  'boga-rio': ['boga de rio'],
  'perca-sol': ['perca sol'],
  tenca: ['tenca'],
  salmon: ['salmon'],
  reo: ['reo'],
}

function terminosDe(id: string): string[] {
  return (SPECIES_KNOWN_TERMS[id] ?? TERMINOS_AGUA_DULCE[id] ?? []).map(normalizar)
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** «calamar» encuentra «calamar» y «calamares»; «mero» no encuentra «numero». */
function patronDeTermino(termino: string): RegExp {
  return new RegExp(`(?:^|[^a-z0-9])${escapar(termino).replace(/ /g, '[\\s-]?')}(?:s|es)?(?![a-z0-9])`)
}

const PATRONES = new Map(TODAS_LAS_ESPECIES.map((sp) => [sp.id, terminosDe(sp.id).map(patronDeTermino)]))

export interface Tecnica {
  id: string
  nombre: string
  /** Cómo aparece en la ficha de un producto (texto normalizado). */
  enProducto: RegExp
  /** Cómo aparece en el campo `technique` de la ficha de la especie. */
  enEspecie: RegExp
  /** Categorías donde esa palabra NO significa esta técnica. */
  salvoEn?: string[]
}

/**
 * Técnicas que se pueden leer en las dos fichas, la del producto y la de la
 * especie. «Plantilla de metal» es como traduce la tienda «metal jig», y sale
 * en decenas de fichas.
 */
export const TECNICAS: Tecnica[] = [
  { id: 'eging', nombre: 'eging', enProducto: /\b(eging|egi|jibioneras?|poteras?|squid ?jigs?)\b/, enEspecie: /eging|jibioner|potera/ },
  {
    id: 'jigging',
    nombre: 'jigging',
    enProducto: /\b(jigging|micro ?jig(ging)?|slow ?jig(ging)?|metal ?jigs?|jigs? de metal|plantillas? de metal|inchiku|kabura|tenya)\b/,
    enEspecie: /jigging|jigs/,
  },
  { id: 'surfcasting', nombre: 'surfcasting', enProducto: /\bsurf ?casting\b/, enEspecie: /surfcasting/ },
  { id: 'spinning', nombre: 'spinning', enProducto: /\bspinning\b/, enEspecie: /spinning/ },
  { id: 'currican', nombre: 'curricán', enProducto: /\b(currican|trolling)\b/, enEspecie: /currican/ },
  { id: 'sabiki', nombre: 'sabiki y plumas', enProducto: /\b(sabiki|plumas?|plumillas?)\b/, enEspecie: /sabiki|pluma/ },
  {
    id: 'superficie',
    nombre: 'señuelos de superficie',
    enProducto: /\b(popper|poppers|stickbaits?|paseantes?|needles?|walking)\b/,
    enEspecie: /popper|stickbait|paseante|needle|superficie/,
  },
  { id: 'pulpera', nombre: 'pulpera', enProducto: /\bpulperas?\b/, enEspecie: /pulpera/ },
  { id: 'mosca', nombre: 'pesca a mosca', enProducto: /\b(pesca (a|con) mosca|moscas? de pesca|fly ?fishing|ninfas?|streamers?)\b/, enEspecie: /mosca/ },
  {
    id: 'flotador',
    nombre: 'pesca con flotador',
    enProducto: /\b(corcheo|bobbers?|boyas? de pesca|flotadores? de pesca|bolonesa|coup)\b/,
    enEspecie: /corcheo|flotador|bolonesa|coup/,
    salvoEn: ['embarcaciones'],
  },
]

function textoDe(p: Pick<Product, 'title' | 'description'>): string {
  return normalizar(`${p.title} ${p.description}`)
}

export function tecnicasDeProducto(p: Pick<Product, 'title' | 'description' | 'typeFishing'>): Tecnica[] {
  const texto = textoDe(p)
  return TECNICAS.filter((t) => !t.salvoEn?.includes(String(p.typeFishing)) && t.enProducto.test(texto))
}

export interface EspecieDelProducto {
  especie: SpeciesProfile
  /** `menciona`: la ficha la nombra. `tecnica`: se pesca con una técnica que la ficha usa. */
  motivo: 'menciona' | 'tecnica'
  tecnica?: Tecnica
}

export const MAX_ESPECIES = 6

/**
 * Para qué especies sirve un producto, con el porqué de cada una.
 *
 * Primero las que nombra, en el orden en que las nombra. Después las que se
 * pescan con una técnica que el producto declara, pero solo si la ficha de la
 * especie pide ese material: un señuelo de curricán no es «para la dorada»,
 * aunque la dorada se pesque a veces al curricán, porque su ficha pide
 * anzuelos, cañas y plomos. Es la misma regla que `productosParaEspecie`, así
 * los enlaces coinciden en los dos sentidos.
 */
export function especiesDeProducto(p: Pick<Product, 'title' | 'description' | 'typeFishing' | 'categories'>, max = MAX_ESPECIES): EspecieDelProducto[] {
  const texto = textoDe(p)
  const nombradas = TODAS_LAS_ESPECIES
    .map((especie) => {
      const posiciones = (PATRONES.get(especie.id) ?? []).map((re) => texto.search(re)).filter((i) => i >= 0)
      return { especie, donde: posiciones.length ? Math.min(...posiciones) : -1 }
    })
    .filter((x) => x.donde >= 0)
    .sort((a, b) => a.donde - b.donde)
    .map(({ especie }): EspecieDelProducto => ({ especie, motivo: 'menciona' }))

  const cats = new Set([String(p.typeFishing), ...(p.categories ?? [])])
  const yaEstan = new Set(nombradas.map((e) => e.especie.id))
  const porTecnica: EspecieDelProducto[] = []
  for (const tecnica of tecnicasDeProducto(p)) {
    for (const especie of TODAS_LAS_ESPECIES) {
      if (yaEstan.has(especie.id) || !tecnica.enEspecie.test(normalizar(especie.technique))) continue
      if (!especie.gearCats.some((c) => cats.has(c))) continue
      yaEstan.add(especie.id)
      porTecnica.push({ especie, motivo: 'tecnica', tecnica })
    }
  }

  return [...nombradas, ...porTecnica].slice(0, max)
}

/* ------------------------------------------------------------------------ */
/* Producto → producto                                                       */
/* ------------------------------------------------------------------------ */

/** Palabras que no dicen nada de qué producto es («de», «pesca», «calidad»…). */
const VACIAS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'para', 'con', 'en', 'por', 'un', 'una', 'sin', 'tu', 'tus', 'su',
  'pesca', 'pescar', 'pescador', 'alta', 'calidad', 'premium', 'nuevo', 'nueva', 'profesional', 'mejor', 'set', 'kit',
  'pack', 'piezas', 'unidades', 'uds', 'pcs', 'lote', 'ideal', 'ideales', 'resistente', 'resistentes', 'accesorios',
])

function palabrasDelTitulo(titulo: string): Set<string> {
  return new Set(
    normalizar(titulo)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !VACIAS.has(w) && !/^\d+[a-z]{0,3}$/.test(w))
      .map((w) => w.replace(/(es|s)$/, '')),
  )
}

/** Lo que se necesita de cada producto para compararlo, calculado una vez. */
interface Huella {
  p: Product
  palabras: Set<string>
  especies: Set<string>
  tecnicas: Set<string>
  cats: Set<string>
}

const huellas = new WeakMap<Product, Huella>()

function huella(p: Product): Huella {
  let h = huellas.get(p)
  if (!h) {
    h = {
      p,
      palabras: palabrasDelTitulo(p.title),
      especies: new Set(especiesDeProducto(p).filter((e) => e.motivo === 'menciona').map((e) => e.especie.id)),
      tecnicas: new Set(tecnicasDeProducto(p).map((t) => t.id)),
      cats: new Set([String(p.typeFishing), ...(p.categories ?? [])]),
    }
    huellas.set(p, h)
  }
  return h
}

function comunes<T>(a: Set<T>, b: Set<T>): number {
  let n = 0
  for (const x of a) if (b.has(x)) n++
  return n
}

/** Popularidad para desempatar: la misma que usa el resto de la tienda, sin clics. */
function popularidad(p: Product): number {
  return Math.min(p.reviews, 5000) + p.rating * 20
}

/** Cuánto se parecen dos productos. 0 = nada en común. */
export function parecido(a: Product, b: Product): number {
  const ha = huella(a)
  const hb = huella(b)
  let s = 0
  if (a.typeFishing === b.typeFishing) {
    s += 3
    s += 4 * comunes(new Set(a.subcategories), new Set(b.subcategories))
  }
  s += comunes(ha.cats, hb.cats) - (a.typeFishing === b.typeFishing ? 1 : 0)
  s += 2 * comunes(ha.especies, hb.especies)
  s += 2 * comunes(ha.tecnicas, hb.tecnicas)
  const union = new Set([...ha.palabras, ...hb.palabras]).size
  if (union) s += (6 * comunes(ha.palabras, hb.palabras)) / union
  if (a.price > 0 && b.price > 0) {
    const ratio = Math.max(a.price, b.price) / Math.min(a.price, b.price)
    s += ratio <= 1.5 ? 1.5 : ratio <= 3 ? 0.75 : 0
  }
  return s
}

function ordenEstable(a: Product, b: Product): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * Los más parecidos, disponibles, sin el propio producto.
 *
 * El catálogo tiene el mismo artículo dado de alta varias veces («Giratorios de
 * 3 vías para minutería» tres veces): de los que se llaman igual sale uno.
 */
export function productosParecidos(p: Product, todos: Product[], max = 8): Product[] {
  const titulos = new Set([normalizar(p.title)])
  const salida: Product[] = []
  const ordenados = todos
    .filter((o) => o.id !== p.id && o.inStock)
    .map((o) => ({ o, s: parecido(p, o) }))
    .filter(({ s }) => s >= 3)
    .sort((x, y) => y.s - x.s || popularidad(y.o) - popularidad(x.o) || ordenEstable(x.o, y.o))
  for (const { o } of ordenados) {
    if (salida.length >= max) break
    const t = normalizar(o.title)
    if (titulos.has(t)) continue
    titulos.add(t)
    salida.push(o)
  }
  return salida
}

/**
 * Qué se monta con qué. Es la pregunta que se hace quien acaba de elegir una
 * caña («¿y qué carrete le pongo?»), y la que ninguna ficha contestaba.
 */
export const COMPLEMENTOS: Record<string, string[]> = {
  canas: ['carretes', 'lineas', 'senuelos'],
  carretes: ['lineas', 'canas', 'senuelos'],
  lineas: ['carretes', 'minuteria', 'anzuelos'],
  senuelos: ['lineas', 'minuteria', 'herramientas'],
  anzuelos: ['lineas', 'plomos', 'minuteria'],
  plomos: ['anzuelos', 'minuteria', 'lineas'],
  minuteria: ['lineas', 'anzuelos', 'senuelos'],
  herramientas: ['senuelos', 'equipo', 'lineas'],
  equipo: ['herramientas', 'canas', 'senuelos'],
  electronica: ['equipo', 'embarcaciones', 'herramientas'],
  embarcaciones: ['electronica', 'equipo', 'canas'],
}

const POR_QUE_COMPLEMENTO: Record<string, string> = {
  carretes: 'El carrete para montarla',
  canas: 'La caña que lo acompaña',
  lineas: 'La línea para el montaje',
  senuelos: 'Señuelos para estrenarlo',
  minuteria: 'Emerillones y grapas del montaje',
  anzuelos: 'Anzuelos para el aparejo',
  plomos: 'Plomo para llegar al fondo',
  herramientas: 'Para desanzuelar y cortar',
  equipo: 'Para llevarlo todo ordenado',
  electronica: 'Para leer el fondo',
  embarcaciones: 'Para pescar a flote',
}

export interface Complemento {
  product: Product
  categoria: string
  motivo: string
}

/** Número estable a partir de un texto (FNV-1a): reparte sin azar. */
function hash(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Entre cuántos de los mejores candidatos se reparte cada complemento. */
const REPARTO_COMPLEMENTOS = 12

/**
 * Un producto de cada categoría complementaria. Gana el que comparte especie o
 * técnica con el elegido: a una caña de spinning le va un carrete de spinning.
 *
 * Si empatan —lo normal cuando no hay técnica en común—, no gana siempre el más
 * vendido: medido con las 415 fichas, ese criterio mandaba 258 enlaces a la
 * misma cuchara y casi ninguno al resto. Se reparte entre los 12 más populares
 * según el id del producto de origen, que es estable de un render a otro.
 */
export function complementosDe(p: Product, todos: Product[], max = 3): Complemento[] {
  const hp = huella(p)
  const salida: Complemento[] = []
  for (const categoria of COMPLEMENTOS[String(p.typeFishing)] ?? []) {
    if (salida.length >= max) break
    const candidatos = todos.filter((o) => o.id !== p.id && o.inStock && o.typeFishing === categoria)
    if (!candidatos.length) continue
    const puntua = (o: Product) => {
      const ho = huella(o)
      return 3 * comunes(hp.tecnicas, ho.tecnicas) + 2 * comunes(hp.especies, ho.especies) + comunes(new Set(p.subcategories), new Set(o.subcategories))
    }
    candidatos.sort((a, b) => puntua(b) - puntua(a) || popularidad(b) - popularidad(a) || ordenEstable(a, b))
    const tope = puntua(candidatos[0])
    const empatados = candidatos.filter((o) => puntua(o) === tope).slice(0, REPARTO_COMPLEMENTOS)
    const mejor = empatados[hash(`${p.id}:${categoria}`) % empatados.length]
    const tecnica = TECNICAS.find((t) => hp.tecnicas.has(t.id) && huella(mejor).tecnicas.has(t.id))
    salida.push({
      product: mejor,
      categoria,
      motivo: tecnica ? `${POR_QUE_COMPLEMENTO[categoria] ?? 'Para completar el equipo'} · ${tecnica.nombre}` : POR_QUE_COMPLEMENTO[categoria] ?? 'Para completar el equipo',
    })
  }
  return salida
}

/**
 * El anterior y el siguiente de su categoría, en orden alfabético y en anillo.
 *
 * Es lo que garantiza que NINGUNA ficha se queda huérfana: los parecidos y los
 * complementos tienden a enlazar siempre a los mismos productos populares, y
 * una ficha a la que no enlaza ninguna otra solo la encuentra Google por el
 * sitemap, que es la señal más débil.
 */
export function vecinosDe(p: Product, todos: Product[]): { anterior: Product | null; siguiente: Product | null } {
  const misma = todos
    .filter((o) => o.typeFishing === p.typeFishing)
    .sort((a, b) => normalizar(a.title).localeCompare(normalizar(b.title)) || ordenEstable(a, b))
  const i = misma.findIndex((o) => o.id === p.id)
  if (i < 0 || misma.length < 2) return { anterior: null, siguiente: null }
  const anterior = misma[(i - 1 + misma.length) % misma.length]
  const siguiente = misma[(i + 1) % misma.length]
  return { anterior, siguiente: siguiente.id === anterior.id ? null : siguiente }
}

/**
 * A qué zonas de la malla «pescar X en Y» enlaza una ficha.
 *
 * Una por región y en un orden que depende del producto: así no enlazan todas
 * las fichas de lubina a A Coruña, Ferrol, Ribadeo y Viveiro (las cuatro
 * primeras de la lista), sino que entre todas reparten enlaces por las 187
 * localidades de la costa.
 */
export function zonasParaEnlazar(especieId: string, desde: string, max = 4): FishingSpot[] {
  const porRegion = new Map<string, FishingSpot[]>()
  for (const z of zonesForSpecies(especieId)) porRegion.set(z.region, [...(porRegion.get(z.region) ?? []), z])
  const regiones = [...porRegion.keys()].sort()
  if (!regiones.length) return []
  const h = hash(`${desde}:${especieId}`)
  const salida: FishingSpot[] = []
  for (let i = 0; i < regiones.length && salida.length < max; i++) {
    const zonas = porRegion.get(regiones[(h + i) % regiones.length]) ?? []
    salida.push(zonas[(h >>> 8) % zonas.length])
  }
  return salida
}

/**
 * Las zonas de una especie repartidas por la costa, por turnos de región y en
 * el orden de la costa. La ficha de especie enlazaba las 18 primeras de la
 * lista, y para la lubina eran las 18 de Galicia: ni una de Cantabria, del
 * Mediterráneo o de Canarias.
 */
export function zonasRepartidas(especieId: string, max: number): FishingSpot[] {
  const porRegion = new Map<string, FishingSpot[]>()
  for (const z of zonesForSpecies(especieId)) porRegion.set(z.region, [...(porRegion.get(z.region) ?? []), z])
  const colas = [...porRegion.values()]
  const salida: FishingSpot[] = []
  for (let vuelta = 0; salida.length < max && colas.some((c) => c.length > vuelta); vuelta++) {
    for (const cola of colas) {
      if (cola[vuelta] && salida.length < max) salida.push(cola[vuelta])
    }
  }
  return salida
}

/* ------------------------------------------------------------------------ */
/* Producto ↔ nudos y montajes                                               */
/* ------------------------------------------------------------------------ */

/** «Lecha (pez limón)» → 'lechas'. Null si no hay ficha con ese nombre. */
export function idDeEspeciePorNombre(nombre: string): string | null {
  const n = normalizar(nombre).replace(/\s*\(.*\)$/, '')
  return TODAS_LAS_ESPECIES.find((sp) => normalizar(sp.name) === n)?.id ?? null
}

/** Las especies que nombra la ficha de un nudo, ya como ids. */
export function especiesDeNudo(f: Ficha): string[] {
  return (f.especies ?? []).map(idDeEspeciePorNombre).filter((id): id is string => Boolean(id))
}

/**
 * Los nudos y montajes que se usan con un producto: los de su categoría,
 * primero los que comparten especie con él.
 */
export function nudosDeProducto(p: Product, max = 3): Ficha[] {
  const cats = huella(p).cats
  const especies = huella(p).especies
  return FICHAS
    .filter((f) => f.gearCats.some((c) => cats.has(c)))
    .map((f) => ({ f, s: 2 * especiesDeNudo(f).filter((id) => especies.has(id)).length + (f.gearCats[0] === p.typeFishing ? 1 : 0) }))
    .sort((a, b) => b.s - a.s || a.f.dificultad - b.f.dificultad)
    .slice(0, max)
    .map(({ f }) => f)
}

/** Material para practicar un nudo: de sus categorías, primero el de sus especies. */
export function productosParaNudo(f: Ficha, todos: Product[], max = 4): Product[] {
  const especies = new Set(especiesDeNudo(f))
  return todos
    .filter((p) => p.inStock && f.gearCats.includes(String(p.typeFishing)))
    .map((p) => ({ p, s: comunes(huella(p).especies, especies) * 2 + (p.typeFishing === f.gearCats[0] ? 1 : 0) }))
    .sort((a, b) => b.s - a.s || popularidad(b.p) - popularidad(a.p) || ordenEstable(a.p, b.p))
    .slice(0, max)
    .map(({ p }) => p)
}

/* ------------------------------------------------------------------------ */
/* Especie → productos                                                       */
/* ------------------------------------------------------------------------ */

export interface ProductoParaEspecie {
  product: Product
  motivo: 'menciona' | 'tecnica'
  tecnica?: Tecnica
}

/**
 * La vuelta de `especiesDeProducto`: los productos que sirven para una especie,
 * con la misma regla, para que los enlaces vayan en los dos sentidos. Primero
 * los que la nombran; dentro, los de las categorías que pide su ficha.
 */
export function productosParaEspecie(sp: SpeciesProfile, todos: Product[], max = 8): ProductoParaEspecie[] {
  const orden = (cat: string) => {
    const i = sp.gearCats.indexOf(cat)
    return i < 0 ? sp.gearCats.length : i
  }
  const encontrados: (ProductoParaEspecie & { peso: number })[] = []
  for (const product of todos) {
    if (!product.inStock) continue
    const e = especiesDeProducto(product, TODAS_LAS_ESPECIES.length).find((x) => x.especie.id === sp.id)
    // Por técnica ya solo llegan las especies que piden ese material: un
    // emerillón de spinning no es «material para la lubina».
    if (!e) continue
    encontrados.push({ product, motivo: e.motivo, tecnica: e.tecnica, peso: (e.motivo === 'menciona' ? 0 : 100) + orden(String(product.typeFishing)) })
  }
  // Variedad: no ocho señuelos seguidos. Se reparte por categoría en turnos.
  encontrados.sort((a, b) => a.peso - b.peso || popularidad(b.product) - popularidad(a.product) || ordenEstable(a.product, b.product))
  const porCategoria = new Map<string, typeof encontrados>()
  for (const e of encontrados) {
    const k = `${e.motivo}:${e.product.typeFishing}`
    porCategoria.set(k, [...(porCategoria.get(k) ?? []), e])
  }
  const salida: ProductoParaEspecie[] = []
  const colas = [...porCategoria.values()]
  while (salida.length < max && colas.some((c) => c.length)) {
    for (const cola of colas) {
      const e = cola.shift()
      if (e && salida.length < max) salida.push({ product: e.product, motivo: e.motivo, tecnica: e.tecnica })
    }
  }
  return salida
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * La temporada de una especie en pocas letras: «sep–mar», «todo el año», o los
 * meses sueltos si no son seguidos.
 */
export function temporada(sp: Pick<SpeciesProfile, 'bestMonths'>): string {
  const meses = [...new Set(sp.bestMonths)].filter((m) => m >= 1 && m <= 12)
  if (meses.length >= 12) return 'todo el año'
  if (!meses.length) return ''
  const hay = new Set(meses)
  // Busca el mes donde arranca el tramo: uno que está y cuyo anterior no.
  const inicio = meses.find((m) => !hay.has(m === 1 ? 12 : m - 1))
  if (inicio === undefined) return 'todo el año'
  let fin = inicio
  let largo = 1
  while (hay.has((fin % 12) + 1) && largo < meses.length) {
    fin = (fin % 12) + 1
    largo++
  }
  if (largo === meses.length) return largo === 1 ? MESES[inicio - 1] : `${MESES[inicio - 1]}–${MESES[fin - 1]}`
  return [...meses].sort((a, b) => a - b).map((m) => MESES[m - 1]).join(', ')
}

/* ------------------------------------------------------------------------ */
/* Guía → especies y productos                                               */
/* ------------------------------------------------------------------------ */

type Texto = { title: string; content: string; typeFishing: string }

/** Las especies de las que habla una guía, con la misma regla que un producto. */
export function especiesDeGuia(g: Texto, max = 8): EspecieDelProducto[] {
  return especiesDeProducto({ title: g.title, description: g.content, typeFishing: g.typeFishing, categories: g.typeFishing ? [g.typeFishing] : [] }, max)
}

/**
 * El material que acompaña a una guía: de su categoría, primero lo que comparte
 * especie o técnica con lo que la guía cuenta.
 */
export function productosParaGuia(g: Texto, todos: Product[], max = 4): Product[] {
  if (!g.typeFishing) return []
  const especies = new Set(especiesDeGuia(g, TODAS_LAS_ESPECIES.length).map((e) => e.especie.id))
  const tecnicas = new Set(tecnicasDeProducto({ title: g.title, description: g.content, typeFishing: g.typeFishing }).map((t) => t.id))
  return todos
    .filter((p) => p.inStock && (p.typeFishing === g.typeFishing || p.categories?.includes(g.typeFishing)))
    .map((p) => ({ p, s: 2 * comunes(huella(p).especies, especies) + 2 * comunes(huella(p).tecnicas, tecnicas) }))
    .sort((a, b) => b.s - a.s || popularidad(b.p) - popularidad(a.p) || ordenEstable(a.p, b.p))
    .slice(0, max)
    .map(({ p }) => p)
}
