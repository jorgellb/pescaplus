import type { Product } from '@/types'
import { FISHING_TYPES, getFishingType, type FishingType } from '@/lib/fishing'
import { getTrendingProducts, getTrendingRanked } from '@/lib/trending'

/**
 * Programmatic-SEO "best of" roundups, one per catalog category. Each page targets
 * a high-intent buying query ("los mejores carretes de pesca"), ranks real
 * products by trending score, and ships ItemList + FAQ + Breadcrumb structured
 * data. Copy is templated (not live-AI) so the pages build fast and stay stable.
 */

export const ROUNDUP_YEAR = 2026

export interface RoundupItem {
  product: Product
  rank: number
  why: string
}

export interface RoundupFaq {
  q: string
  a: string
}

export interface Roundup {
  slug: string
  type: FishingType
  title: string
  h1: string
  metaDescription: string
  intro: string
  items: RoundupItem[]
  howToChoose: string[]
  faq: RoundupFaq[]
  priceFrom: number | null
}

/** Grammatically correct superlative phrase + short noun per category. */
const PHRASES: Record<string, { phrase: string; short: string }> = {
  anzuelos: { phrase: 'Los mejores anzuelos de pesca', short: 'anzuelos' },
  lineas: { phrase: 'Las mejores líneas de pesca', short: 'líneas de pesca' },
  senuelos: { phrase: 'Los mejores señuelos de pesca', short: 'señuelos' },
  canas: { phrase: 'Las mejores cañas de pesca', short: 'cañas de pesca' },
  carretes: { phrase: 'Los mejores carretes de pesca', short: 'carretes' },
  electronica: { phrase: 'La mejor electrónica de pesca', short: 'sondas y electrónica' },
  embarcaciones: { phrase: 'Las mejores embarcaciones y flotadores de pesca', short: 'embarcaciones y float tubes' },
  minuteria: { phrase: 'La mejor minutería de pesca', short: 'minutería' },
  plomos: { phrase: 'Los mejores plomos de pesca', short: 'plomos' },
  herramientas: { phrase: 'Las mejores herramientas de pesca', short: 'herramientas' },
  equipo: { phrase: 'El mejor equipo de pesca', short: 'equipo de pesca' },
}

const BUYING_TIPS: Record<string, string[]> = {
  canas: [
    '**Longitud**: 1,80–2,10 m para precisión desde barca o ríos pequeños; 2,70–4,50 m para lanzar lejos desde orilla o playa.',
    '**Material y acción**: el carbono da ligereza y sensibilidad; elige acción rápida para señuelos y clavadas firmes, parabólica para absorber embestidas.',
    '**Peso de lance (g)**: respeta el rango indicado en la caña para no forzarla ni perder distancia.',
  ],
  carretes: [
    '**Tamaño de bobina**: 1000–2500 para pesca fina y trucha; 3000–4000 polivalente; 6000–10000 para surfcasting y peces grandes.',
    '**Ratio de recogida**: alto (6.2:1+) para recoger rápido señuelos; bajo para más fuerza y control.',
    '**Freno y rodamientos**: un freno progresivo y varios rodamientos de calidad marcan la diferencia frente a un pez fuerte.',
  ],
  senuelos: [
    '**Duros vs. blandos**: minnows y crankbaits para batir agua; vinilos para pescar cerca del fondo y entre estructura.',
    '**Color según el agua**: naturales en agua clara; llamativos o chartreuse en agua turbia o poca luz.',
    '**Tamaño y profundidad**: adapta el tamaño a la especie y usa el babero/plomado para alcanzar la profundidad donde está el pez.',
  ],
  lineas: [
    '**Trenzado (PE)**: máxima sensibilidad y sin elasticidad, ideal para spinning y detectar picadas sutiles.',
    '**Fluorocarbono**: casi invisible bajo el agua, perfecto como bajo de línea.',
    '**Diámetro**: hilo más fino = más distancia y naturalidad, pero menos margen ante peces grandes o estructura.',
  ],
  anzuelos: [
    '**Número/tamaño**: adapta el anzuelo al tamaño del cebo y de la boca de la especie.',
    '**Tipo**: simples para cebo natural, triples para señuelos, y modelos sin muerte para captura y suelta.',
    '**Acero de alto carbono**: mantiene el filo y resiste la corrosión, sobre todo en agua salada.',
  ],
}

function defaultTips(short: string): string[] {
  return [
    `**Calidad-precio**: prioriza ${short} bien valorados por compradores reales antes que el más barato sin reseñas.`,
    '**Compatibilidad**: comprueba que encaja con el resto de tu equipo (medidas, resistencia y montaje).',
    '**Uso previsto**: elige según la especie, el tipo de agua y la frecuencia con la que vas a pescar.',
  ]
}

function firstSentence(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  const cut = clean.slice(0, max)
  const dot = cut.lastIndexOf('. ')
  return (dot > 40 ? cut.slice(0, dot + 1) : cut).trim()
}

function buildWhy(p: Product): string {
  const sentence = firstSentence(p.seoDescription || p.description)
  const social =
    p.reviews > 0 ? `Valorado con ${p.rating.toFixed(1)}★ por ${p.reviews.toLocaleString('es-ES')} compradores.` : ''
  return [sentence, social].filter(Boolean).join(' ') || `${p.rating.toFixed(1)}★ · buena relación calidad-precio.`
}

function buildFaq(short: string, priceFrom: number | null): RoundupFaq[] {
  const price = priceFrom ? `${priceFrom.toFixed(2)} €` : 'unos pocos euros'
  return [
    {
      q: `¿Cuánto cuestan unos buenos ${short}?`,
      a: `Encontrarás ${short} de calidad desde ${price}. Para empezar no necesitas lo más caro: busca un modelo bien valorado que se ajuste a tu tipo de pesca y a tu presupuesto.`,
    },
    {
      q: `¿Es fiable comprar ${short} en PescaPlus?`,
      a: `Sí. Seleccionamos productos con muchas valoraciones positivas y filtramos por ventas y reseñas reales, así compras de forma segura y a buen precio.`,
    },
    {
      q: `¿Cómo elijo ${short} si soy principiante?`,
      a: `Empieza por un modelo versátil y de gama media: cubre casi cualquier situación mientras aprendes. Si tienes dudas, nuestro asesor te recomienda el más adecuado según lo que vayas a pescar.`,
    },
  ]
}

export interface RoundupPreview {
  slug: string
  name: string
  tagline: string
  icon: string
  cover: string
  count: number
  priceFrom: number | null
}

/**
 * Lightweight previews for the /mejores hub in a SINGLE catalog pass: rank the
 * whole catalog once by trending, group by category, and keep image-bearing
 * items. Avoids fetching each category separately.
 */
export async function getRoundupPreviews(): Promise<RoundupPreview[]> {
  const ranked = await getTrendingRanked()
  const byType = new Map<string, Product[]>()
  for (const p of ranked) {
    if (!p.imageUrl) continue
    const arr = byType.get(String(p.typeFishing)) ?? []
    arr.push(p)
    byType.set(String(p.typeFishing), arr)
  }

  const previews: RoundupPreview[] = []
  for (const type of FISHING_TYPES) {
    const list = byType.get(type.id) ?? []
    if (list.length === 0) continue
    const prices = list.map((p) => p.price).filter((n) => n > 0)
    previews.push({
      slug: type.id,
      name: type.name,
      tagline: type.tagline,
      icon: type.icon,
      cover: list[0].imageUrl,
      count: list.length,
      priceFrom: prices.length ? Math.min(...prices) : null,
    })
  }
  return previews
}

/** Slugs that have at least one product to feature. */
export async function roundupSlugs(): Promise<string[]> {
  return (await getRoundupPreviews()).map((p) => p.slug)
}

export async function getRoundup(slug: string): Promise<Roundup | null> {
  const type = getFishingType(slug)
  if (!type) return null

  const products = await getTrendingProducts(8, slug)
  if (products.length === 0) return null

  const { phrase, short } = PHRASES[slug] ?? { phrase: `Los mejores ${type.name}`, short: type.name.toLowerCase() }
  const items: RoundupItem[] = products.map((product, i) => ({ product, rank: i + 1, why: buildWhy(product) }))
  const priceFrom = Math.min(...products.map((p) => p.price).filter((n) => n > 0))
  const priceFromSafe = Number.isFinite(priceFrom) ? priceFrom : null

  const h1 = `${phrase} de ${ROUNDUP_YEAR}`
  const intro =
    `Hemos analizado el catálogo y seleccionado ${short} destacados por sus ventas y valoraciones reales. ` +
    `${type.tagline} A continuación tienes nuestra selección ordenada, una guía rápida para elegir bien y las dudas más frecuentes.`

  return {
    slug,
    type,
    title: `${h1} — Guía y comparativa | PescaPlus`,
    h1,
    metaDescription:
      `${phrase} de ${ROUNDUP_YEAR}: comparativa con ${items.length} modelos seleccionados por valoraciones reales${
        priceFromSafe ? `, desde ${priceFromSafe.toFixed(2)} €` : ''
      }. Guía de compra y preguntas frecuentes.`.slice(0, 160),
    intro,
    items,
    howToChoose: BUYING_TIPS[slug] ?? defaultTips(short),
    faq: buildFaq(short, priceFromSafe),
    priceFrom: priceFromSafe,
  }
}
