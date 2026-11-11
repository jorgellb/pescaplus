/**
 * Amplía el catálogo: productos nuevos por categoría, sin duplicar ninguno.
 *
 *   npx tsx --env-file=.env scripts/ampliar-catalogo.ts buscar     1. busca y elige
 *   npx tsx --env-file=.env scripts/ampliar-catalogo.ts redactar   2. SEO con IA (se puede repetir)
 *   node --env-file=.env scripts/aplicar-ampliacion.mjs            3. revisa y da de alta
 *
 * Los pasos 1 y 2 NO tocan la base de datos (se borra DATABASE_URL al
 * arrancar): el catálogo actual se lee de la API pública de la web. El
 * resultado queda en scripts/datos/ampliacion-catalogo.json para revisarlo.
 *
 * Cómo elige, por cada tipo de cada categoría:
 *  - Solo productos de la categoría «Pesca» de la tienda, con envío a España,
 *    valoración ≥ 92 %, ≥ 50 vendidos, ≥ 3 fotos y precio razonable.
 *  - Que el título diga que es de esa categoría y de ese tipo (una búsqueda de
 *    «spinning reel» también devuelve enrolladores de línea).
 *  - Sin duplicados: ni el mismo artículo, ni un título casi igual, ni la misma
 *    FOTO (así se colaban antes: mismo producto, otra tienda, otro número).
 *  - Ordenados por valoración, ventas, comisión y vídeo; repartidos entre los
 *    tipos para que la categoría crezca entera y no solo por un lado.
 *
 * El SEO lo escribe `polishProductSeo` con la cadena de lote (NVIDIA y Groq,
 * nunca OpenRouter, que es el cupo del asesor del chat). Si la IA se queda sin
 * cupo, el paso 2 se para y se retoma donde lo dejó.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import { join } from 'node:path'

// Antes de cargar nada de lib/: estos pasos no deben poder tocar la base de datos.
delete process.env.DATABASE_URL
delete process.env.DIRECT_URL

// Se lanza desde la raíz del proyecto, como el resto de scripts.
const RAIZ = process.cwd()
if (!existsSync(join(RAIZ, 'lib', 'subcategoria-auto.ts'))) {
  console.error('Lánzalo desde la carpeta del proyecto (la que tiene package.json).')
  process.exit(1)
}
const SALIDA = join(RAIZ, 'scripts', 'datos', 'ampliacion-catalogo.json')
const POR_CATEGORIA = Number(process.env.AMPLIAR_POR_CATEGORIA ?? 20)
/** Reservas por categoría por si la IA no consigue redactar alguno. */
const RESERVAS = 4
const WEB = process.env.AMPLIAR_WEB ?? 'https://pescaplus.es'

/** Qué buscar para cada tipo. En inglés: la tienda busca mejor así y devuelve el título en castellano. */
const BUSQUEDAS: Record<string, Record<string, string[]>> = {
  anzuelos: {
    simples: ['high carbon steel fishing hooks', 'saltwater fishing hooks'],
    triples: ['treble hooks fishing'],
    montaje: ['carp fishing hooks', 'offset worm hooks'],
    especiales: ['circle hooks fishing', 'double fishing hooks'],
  },
  lineas: {
    trenzado: ['braided fishing line 8 strands', 'braided fishing line x4'],
    monofilamento: ['nylon monofilament fishing line'],
    fluorocarbono: ['fluorocarbon fishing line leader'],
  },
  senuelos: {
    vinilos: ['soft plastic shad lure', 'soft bait worm lure'],
    duros: ['minnow fishing lure', 'crankbait lure', 'jerkbait lure'],
    cucharillas: ['spinner spoon lure', 'metal jig casting lure'],
    superficie: ['popper topwater lure', 'pencil topwater lure'],
  },
  canas: {
    spinning: ['spinning fishing rod carbon'],
    mar: ['surf casting rod', 'boat jigging rod'],
    telescopicas: ['telescopic fishing rod'],
    baitcasting: ['baitcasting fishing rod'],
  },
  carretes: {
    spinning: ['spinning fishing reel'],
    baitcasting: ['baitcasting fishing reel'],
    mar: ['surfcasting fishing reel', 'trolling fishing reel'],
  },
  electronica: {
    sondas: ['fish finder sonar'],
    camaras: ['underwater fishing camera', 'fishing camera monitor'],
    accesorios: ['fishing headlamp', 'fishing bite alarm', 'underwater fishing light led', 'fishing rod tip light'],
  },
  embarcaciones: {
    floattube: ['fishing float tube', 'belly boat fishing'],
    kayaks: ['inflatable fishing boat', 'fishing kayak', 'kayak paddle'],
    accesorios: ['kayak fishing rod holder', 'boat anchor folding', 'kayak seat', 'boat rod holder'],
  },
  minuteria: {
    emerillones: ['ball bearing swivel fishing'],
    conectores: ['fishing snap coastlock', 'fishing snap clip'],
    montaje: ['fishing beads stopper', 'fishing rig sleeve'],
    kits: ['fishing accessories kit box'],
  },
  plomos: {
    fondo: ['pyramid sinker surf fishing', 'fishing sinker weights'],
    jig: ['lead jig head hook', 'jig head fishing'],
    especiales: ['tungsten fishing weights', 'olive sinker fishing'],
  },
  herramientas: {
    alicates: ['fishing pliers', 'fish lip grip'],
    corte: ['braid scissors fishing line cutter'],
    otras: ['fish scale digital fishing', 'fish hook remover'],
  },
  equipo: {
    almacenaje: ['fishing tackle box', 'fishing tackle bag'],
    vestuario: ['fishing gloves', 'fishing face mask hat'],
    accesorios: ['fishing rod holder', 'fishing landing net'],
  },
}

/** Piezas sueltas y objetos que no son material de pesca. */
const NO_ES_PESCA = /\b(mangos?|manivelas?|pomos?|perillas?|repuestos?|mosquetones|mosqueton|llaveros?|hebillas?|calcetines|toallas?|silbatos?|rotulas?|aceites?|lubricantes?|grasas?|cubiertas?|reparacion)\b/

/**
 * Qué es un producto lo dice el PRIMER sustantivo de pesca de su título. En
 * castellano lo que es el producto va primero: «Soporte para caña de pescar»
 * es un soporte, no una caña, y «Señuelo de vibración con luz LED» es un
 * señuelo aunque nombre la luz. Algunos sustantivos valen para dos categorías
 * (un soporte puede ser de barco o de orilla).
 */
const SUSTANTIVOS: [RegExp, string[]][] = [
  // Piezas sueltas y objetos que no son material de pesca: si son lo primero
  // del título, el producto no entra en ninguna categoría.
  [NO_ES_PESCA, []],
  [/\b(anzuelos?|ganchos?)\b/, ['anzuelos']],
  [/\b(lineas?|hilos?|sedal(es)?|trenzad[oa]s?|fluorocarbono|monofilamento)\b/, ['lineas']],
  [/\b(senuelos?|cebos?|vinilos?|minnows?|poppers?|cucharas?|cucharillas?|crankbaits?|lapiz|swimbaits?|spinnerbaits?|jerkbaits?|stickbaits?|wobblers?|jigs?|plantillas?)\b/, ['senuelos']],
  [/\b(canas?|varas?)\b/, ['canas']],
  [/\bcarretes?\b/, ['carretes']],
  [/\b(sondas?|sonar|buscador(es)?|localizador(es)?|ecosonda|camaras?|linternas?|faros?|alarmas?|campanas?|luz|luces|lamparas?)\b/, ['electronica']],
  [/\b(barcos?|botes?|kayaks?|float|belly|anclas?|remos?|palas?|balsas?|escotillas?|portavasos|carritos?)\b/, ['embarcaciones']],
  [/\b(giratorios?|emerillon(es)?|rodamientos?|grapas?|conectores?|clips?|perlas?|topes?|anillas?|broches?|barril(es)?|mangas?|tubos?)\b/, ['minuteria']],
  [/\b(plomos?|pesos?|plomadas?|lastres?|tungsteno|cabezas?)\b/, ['plomos']],
  [/\b(alicates?|pinzas?|tijeras?|cortador(es)?|cortahilos|basculas?|balanzas?|desanzuelador(es)?|extractor(es)?|removedor(es)?|desenganche)\b/, ['herramientas']],
  [/\b(soportes?)\b/, ['equipo', 'embarcaciones']],
  [/\b(cajas?|bolsas?|mochilas?|guantes?|gorras?|sombreros?|mascaras?|bragas?|red(es)?|sacaderas?|salabardos?|fundas?|sillas?|camisetas?|estuches?)\b/, ['equipo']],
]

/** Palabras que no cuentan al medir lo lejos que está el sustantivo. */
const RELLENO = /^(\d[\w.,/#-]*|#|uds?|unids?|unidades|piezas|pzs|pcs|juego|set|lote|kit|pack|de|y|x)$/

/**
 * Las categorías del primer sustantivo de pesca del título, o [] si no tiene.
 * Tiene que salir pronto (en las 7 primeras palabras con contenido): una
 * «Toalla de pesca con forma de pez… para kayak» nombra el kayak, pero no es de
 * embarcaciones.
 */
function categoriasDelTitulo(titulo: string): string[] {
  const t = normalizar(titulo).replace(/[,;:()|/]+/g, ' ')
  let mejor: { donde: number; cats: string[] } | null = null
  for (const [re, cats] of SUSTANTIVOS) {
    const donde = t.search(re)
    if (donde >= 0 && (!mejor || donde < mejor.donde)) mejor = { donde, cats }
  }
  if (!mejor) return []
  const palabrasAntes = (i: number) => t.slice(0, i).split(/\s+/).filter((w) => w && !RELLENO.test(w)).length
  // Una pieza o un objeto que no es de pesca al principio del título manda,
  // aunque no sea lo primero: «Gancho para llavero», «Baitcasting carrete perilla».
  const veto = t.search(NO_ES_PESCA)
  if (veto >= 0 && palabrasAntes(veto) <= 4) return []
  return palabrasAntes(mejor.donde) <= 6 ? mejor.cats : []
}

/**
 * Topes de variedad: sin ellos, «electrónica» eran nueve linternas frontales
 * (son lo que más se vende) y no lo que la categoría promete.
 */
const TOPES: Record<string, [RegExp, number][]> = {
  electronica: [[/linterna|faro/, 3], [/alarma|campana/, 2], [/\b(luz|luces|lampara)/, 4]],
  embarcaciones: [[/soporte/, 6]],
  equipo: [[/soporte/, 4], [/guante/, 3], [/sombrero|gorra|mascara|braga/, 3], [/caja/, 4]],
  canas: [[/\b(kit|kits|juego|combo)\b/, 2]],
  carretes: [[/\b(kit|kits|juego|combo)\b/, 1]],
  herramientas: [[/bascula|balanza/, 3], [/alicate|pinza/, 9]],
}

/**
 * Lo que además tiene que decir el título, en cualquier parte. Un «soporte de
 * caña» solo es de embarcaciones si es para barco o kayak.
 */
const CONTEXTO: Record<string, RegExp> = {
  embarcaciones: /barco|bote|kayak|yate|embarcacion|float tube|belly|lancha|canoa|marino/,
}

/**
 * Códigos de modelo («S05», «HS42», «FF1108»): letras y cifras juntas, sin ser
 * una medida («50kg», «100m»). Dos productos con el mismo código son el mismo.
 */
function modelos(titulo: string): Set<string> {
  return new Set(
    normalizar(titulo)
      .split(/[^a-z0-9]+/)
      .filter((x) => x.length >= 3 && /[a-z]/.test(x) && /\d/.test(x))
      .filter((x) => !/^\d+(mm|cm|m|kg|g|lb|lbs|uds|pcs|pzs|lm|mah|w|v|ft|x|h|pcs)$/.test(x) && !/^x\d+$/.test(x)),
  )
}

/** Lo que nunca es material de pesca aunque salga en la búsqueda. */
const FUERA = /juguete|infantil|para ninos|mascota|perro|gato|disfraz|decoracion|pendiente|collar|anillo de boda|reloj|bicicleta/

const CATEGORIA_PESCA = '100005537'

interface Candidato {
  sku: string
  categoria: string
  subcategoria: string
  titulo: string
  url: string
  tienda: string
  imagenes: string[]
  video: string
  precio: number
  valoracion: number
  vendidos: number
  comision: number
  puntos: number
}

interface Seo {
  title: string
  seoTitle: string
  description: string
  seoDescription: string
  imageAlts: string[]
}

interface Propuesta extends Candidato {
  reserva: boolean
  seo?: Seo
  enlace?: string
  intentos: number
}

interface Archivo {
  creado: string
  porCategoria: number
  propuestas: Propuesta[]
}

/* ---------------------------------------------------------------------- */

function normalizar(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function palabras(t: string): Set<string> {
  return new Set(normalizar(t).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !/^\d+$/.test(w)))
}

function parecidoTitulos(a: string, b: string): number {
  const x = palabras(a)
  const y = palabras(b)
  const comunes = [...x].filter((w) => y.has(w)).length
  return comunes / Math.max(1, new Set([...x, ...y]).size)
}

/** Bits distintos entre dos huellas de 64 bits (16 cifras hexadecimales), en dos mitades de 32. */
function distancia(a: string, b: string): number {
  let n = 0
  for (const i of [0, 8]) {
    let x = (parseInt(a.slice(i, i + 8), 16) ^ parseInt(b.slice(i, i + 8), 16)) >>> 0
    while (x) {
      n += x & 1
      x >>>= 1
    }
  }
  return n
}

/**
 * Dos fotos son la misma si sus huellas difieren en 3 bits o menos de 64. Las
 * copias reales dan 0; dos señuelos distintos sobre fondo blanco ya dan 7.
 */
const MISMA_FOTO = 3
const MISMO_TITULO = 0.7

/**
 * La API pública da las fotos por el proxy de la web: /img/<nombre>/<URL
 * original en base64>. Para comparar hay que volver a la original.
 */
function urlOriginal(u: string): string {
  const m = u.match(/^\/img\/[^/]+\/([A-Za-z0-9_-]+)$/)
  if (m) return Buffer.from(m[1], 'base64url').toString('utf8')
  return u.startsWith('/') ? `${WEB}${u}` : u
}

function huellas(urls: string[]): Record<string, string> {
  if (!urls.length) return {}
  const salida = execFileSync('python3', ['-I', join(RAIZ, 'scripts', 'hash-fotos.py')], {
    input: JSON.stringify(urls),
    maxBuffer: 50_000_000,
  })
  return JSON.parse(salida.toString()) as Record<string, string>
}

/* ---------------------------------------------------------------------- */

async function llamarTienda(params: Record<string, string>): Promise<Record<string, unknown>> {
  const KEY = process.env.ALIEXPRESS_APP_KEY
  const SECRET = process.env.ALIEXPRESS_APP_SECRET
  if (!KEY || !SECRET) throw new Error('Faltan ALIEXPRESS_APP_KEY / ALIEXPRESS_APP_SECRET en .env')
  const todo: Record<string, string> = {
    app_key: KEY,
    sign_method: 'sha256',
    timestamp: Date.now().toString(),
    format: 'json',
    v: '2.0',
    tracking_id: process.env.ALIEXPRESS_TRACKING_ID ?? 'pescaplus',
    ...params,
  }
  const base = Object.keys(todo).sort().map((k) => `${k}${todo[k]}`).join('')
  todo.sign = crypto.createHmac('sha256', SECRET).update(base, 'utf8').digest('hex').toUpperCase()
  const gateway = process.env.ALIEXPRESS_GATEWAY ?? 'https://api-sg.aliexpress.com/sync'
  const res = await fetch(`${gateway}?${new URLSearchParams(todo)}`, { method: 'POST' })
  if (!res.ok) throw new Error(`La tienda respondió ${res.status}`)
  const json = (await res.json()) as Record<string, Record<string, unknown>>
  return json[`${params.method.replace(/\./g, '_')}_response`] ?? json
}

type Crudo = Record<string, unknown> & { product_small_image_urls?: { string?: string[] } }

async function buscarEnTienda(palabrasClave: string, conFiltroPesca: boolean, pagina: number): Promise<Crudo[]> {
  const r = (await llamarTienda({
    method: 'aliexpress.affiliate.product.query',
    keywords: palabrasClave,
    page_no: String(pagina),
    page_size: '50',
    sort: 'LAST_VOLUME_DESC',
    target_currency: 'EUR',
    target_language: 'ES',
    ship_to_country: 'ES',
    ...(conFiltroPesca ? { category_ids: CATEGORIA_PESCA } : {}),
  })) as { resp_result?: { result?: { products?: { product?: Crudo[] } } } }
  return r.resp_result?.result?.products?.product ?? []
}

function aCandidato(c: Crudo, categoria: string, subcategoria: string): Candidato | null {
  const num = (v: unknown) => parseFloat(String(v ?? '').replace('%', ''))
  const principal = String(c.product_main_image_url ?? '')
  const imagenes = [...new Set([principal, ...(c.product_small_image_urls?.string ?? [])].filter(Boolean))]
  const video = String(c.product_video_url ?? '').trim().replace(/^\/\//, 'https://').replace(/^http:/, 'https:')
  const valoracion = num(c.evaluate_rate)
  const vendidos = Number(c.lastest_volume ?? 0)
  const comision = num(c.commission_rate) || 0
  const precio = num(c.target_sale_price)
  const sku = String(c.product_id ?? '')
  const titulo = String(c.product_title ?? '').trim()
  if (!sku || !titulo || !principal) return null
  return {
    sku,
    categoria,
    subcategoria,
    titulo,
    url: String(c.product_detail_url ?? '').split('?')[0],
    tienda: String(c.shop_name ?? ''),
    imagenes: imagenes.slice(0, 8),
    video,
    precio,
    valoracion,
    vendidos,
    comision,
    puntos: (valoracion - 90) * 1.5 + Math.log10(vendidos + 1) * 6 + comision * 1.2 + (video ? 2 : 0) + Math.min(imagenes.length, 6) * 0.3,
  }
}

/* ---------------------------------------------------------------------- */

async function buscar() {
  const { deducirSubcategoria } = await import('../lib/subcategoria-auto')
  const { SUBCATEGORIES } = await import('../lib/fishing')

  console.log(`Catálogo actual desde ${WEB}/api/products…`)
  const actual = ((await (await fetch(`${WEB}/api/products`)).json()) as { products: { sku: string; title: string; imageUrl: string }[] }).products
  if (!actual?.length) throw new Error('No se pudo leer el catálogo actual: sin él no se pueden descartar duplicados.')
  const skus = new Set(actual.map((p) => p.sku))
  const fotosExactas = new Set(actual.map((p) => urlOriginal(p.imageUrl)))
  console.log(`  ${actual.length} productos. Huellas de sus fotos…`)
  const huellaActual = huellas([...fotosExactas].filter((u) => u.startsWith('http')))
  const fotosActuales = Object.values(huellaActual)
  console.log(`  ${fotosActuales.length} fotos con huella.`)

  const propuestas: Propuesta[] = []
  for (const [categoria, tipos] of Object.entries(BUSQUEDAS)) {
    const vistos = new Set<string>()
    const porTipo: Record<string, Candidato[]> = {}
    for (const [sub, claves] of Object.entries(tipos)) {
      porTipo[sub] = []
      for (const clave of claves) {
        for (const filtro of [true, false]) {
          for (const pagina of [1, 2]) {
            const crudos = await buscarEnTienda(clave, filtro, pagina).catch((e) => {
              console.warn(`  ! ${clave}: ${e instanceof Error ? e.message : e}`)
              return []
            })
            for (const c of crudos) {
              const cand = aCandidato(c, categoria, sub)
              if (!cand || vistos.has(cand.sku) || skus.has(cand.sku)) continue
              vistos.add(cand.sku)
              const t = normalizar(cand.titulo)
              if (FUERA.test(t) || !categoriasDelTitulo(cand.titulo).includes(categoria)) continue
              if (CONTEXTO[categoria] && !CONTEXTO[categoria].test(t)) continue
              if (deducirSubcategoria({ title: cand.titulo, typeFishing: categoria }) !== sub) continue
              if (cand.valoracion < 92 || cand.vendidos < 50 || cand.imagenes.length < 3) continue
              if (cand.precio < 0.5 || cand.precio > 250) continue
              porTipo[sub].push(cand)
            }
          }
          // Con el filtro de «Pesca» suele bastar; sin él solo si faltan.
          if (porTipo[sub].length >= 40) break
        }
      }
      porTipo[sub].sort((a, b) => b.puntos - a.puntos)
    }

    // Reparto: la parte de cada tipo, y lo que sobre para los mejores del resto.
    const objetivo = POR_CATEGORIA + RESERVAS
    const subs = SUBCATEGORIES[categoria as keyof typeof SUBCATEGORIES].map((s) => s.id).filter((s) => porTipo[s]?.length)
    const cupo = Object.fromEntries(subs.map((s, i) => [s, Math.floor(objetivo / subs.length) + (i < objetivo % subs.length ? 1 : 0)]))

    // Huellas solo de los que tienen opciones de entrar.
    const cortos = subs.flatMap((s) => porTipo[s].slice(0, cupo[s] * 3))
    const huellaNueva = huellas(cortos.map((c) => c.imagenes[0]))

    // Cuántas veces sale cada palabra en los candidatos de esta categoría: las
    // que salen poco son marcas y modelos.
    const frecuencia = new Map<string, number>()
    for (const c of subs.flatMap((s) => porTipo[s])) for (const w of palabras(c.titulo)) frecuencia.set(w, (frecuencia.get(w) ?? 0) + 1)

    const elegidos: Candidato[] = []
    const elegidas: string[] = []
    const cabe = (c: Candidato) => {
      if (fotosExactas.has(c.imagenes[0])) return false
      const h = huellaNueva[c.imagenes[0]]
      if (!h) return false
      if (fotosActuales.some((x) => distancia(x, h) <= MISMA_FOTO)) return false
      if (elegidas.some((x) => distancia(x, h) <= MISMA_FOTO)) return false
      if (actual.some((p) => parecidoTitulos(p.title, c.titulo) >= MISMO_TITULO)) return false
      if (elegidos.some((e) => parecidoTitulos(e.titulo, c.titulo) >= MISMO_TITULO)) return false
      // El mismo modelo de otra tienda, o la misma ficha partida en dos (mismas
      // ventas exactas y título parecido).
      const m = modelos(c.titulo)
      if (m.size && elegidos.some((e) => [...modelos(e.titulo)].some((x) => m.has(x)))) return false
      if (elegidos.some((e) => e.vendidos === c.vendidos && c.vendidos >= 100 && parecidoTitulos(e.titulo, c.titulo) >= 0.2)) return false
      // De la misma tienda, dos títulos parecidos suelen ser el mismo producto
      // en dos anuncios (otro tamaño, otro pack).
      if (c.tienda && elegidos.some((e) => e.tienda === c.tienda && parecidoTitulos(e.titulo, c.titulo) >= 0.3)) return false
      // Mismo arranque de título: el mismo anuncio con otro remate.
      const inicio = (t: string) => normalizar(t).replace(/[^a-z0-9]+/g, ' ').slice(0, 50)
      if (elegidos.some((e) => inicio(e.titulo) === inicio(c.titulo))) return false
      // Dos que comparten una palabra rara (casi siempre la marca: «Johncoo»,
      // «MrLurion») y se parecen son el mismo producto o casi.
      const raras = [...palabras(c.titulo)].filter((w) => (frecuencia.get(w) ?? 0) <= 3 && /[a-z]{4,}/.test(w))
      if (elegidos.some((e) => parecidoTitulos(e.titulo, c.titulo) >= 0.35 && raras.some((w) => palabras(e.titulo).has(w)))) return false
      // Variedad: topes por tipo de producto dentro de la categoría.
      for (const [re, tope] of TOPES[c.categoria] ?? []) {
        if (re.test(normalizar(c.titulo)) && elegidos.filter((e) => re.test(normalizar(e.titulo))).length >= tope) return false
      }
      return true
    }
    const elegir = (c: Candidato) => {
      elegidos.push(c)
      elegidas.push(huellaNueva[c.imagenes[0]])
    }
    for (const s of subs) {
      let n = 0
      for (const c of porTipo[s].slice(0, cupo[s] * 3)) {
        if (n >= cupo[s]) break
        if (cabe(c)) {
          elegir(c)
          n++
        }
      }
    }
    for (const c of cortos.filter((x) => !elegidos.includes(x)).sort((a, b) => b.puntos - a.puntos)) {
      if (elegidos.length >= objetivo) break
      if (cabe(c)) elegir(c)
    }

    elegidos.sort((a, b) => b.puntos - a.puntos)
    elegidos.forEach((c, i) => propuestas.push({ ...c, reserva: i >= POR_CATEGORIA, intentos: 0 }))
    const reparto = subs.map((s) => `${s} ${elegidos.filter((e) => e.subcategoria === s).length}`).join(', ')
    console.log(`${categoria}: ${Math.min(elegidos.length, POR_CATEGORIA)} + ${Math.max(0, elegidos.length - POR_CATEGORIA)} de reserva (${reparto})`)
  }

  guardar({ creado: new Date().toISOString(), porCategoria: POR_CATEGORIA, propuestas })
  console.log(`\n${propuestas.length} propuestas en ${SALIDA}. Siguiente paso: redactar.`)
}

/* ---------------------------------------------------------------------- */

async function redactar() {
  const archivo = leer()
  const { polishProductSeo } = await import('../lib/openrouter-ai')
  const { descripcionSeo } = await import('../lib/seo-producto')
  const { generarEnlacesCortos } = await import('../lib/aliexpress')

  // Primero las titulares; las reservas solo si a su categoría le faltan.
  const listas = (cat: string) => archivo.propuestas.filter((p) => p.categoria === cat && p.seo).length
  const pendientes = archivo.propuestas
    .filter((p) => !p.seo && p.intentos < 2)
    .sort((a, b) => Number(a.reserva) - Number(b.reserva))

  const i = process.argv.indexOf('--limite')
  const limite = i > -1 ? Number(process.argv[i + 1]) : Infinity
  let hechas = 0
  for (const p of pendientes) {
    if (hechas >= limite) break
    if (p.reserva && listas(p.categoria) >= archivo.porCategoria) continue
    const r = await polishProductSeo({
      title: p.titulo,
      description: `${p.titulo}. Valoración ${p.valoracion} %, ${p.vendidos} vendidos.`,
      typeFishing: p.categoria,
      imageCount: p.imagenes.length,
      cadena: 'lote',
      soloTitulo: true,
    })
    if (r.unavailable) {
      console.log('\nLa IA no tiene cupo ahora mismo. Lo hecho está guardado; vuelve a lanzar «redactar» más tarde.')
      break
    }
    p.intentos++
    if (r.generatedBy === 'ai') {
      p.seo = limpiarSeo({ title: r.title, seoTitle: r.seoTitle, description: r.description, seoDescription: r.seoDescription, imageAlts: r.imageAlts }, p.categoria, descripcionSeo)
      hechas++
      console.log(`  ✓ ${p.categoria}: ${r.title}`)
    } else {
      console.log(`  ✗ ${p.categoria}: no salió bien a la primera (${p.intentos}/2) · ${p.titulo.slice(0, 60)}`)
    }
    guardar(archivo)
    await new Promise((ok) => setTimeout(ok, 1500))
  }

  // Enlaces de afiliado cortos, como los del portal.
  const sinEnlace = archivo.propuestas.filter((p) => p.seo && !p.enlace)
  for (let i = 0; i < sinEnlace.length; i += 50) {
    const lote = sinEnlace.slice(i, i + 50)
    const mapa = await generarEnlacesCortos(lote.map((p) => p.sku))
    for (const p of lote) if (mapa.get(p.sku)) p.enlace = mapa.get(p.sku)
  }
  guardar(archivo)

  const resumen = Object.keys(BUSQUEDAS).map((c) => `${c} ${archivo.propuestas.filter((p) => p.categoria === c && p.seo && p.enlace).length}`)
  console.log(`\n${hechas} redactadas en esta vuelta. Listas por categoría: ${resumen.join(', ')}`)
}

/**
 * Arreglos mecánicos de lo que escribe la IA, que no merecen otra vuelta:
 * la marca pegada al final («… | PescaPlus»), el enlace a la categoría suelto
 * al final en vez de dentro de una frase, y espacios de más.
 */
/**
 * Marcas de vendedor que la tienda no enseña porque delatan el origen: la misma
 * lista que el prompt del pulido (lib/openrouter-ai.ts) manda quitar. La IA a
 * veces las deja (13 de 210 fichas el 2026-11-11), así que se quitan aquí.
 */
const MARCAS_DE_VENDEDOR = /\s*\b(deukio|sougayilang|zukibo|lixada|noeby|dndyuju|rooblinos|seasir|josby|pro ?beros|hirisi|anatono)\b\s*(?:-\s*)?/gi

function sinMarcasDeVendedor(t: string): string {
  const limpio = t
    .replace(MARCAS_DE_VENDEDOR, ' ')
    .replace(/\s+([,.;:!?)])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

function limpiarSeo(seo: Seo, categoria: string, descripcionSeo: (p: { seoDescription: string; description: string }) => string): Seo {
  const sinMarca = (t: string) => sinMarcasDeVendedor(t.replace(/\s*[|·–-]\s*PescaPlus\s*\.?\s*$/i, ''))
  // «… cada captura. [carretes de pesca](/categories/carretes)» → dentro de una frase.
  let description = seo.description
    .trim()
    .replace(/([.!?])\s*\[([^\]]+)\]\((\/categories\/[a-z-]+)\)\s*\.?$/, '$1 Encuentra más opciones en nuestra sección de [$2]($3).')
  if (!description.includes(`/categories/${categoria}`)) {
    description = `${description} Encuentra más opciones en nuestra sección de [${categoria}](/categories/${categoria}).`
  }
  const sinSeparadorFinal = (t: string) => sinMarca(t).replace(/[\s|·–-]+$/, '')
  return {
    title: sinSeparadorFinal(seo.title),
    seoTitle: sinSeparadorFinal(seo.seoTitle),
    description: sinMarcasDeVendedor(description),
    // Frases enteras: la IA a veces se pasa de 160 y el recorte deja «…en PescaPlus y».
    seoDescription: descripcionSeo({ seoDescription: sinMarca(seo.seoDescription), description }),
    imageAlts: seo.imageAlts.map(sinMarcasDeVendedor).filter(Boolean),
  }
}

/* ---------------------------------------------------------------------- */

function leer(): Archivo {
  if (!existsSync(SALIDA)) throw new Error('No hay propuestas: lanza antes «buscar».')
  return JSON.parse(readFileSync(SALIDA, 'utf8')) as Archivo
}

function guardar(a: Archivo) {
  mkdirSync(join(RAIZ, 'scripts', 'datos'), { recursive: true })
  writeFileSync(SALIDA, `${JSON.stringify(a, null, 1)}\n`)
}

const paso = process.argv[2]
const pasos: Record<string, () => Promise<void>> = { buscar, redactar }
if (!pasos[paso]) {
  console.error('Uso: npx tsx --env-file=.env scripts/ampliar-catalogo.ts buscar|redactar')
  process.exit(1)
}
pasos[paso]().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
