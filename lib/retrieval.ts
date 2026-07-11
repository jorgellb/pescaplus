import type { Product } from '@/types'
import { listProducts } from '@/lib/products-store'
import { isFishingTypeId } from '@/lib/fishing'
import { proxyProductImages } from '@/lib/img-proxy'

/**
 * Lightweight retrieval for the chat assistant (RAG-lite). Scores catalog
 * products against the user's message by keyword overlap, boosted by the
 * selected modality and popularity, so the assistant can recommend real products.
 */

const STOPWORDS = new Set([
  'que', 'qué', 'cual', 'cuál', 'como', 'cómo', 'para', 'por', 'con', 'una', 'uno', 'unos', 'unas',
  'los', 'las', 'del', 'este', 'esta', 'esto', 'mejor', 'mejores', 'necesito', 'quiero', 'puedo',
  'recomiendas', 'recomienda', 'recomendar', 'equipo', 'material', 'pesca', 'pescar', 'pescador',
  'empezar', 'iniciar', 'basico', 'básico', 'algun', 'algún', 'alguna', 'tengo', 'sobre', 'dame',
  'hola', 'gracias', 'buenas', 'consejo', 'consejos', 'ayuda', 'donde', 'dónde', 'muy', 'más', 'mas',
])

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export async function retrieveProducts(
  query: string,
  typeFishing?: string,
  limit = 5,
): Promise<Product[]> {
  const products = await listProducts()
  if (products.length === 0) return []

  const terms = normalize(query)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))

  const scoped = typeFishing && isFishingTypeId(typeFishing) ? typeFishing : undefined

  const scored = products.map((p) => {
    const haystack = normalize(`${p.title} ${p.description}`)
    let score = terms.reduce((s, t) => s + (haystack.includes(t) ? 1 : 0), 0)
    if (scoped && p.typeFishing === scoped) score += 1.5
    score += Math.min(p.reviews, 3000) / 30000 // small popularity tiebreak
    return { p, score }
  })

  let top = scored
    .filter((x) => x.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p)

  // Fallback: if nothing matched but a modality is known, use its most popular items.
  if (top.length === 0 && scoped) {
    top = products
      .filter((p) => p.typeFishing === scoped)
      .sort((a, b) => b.reviews - a.reviews)
      .slice(0, limit)
  }

  return top.map(proxyProductImages)
}
