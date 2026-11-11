import type { Product } from '@/types'

/**
 * Título, descripción y datos estructurados de las fichas de producto.
 *
 * Medido en las 415 fichas públicas el 2026-11-11:
 *  - 266 títulos llevaban la marca dos veces («… | PescaPlus · PescaPlus»): la
 *    IA escribía «| PescaPlus» y la plantilla del layout añadía « · PescaPlus».
 *  - 101 títulos repetidos: 29 fichas distintas se llamaban «Anzuelos de
 *    pesca». Google no sabe cuál enseñar y las fichas compiten entre sí.
 *  - 193 títulos de más de 60 caracteres, que Google corta.
 *  - 253 descripciones cortadas a media palabra («…Compra ahora y ll»), porque
 *    se recortaban por caracteres y no por frases.
 *
 * Se arregla al pintar y no en la base de datos: así vale para las fichas ya
 * guardadas, para las que lleguen y para las que reescriba la IA.
 */

export const MARCA = 'PescaPlus'
const SUFIJO_MARCA = ` · ${MARCA}`
/** Lo que Google enseña de un título antes de cortarlo con «…». */
export const TITULO_MAX = 60
export const DESCRIPCION_MAX = 160

export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function espacios(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim()
}

/** Quita la marca del final: «Carrete X | PescaPlus» → «Carrete X». */
export function quitarMarca(titulo: string): string {
  let t = espacios(titulo)
  const cola = new RegExp(`\\s*(?:[|·•:–—-]\\s*)?(?:en\\s+)?${MARCA}\\s*$`, 'i')
  while (cola.test(t)) t = t.replace(cola, '')
  return t
}

/**
 * Palabras que no pueden cerrar un título o una frase recortada: «Caña de
 * pesca para» se lee como un corte, «Caña de pesca» no.
 */
const CONECTORES = new Set([
  'a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'la', 'las', 'lo', 'los', 'o', 'para', 'por', 'que',
  'sin', 'su', 'sus', 'tu', 'tus', 'u', 'un', 'una', 'y', 'ideal', 'ideales', 'perfecto', 'perfecta',
])

function limpiarCola(texto: string): string {
  let t = texto.replace(/[\s,;:·|/+(–—-]+$/, '')
  for (;;) {
    const m = t.match(/\s(\S+)$/)
    if (!m || !CONECTORES.has(normalizar(m[1]))) break
    t = t.slice(0, -m[0].length).replace(/[\s,;:·|/+(–—-]+$/, '')
  }
  return t
}

/**
 * Recorta a `max` sin partir palabras. Prefiere cortar donde ya hay una pausa
 * (dos puntos, coma, guion) si así queda un texto con cuerpo: «Soporte de caña
 * para embarcaciones en PVC, ideal para kayak…» → «Soporte de caña para
 * embarcaciones en PVC».
 */
export function recortarPorPalabras(texto: string, max: number): string {
  const t = espacios(texto)
  if (t.length <= max) return t
  const tramo = t.slice(0, max + 1)
  // Dos puntos y comas entre cifras no son pausas: «5,2:1», «0,8 mm».
  let pausa = -1
  for (const m of tramo.matchAll(/(?<!\d)[:,](?!\d)| [-–|] /g)) pausa = m.index ?? pausa
  if (pausa >= max * 0.55) return limpiarCola(tramo.slice(0, pausa))
  const espacio = tramo.lastIndexOf(' ')
  return limpiarCola(espacio > 0 ? tramo.slice(0, espacio) : t.slice(0, max))
}

/**
 * Palabras que no distinguen un producto de otro. Un título hecho solo de ellas
 * («Anzuelos de pesca», «Señuelos de metal de alta calidad») vale para cien
 * fichas y no posiciona ninguna.
 */
const GENERICAS = new Set([
  'pesca', 'pescar', 'pescador', 'pescadores', 'de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'para', 'con', 'en',
  'alta', 'calidad', 'premium', 'mejor', 'mejores', 'nuevo', 'nueva', 'profesional', 'resistente', 'resistentes',
  'anzuelo', 'anzuelos', 'linea', 'lineas', 'hilo', 'sedal', 'senuelo', 'senuelos', 'cana', 'canas', 'carrete', 'carretes',
  'plomo', 'plomos', 'minuteria', 'herramienta', 'herramientas', 'equipo', 'accesorio', 'accesorios', 'electronica',
  'embarcacion', 'embarcaciones', 'metal', 'set', 'kit', 'pack', 'piezas', 'unidades', 'tienda', 'compra', 'comprar',
  'pescaplus',
])

export function esTituloGenerico(titulo: string): boolean {
  const propias = normalizar(quitarMarca(titulo))
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !GENERICAS.has(w))
  return propias.length < 2
}

function claveTitulo(titulo: string): string {
  return normalizar(quitarMarca(titulo)).replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Meta títulos que comparten dos o más productos: ninguno de ellos los usa. */
export function titulosRepetidos(productos: readonly Pick<Product, 'seoTitle'>[]): Set<string> {
  const vistos = new Map<string, number>()
  for (const p of productos) {
    if (!p.seoTitle) continue
    const k = claveTitulo(p.seoTitle)
    vistos.set(k, (vistos.get(k) ?? 0) + 1)
  }
  return new Set([...vistos].filter(([, n]) => n > 1).map(([k]) => k))
}

/**
 * El título de la pestaña y del resultado de Google, ya completo (se publica
 * con `title.absolute`, sin la plantilla del layout).
 *
 * Usa el meta título de la IA si es propio de este producto; si es genérico o
 * lo comparte con otra ficha, el nombre del producto. Lleva la marca solo si
 * cabe en 60 caracteres: con títulos largos, la marca es lo primero que sobra.
 */
export function tituloSeo(p: Pick<Product, 'title' | 'seoTitle'>, repetidos: Set<string> = new Set()): string {
  const meta = quitarMarca(p.seoTitle ?? '')
  const metaVale = meta.length >= 25 && !esTituloGenerico(meta) && !repetidos.has(claveTitulo(meta))
  // La cola se limpia siempre: hay meta títulos guardados que ya acaban en «en»
  // o en «|» porque se recortaron antes de llegar aquí.
  const base = limpiarCola(metaVale ? meta : quitarMarca(p.title))
  if (base.length + SUFIJO_MARCA.length <= TITULO_MAX) return base + SUFIJO_MARCA
  const recortado = recortarPorPalabras(base, TITULO_MAX)
  // Si el corte cae en una pausa temprana («… lubina | Spiker TPE»), puede
  // sobrar sitio para la marca.
  return recortado.length + SUFIJO_MARCA.length <= TITULO_MAX ? recortado + SUFIJO_MARCA : recortado
}

/** Texto plano a partir del marcado ligero de las descripciones. */
export function textoPlano(texto: string): string {
  return espacios(
    (texto ?? '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^\s*[-*]\s+/gm, '')
      .replace(/[*_#>`]/g, ''),
  )
}

/**
 * Frases completas. Corta tras «.», «!», «?» o «…» seguidos de espacio y de algo
 * que abre frase, para no partir «4.1:1» ni «0.8 mm».
 */
export function partirFrases(texto: string): string[] {
  return espacios(texto)
    .split(/(?<=[.!?…])\s+(?=[¡¿"«(A-ZÁÉÍÓÚÑ0-9])/)
    .map((f) => f.trim())
    .filter(Boolean)
}

const CIERRA_FRASE = /[.!?…]["»)]?$/

/** Lo que mide un texto recortado por caracteres: los cortes viejos eran a 160 y 165. */
const LARGO_DE_CORTE = 150

/**
 * Frases completas de un texto. La última solo vale sin punto final si el texto
 * es corto: entonces es que se escribió así («Compra ahora y mejora tus
 * capturas»). Si mide lo que medían los cortes, es un corte y se descarta.
 */
function frasesCompletas(texto: string): string[] {
  const plano = textoPlano(texto)
  const frases = partirFrases(plano)
  const ultima = frases[frases.length - 1]
  if (ultima && !CIERRA_FRASE.test(ultima)) {
    frases.pop()
    if (plano.length < LARGO_DE_CORTE && limpiarCola(ultima) === ultima) frases.push(`${ultima}.`)
  }
  return frases
}

function palabras(texto: string): Set<string> {
  return new Set(normalizar(texto).split(/[^a-z0-9]+/).filter((w) => w.length > 3))
}

/** Dos frases dicen lo mismo si comparten más de la mitad de sus palabras. */
function repite(frase: string, ya: string[]): boolean {
  const a = palabras(frase)
  return ya.some((otra) => {
    const b = palabras(otra)
    const comunes = [...a].filter((w) => b.has(w)).length
    return comunes / Math.max(1, Math.min(a.size, b.size)) > 0.5
  })
}

/**
 * La meta descripción, hecha solo de frases enteras.
 *
 * Primero las frases completas de la meta descripción guardada; si así queda
 * corta (al quitar la frase cortada a veces solo sobrevive una), se completa
 * con frases de la descripción visible que no repitan lo ya dicho. Si ni la
 * primera frase cabe, se recorta por palabras y se avisa con «…».
 */
export function descripcionSeo(p: Pick<Product, 'seoDescription' | 'description'>, max = DESCRIPCION_MAX): string {
  const elegidas: string[] = []
  let largo = 0
  const propias = frasesCompletas(p.seoDescription)
  const deRelleno = frasesCompletas(p.description)
  for (const [i, frase] of [...propias, ...deRelleno].entries()) {
    // Las de la meta descripción entran mientras quepan; las de la descripción
    // visible, solo si lo elegido aún se queda corto.
    if (i >= propias.length && largo >= 110) break
    const extra = (elegidas.length ? 1 : 0) + frase.length
    if (largo + extra > max || repite(frase, elegidas)) continue
    elegidas.push(frase)
    largo += extra
  }
  const salida = elegidas.join(' ')
  if (salida.length >= 70) return salida
  const fuente = textoPlano(p.seoDescription) || textoPlano(p.description)
  if (fuente.length <= max) return salida.length >= fuente.length ? salida : fuente
  return `${recortarPorPalabras(fuente, max - 1)}…`
}

export interface ProductoLdOpciones {
  url: string
  imagenes: string[]
  /** «Señuelos > Vinilos y cebos blandos». */
  categoria: string
  descripcion: string
  /** Fichas parecidas, para `isSimilarTo`. */
  parecidos?: { name: string; url: string }[]
}

/**
 * Datos estructurados `Product`.
 *
 * SIN `aggregateRating`, a propósito. La ficha publicaba como `reviewCount` las
 * UNIDADES VENDIDAS (5.689 «opiniones» en un anzuelo de 3 €), y la nota venía
 * de la tienda de origen, no de opiniones recogidas aquí. Google prohíbe las
 * dos cosas en sus directrices de fragmentos de reseñas, y el castigo por datos
 * estructurados engañosos es quitar los resultados enriquecidos de TODO el
 * sitio, no solo de la ficha. Las estrellas se siguen viendo en la página.
 */
export function productoJsonLd(p: Product, o: ProductoLdOpciones) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    url: o.url,
    ...(p.sku ? { sku: p.sku } : {}),
    image: o.imagenes,
    description: o.descripcion,
    category: o.categoria,
    offers: {
      '@type': 'Offer',
      url: o.url,
      price: p.price.toFixed(2),
      priceCurrency: p.currency,
      itemCondition: 'https://schema.org/NewCondition',
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    ...(o.parecidos?.length
      ? { isSimilarTo: o.parecidos.map((r) => ({ '@type': 'Product', name: r.name, url: r.url })) }
      : {}),
  }
}

/** «la lubina, el lucio y el black bass». */
export function enumerar(cosas: string[]): string {
  if (cosas.length <= 1) return cosas.join('')
  return `${cosas.slice(0, -1).join(', ')} y ${cosas[cosas.length - 1]}`
}

/**
 * Si el nombre de un producto es plural, para concordar el verbo: «¿Cuánto
 * cuestan Señuelos blandos…?», «¿Cuánto cuesta Caña telescópica…?». Basta con la
 * primera palabra: o es un número («50 conectores») o acaba en -s.
 */
export function esPlural(nombre: string): boolean {
  const primera = normalizar(nombre.trim().split(/\s+/)[0] ?? '')
  return /^\d/.test(primera) || primera.endsWith('s')
}

export interface DatosPreguntas {
  /** El nombre del producto, ya acortado si hacía falta. */
  nombre: string
  /** «Señuelos › Vinilos y cebos blandos». */
  ruta: string
  /** Especies que la ficha nombra, con artículo: «la lubina». */
  nombradas: string[]
  /** Técnicas que la ficha declara, y con qué especies se usan según sus fichas. */
  tecnicas: { nombre: string; especies: string[] }[]
  nudos: { name: string; para: string; resistencia: string }[]
  precio: string
  alternativas: { cuantas: number; desde: string | null; donde: string; ranking: string | null }
}

/**
 * Las preguntas frecuentes de UNA ficha, con sus datos.
 *
 * Antes eran las mismas cuatro preguntas en las 415 fichas, palabra por
 * palabra: texto repetido que no aporta nada a quien lee ni a Google. Ahora
 * cada respuesta sale de lo que se sabe del producto (especies, técnica, nudos,
 * precio, alternativas) y una pregunta sin datos no se hace.
 */
export function preguntasDeProducto(d: DatosPreguntas): { q: string; a: string }[] {
  const faqs: { q: string; a: string }[] = []
  const pl = esPlural(d.nombre)

  const tecnicasConEspecies = d.tecnicas.filter((t) => t.especies.length)
  if (d.nombradas.length || tecnicasConEspecies.length) {
    const partes: string[] = []
    if (d.nombradas.length) partes.push(`Su ficha ${pl ? 'los' : 'lo'} recomienda para ${enumerar(d.nombradas)}.`)
    for (const t of tecnicasConEspecies.slice(0, 2)) {
      const verbo = d.nombradas.length ? (pl ? 'Además son' : 'Además es') : pl ? 'Son' : 'Es'
      partes.push(`${verbo} material de ${t.nombre}, la técnica con la que se pescan ${enumerar(t.especies)} según nuestras fichas de especie.`)
    }
    faqs.push({ q: `¿Para qué peces ${pl ? 'sirven' : 'sirve'} ${d.nombre}?`, a: partes.join(' ') })
  } else {
    faqs.push({
      q: `¿Para qué tipo de pesca ${pl ? 'son' : 'es'} ${d.nombre}?`,
      a: `${pl ? 'Son artículos' : 'Es un artículo'} de ${d.ruta}. Si dudas de si encaja con tu técnica o con la especie que buscas, pregunta gratis a nuestro asesor de pesca.`,
    })
  }

  const [nudo, ...otros] = d.nudos
  if (nudo) {
    const para = nudo.para.replace(/\.$/, '')
    faqs.push({
      q: `¿Qué nudo o montaje uso con ${d.nombre}?`,
      a: `${nudo.name}: ${para.charAt(0).toLowerCase()}${para.slice(1)}.${/%/.test(nudo.resistencia) ? ` Conserva el ${nudo.resistencia}.` : ''}${otros.length ? ` También te sirve: ${enumerar(otros.map((o) => o.name.toLowerCase()))}.` : ''}`,
    })
  }

  faqs.push({
    q: `¿Cuánto ${pl ? 'cuestan' : 'cuesta'} ${d.nombre}?`,
    a: `Ahora mismo ${pl ? 'aparecen' : 'aparece'} a ${d.precio}. Es un precio orientativo: el importe final, el envío y los plazos los fija la tienda del vendedor, que es donde se completa la compra.`,
  })

  const { cuantas, desde, donde, ranking } = d.alternativas
  if (cuantas > 0) {
    faqs.push({
      q: '¿Qué alternativas hay?',
      a: `En ${donde} hay ${cuantas} ${cuantas === 1 ? 'modelo más' : 'modelos más'}${desde ? `, desde ${desde}` : ''}. Más abajo tienes los más parecidos a este${ranking ? `, y en «${ranking}» los más elegidos` : ''}.`,
    })
  }

  faqs.push({
    q: '¿Cómo se realiza la compra?',
    a: 'Al pulsar «Comprar ahora» te llevamos a la tienda del vendedor, donde finalizas el pedido con su proceso de pago y envío. Algunos enlaces son de afiliados.',
  })
  return faqs
}

/** «12,99 €». */
export function precioEnTexto(precio: number, moneda: string): string {
  return `${precio.toFixed(2).replace('.', ',')} ${moneda === 'EUR' ? '€' : moneda}`
}
