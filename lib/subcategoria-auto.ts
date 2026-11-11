import { normalizar } from '@/lib/seo-producto'

/**
 * El tipo (subcategoría) de un producto que no lo tiene guardado.
 *
 * Medido el 2026-11-11 en la API pública: 335 de los 419 productos no tenían
 * subcategoría. Solo la tenían los 84 del catálogo inicial, que pasaron por
 * scripts/assign-subcategories.mjs; la importación desde el panel nunca la
 * ponía. Así, las páginas de tipo («Cañas de spinning») enseñaban una fracción
 * del catálogo y las fichas no podían enlazar a su tipo.
 *
 * Se deduce al leer, no se escribe en la base de datos: vale igual para lo ya
 * importado y para lo que llegue, y en cuanto alguien elige un tipo a mano en
 * el panel, manda el suyo.
 *
 * Las reglas son las de assign-subcategories.mjs. Se miran primero en el
 * TÍTULO, que dice qué es el producto; la descripción solo se usa si el título
 * no decide, porque la IA la rellena de palabras de otros tipos («con
 * emerillones, grapas y perlas…»).
 */

type Regla = [RegExp, string]

const REGLAS: Record<string, { porDefecto: string; reglas: Regla[] }> = {
  anzuelos: {
    porDefecto: 'simples',
    reglas: [
      [/triple|treble|3\s*puntas|tres puntas/, 'triples'],
      [/magnetic|iman|gancho magn|circular|muelle|cabeza plomada|doble/, 'especiales'],
      [/carpa|hair\s*rig|\bpelo\b|boilie|method|montaje|vastago largo|offset/, 'montaje'],
      [/simple|single|acero al carbono|alto carbono/, 'simples'],
    ],
  },
  lineas: {
    // Casi todas las líneas de la tienda de origen son trenzadas; «hilo» a
    // secas no dice nada, así que no cuenta como monofilamento.
    porDefecto: 'trenzado',
    reglas: [
      [/fluorocarbon|fluoro/, 'fluorocarbono'],
      [/trenzad|braid|multifilament|nanofil|\bpe\b|\bx[48]\b|hebras|strand/, 'trenzado'],
      [/monofil|nylon|nailon/, 'monofilamento'],
    ],
  },
  senuelos: {
    porDefecto: 'duros',
    reglas: [
      [/vinilo|soft\s*bait|silicon|gusano|\bshad\b|grub|ned\s*rig|blando|suave|\bworm\b|anguila|sandeel|tpe|tpr/, 'vinilos'],
      [/popper|superficie|topwater|paseante|walker|\bfrog\b|\brana\b|stickbait flotante/, 'superficie'],
      [/cuchar|spinner\b|\bspoon\b|\bjigs?\b|jighead|cabeza plomada|rotativ|plantilla de metal|metal jig/, 'cucharillas'],
      [/minnow|crank|jerk|wobbler|lapiz|stickbait|pez rigido|pez nadador|hard\s*bait|swimbait/, 'duros'],
    ],
  },
  canas: {
    porDefecto: 'spinning',
    reglas: [
      [/telesc/, 'telescopicas'],
      [/surfcast|surf\b|playa|\bmar\b|boat|barca|jigging|agua salada/, 'mar'],
      [/baitcast|casting/, 'baitcasting'],
      [/spinning|carbono|spin\b/, 'spinning'],
    ],
  },
  carretes: {
    porDefecto: 'spinning',
    reglas: [
      [/baitcast|casting|\bbfs\b|perfil bajo|low\s*profile/, 'baitcasting'],
      [/surfcast|surf\b|\bmar\b|1[0-9]000|\b[89]000\b|\b(1[0-9]|2[0-9])\s*kg|agua profunda|big|currican|trolling/, 'mar'],
      [/spinning|giratori|frontal/, 'spinning'],
    ],
  },
  electronica: {
    porDefecto: 'accesorios',
    reglas: [
      [/sonda|sonar|fish\s*finder|\bgps\b|buscador|ecosonda|localizador de peces/, 'sondas'],
      [/camara|camera|endoscop/, 'camaras'],
    ],
  },
  embarcaciones: {
    porDefecto: 'accesorios',
    reglas: [
      [/float\s*tube|belly\s*boat|pato\b/, 'floattube'],
      [/kayak|\bbote\b|barca|neumatic|patin|zodiac/, 'kayaks'],
    ],
  },
  minuteria: {
    porDefecto: 'emerillones',
    reglas: [
      [/\bkit\b|surtido|assortment|\bset\b|caja de accesorios/, 'kits'],
      [/grapa|\bsnap\b|conector|\bclip\b|broche|imperdible|coastlock/, 'conectores'],
      [/perla|\bgoma\b|\bbead\b|\btubo\b|stopper|tope|silicona|anti[- ]?enred|abalorio/, 'montaje'],
      [/emerill|giratori|swivel|rolling|anilla|rodamiento/, 'emerillones'],
    ],
  },
  plomos: {
    porDefecto: 'fondo',
    reglas: [
      [/oliva|lapiz|\bpear\b|balance|especial|drop\s*shot|corredizo|tungsten/, 'especiales'],
      [/\bjigs?\b|lastre|cabeza plomada|jighead|\bbola\b/, 'jig'],
      [/fondo|surfcast|pyramid|piramid|garra|\bgrip\b|pesa|pesca a fondo/, 'fondo'],
    ],
  },
  herramientas: {
    porDefecto: 'alicates',
    reglas: [
      [/tijera|cortahilos|corta\b|scissor|cutter|corte/, 'corte'],
      [/medi|bascula|balanza|regla|aguja|desanzul|termometro|pesa peces|cinta/, 'otras'],
      [/alicate|plier|pinza|forceps|lip\s*grip/, 'alicates'],
    ],
  },
  equipo: {
    porDefecto: 'almacenaje',
    reglas: [
      [/guante|glove|chaleco|\bropa\b|gorra|\bmanga\b|vestuario|camiseta|sombrero|braga/, 'vestuario'],
      [/caja|bolsa|mochila|estuche|funda|\bbox\b|\bbag\b|organizador|maleta/, 'almacenaje'],
      [/soporte|mango|\bclip\b|telefono|linterna|\bluz\b|cabezal|correa|porta|adaptador|silla|redero|sacadera/, 'accesorios'],
    ],
  },
}

/**
 * El tipo cuya palabra sale ANTES en el texto. En un título en castellano lo
 * que es el producto va primero: «Alicates de pesca con pinzas y tijeras» son
 * alicates, aunque nombre las tijeras. A igualdad, manda el orden de las reglas.
 */
function primera(texto: string, reglas: Regla[]): string | null {
  let mejor: { sub: string; donde: number } | null = null
  for (const [re, sub] of reglas) {
    const donde = texto.search(re)
    if (donde >= 0 && (!mejor || donde < mejor.donde)) mejor = { sub, donde }
  }
  return mejor?.sub ?? null
}

/**
 * Tipos que, si el título los nombra, mandan aunque salgan tarde: «Carrete
 * giratorio 12 kg para agua profunda» es de mar, no de spinning; «Caña de
 * spinning telescópica» va con las telescópicas.
 */
const MANDAN: Record<string, string[]> = { canas: ['telescopicas'], carretes: ['mar', 'baitcasting'], anzuelos: ['triples'], lineas: ['fluorocarbono'] }

/** El tipo que corresponde a un producto según su título (y, si no basta, su descripción). */
export function deducirSubcategoria(p: { title: string; description?: string; typeFishing: string }): string {
  const cfg = REGLAS[p.typeFishing]
  if (!cfg) return ''
  const titulo = normalizar(p.title)
  const fuerte = cfg.reglas.find(([re, sub]) => MANDAN[p.typeFishing]?.includes(sub) && re.test(titulo))
  if (fuerte) return fuerte[1]
  return primera(titulo, cfg.reglas) ?? primera(normalizar(p.description ?? ''), cfg.reglas) ?? cfg.porDefecto
}

/**
 * Completa el tipo de un producto que no lo tiene. Si ya tiene, no lo toca:
 * lo guardado (o elegido en el panel) manda.
 */
export function conSubcategoria<T extends { title: string; description?: string; typeFishing: string; subcategory: string; subcategories: string[] }>(p: T): T {
  if (p.subcategories.length) return p
  const sub = deducirSubcategoria(p)
  return sub ? { ...p, subcategory: sub, subcategories: [sub] } : p
}
