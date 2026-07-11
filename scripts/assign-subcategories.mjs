/**
 * Assign a `subcategory` to every product in lib/catalog-data.ts using
 * keyword heuristics per main category. Prints a review table and writes the
 * file back. Idempotent. Run: `node scripts/assign-subcategories.mjs`
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'catalog-data.ts')

// Ordered [regex, subId]; first match wins. `default` used when nothing matches.
const RULES = {
  anzuelos: {
    default: 'simples',
    rules: [
      [/triple|treble|3\s*puntas|tres puntas/, 'triples'],
      [/magn[eé]tic|im[aá]n|gancho magn/, 'especiales'],
      [/carpa|hair\s*rig|\bpelo\b|boilie|method|montaje/, 'montaje'],
      [/simple|single|acero al carbono|alto carbono/, 'simples'],
    ],
  },
  lineas: {
    default: 'trenzado',
    rules: [
      [/fluorocarbon|fluoro/, 'fluorocarbono'],
      [/trenzad|braid|multifilament|nanofil|\bpe\b|hebras|strand/, 'trenzado'],
      [/monofil|nylon|sedal/, 'monofilamento'],
    ],
  },
  senuelos: {
    default: 'duros',
    rules: [
      [/vinilo|soft\s*bait|silicon|gusano|\bshad\b|grub|ned\s*rig|cebo blando|\bworm\b|lubina/, 'vinilos'],
      [/popper|superficie|topwater|paseante|walker|\bfrog\b|\brana\b/, 'superficie'],
      [/cuchar|spinner\b|\bspoon\b|\bjig\b|jighead|cabeza plomada|rotativ/, 'cucharillas'],
      [/minnow|crank|jerk|wobbler|pez r[ií]gido|pez nadador|hard\s*bait/, 'duros'],
    ],
  },
  canas: {
    default: 'spinning',
    rules: [
      [/telesc/, 'telescopicas'],
      [/surfcast|surf\b|playa|\bmar\b|boat|barca|float tube/, 'mar'],
      [/baitcast|casting/, 'baitcasting'],
      [/spinning|carbono|spin\b/, 'spinning'],
    ],
  },
  carretes: {
    default: 'spinning',
    rules: [
      [/baitcast|casting|\bbfs\b|perfil bajo|low\s*profile/, 'baitcasting'],
      [/surfcast|surf\b|\bmar\b|1[0-9]000|\b[89]000\b|arrastre 1[0-9]\s*kg|25\s*kg|big/, 'mar'],
      [/spinning|giratori|frontal/, 'spinning'],
    ],
  },
  electronica: {
    default: 'accesorios',
    rules: [
      [/sonda|sonar|fish\s*finder|\bgps\b|buscador|profundidad|ecosonda/, 'sondas'],
      [/c[aá]mara|camera|endoscop/, 'camaras'],
    ],
  },
  embarcaciones: {
    default: 'accesorios',
    rules: [
      [/float\s*tube|belly\s*boat|pato\b/, 'floattube'],
      [/kayak|\bbote\b|barca|neum[aá]tic|pat[ií]n|remo|zodiac/, 'kayaks'],
    ],
  },
  minuteria: {
    default: 'emerillones',
    rules: [
      [/\bkit\b|surtido|assortment|piezas|\bset\b/, 'kits'],
      [/grapa|\bsnap\b|conector|\bclip\b|broche|imperdible|link/, 'conectores'],
      [/perla|\bgoma\b|\bbead\b|\btubo\b|stopper|tope|silicona|anti[- ]?enred/, 'montaje'],
      [/emerill|giratori|swivel|rolling|anilla/, 'emerillones'],
    ],
  },
  plomos: {
    default: 'fondo',
    rules: [
      [/oliva|l[aá]piz|\bpear\b|balance|especial/, 'especiales'],
      [/\bjig\b|lastre|cabeza plomada|jighead|\bbola\b/, 'jig'],
      [/fondo|surfcast|pyramid|\bgrip\b|pesa|pesca a fondo/, 'fondo'],
    ],
  },
  herramientas: {
    default: 'alicates',
    rules: [
      [/tijera|cortahilos|corta\b|scissor|cutter|corte/, 'corte'],
      [/medi|b[aá]scula|balanza|regla|aguja|boga|desanzul|term[oó]metro|pesa peces/, 'otras'],
      [/alicate|plier|pinza|forceps|f[oó]rceps/, 'alicates'],
    ],
  },
  equipo: {
    default: 'almacenaje',
    rules: [
      [/guante|glove|chaleco|\bropa\b|gorra|\bmanga\b|vestuario/, 'vestuario'],
      [/caja|bolsa|mochila|estuche|funda|\bbox\b|\bbag\b|organizador|maleta/, 'almacenaje'],
      [/soporte|mango|\bclip\b|tel[eé]fono|linterna|\bluz\b|cabezal|correa|porta|adaptador/, 'accesorios'],
    ],
  },
}

// Manual corrections for products whose MAIN category (not just subcategory) was
// wrong: [titleSubstring, typeFishing, subcategory]. Applied after the heuristic.
const OVERRIDES = [
  ['Bombillas LED', 'equipo', 'accesorios'],
  ['Soporte de Clip para Teléfono', 'equipo', 'accesorios'],
  ['Noeby Beast Float Tube', 'canas', 'spinning'],
  ['Clip de sujeción rápida y organizador', 'equipo', 'accesorios'],
  ['Luminosos Abalorios', 'minuteria', 'montaje'],
  ['DNDYUJU 100X Conectores Giratorios', 'minuteria', 'emerillones'],
  ['cubierta de transductor', 'electronica', 'accesorios'],
  ['Alicates de Pescade Multifunción', 'herramientas', 'alicates'],
  ['Aplicadores de pesca de dientes', 'herramientas', 'otras'],
  ['Anzuelos de Pesca Corrosión Resistente', 'anzuelos', 'simples'],
  ['Anzuelos de pesca 100 unidades', 'anzuelos', 'simples'],
  // Corrections for the category-reinforcement import (mislabelled by search):
  ['Swimbait Multiarticular', 'senuelos', 'duros'],
  ['Cuchara Giratoria Triple Anzuelo', 'senuelos', 'cucharillas'],
  ['Soporte de caña de pesca para embarcaciones', 'equipo', 'accesorios'],
  ['Soporte Inflable para', 'equipo', 'accesorios'],
]

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function assign(p) {
  const cfg = RULES[p.typeFishing]
  if (!cfg) return ''
  const hay = norm(`${p.title} ${p.description}`)
  for (const [re, sub] of cfg.rules) if (re.test(hay)) return sub
  return cfg.default
}

const src = readFileSync(OUT, 'utf8')
const start = src.indexOf('[', src.indexOf('= [', src.indexOf('CATALOG_SEED')))
const end = src.lastIndexOf(']')
const prefix = src.slice(0, start)
const suffix = src.slice(end + 1)
const arr = JSON.parse(src.slice(start, end + 1))

for (const p of arr) {
  p.subcategory = assign(p)
  const ov = OVERRIDES.find(([needle]) => p.title.includes(needle))
  if (ov) { p.typeFishing = ov[1]; p.subcategory = ov[2] }
}

const dist = {}
for (const p of arr) {
  ;(dist[p.typeFishing] ??= {})[p.subcategory] = (dist[p.typeFishing][p.subcategory] ?? 0) + 1
}

// Reorder keys so subcategory sits right after typeFishing for readability.
const reordered = arr.map((p) => {
  const clean = {}
  for (const k of Object.keys(p)) {
    if (k === 'subcategory') continue
    clean[k] = p[k]
    if (k === 'typeFishing') clean.subcategory = p.subcategory
  }
  return clean
})

writeFileSync(OUT, prefix + JSON.stringify(reordered, null, 2) + suffix)

console.log('=== Distribución categoría → subcategoría ===')
for (const [cat, subs] of Object.entries(dist).sort()) {
  console.log(`\n${cat}:`)
  for (const [sub, n] of Object.entries(subs).sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(2)} ${sub}`)
}
console.log('\n=== Asignación por producto ===')
for (const p of reordered) console.log(`[${p.typeFishing}/${p.subcategory}] ${p.title.slice(0, 62)}`)
console.log(`\n✅ ${reordered.length} productos con subcategoría asignada.`)
