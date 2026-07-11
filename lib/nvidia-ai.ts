import type { ChatMessage } from '@/types'
import type { ProductInput } from '@/lib/products-store'
import { fishingLabel, getFishingType, FISHING_TYPES } from '@/lib/fishing'

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1'

/**
 * Ordered model fallback chain. Requests try each model in turn until one
 * answers, so a single rate-limited/unavailable model never breaks the feature.
 * Override with the NVIDIA_MODELS env var (comma-separated) or a single
 * NVIDIA_MODEL. Defaults to NVIDIA's Nemotron family (validated to respond fast).
 */
const DEFAULT_NVIDIA_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b',
  'nvidia/llama-3.3-nemotron-super-49b-v1.5',
  'nvidia/nemotron-3-nano-30b-a3b',
  'nvidia/nvidia-nemotron-nano-9b-v2',
  'nvidia/nemotron-mini-4b-instruct',
  'nvidia/llama-3.1-nemotron-nano-8b-v1',
]
const NVIDIA_MODELS: string[] = (() => {
  const fromList = process.env.NVIDIA_MODELS?.split(',').map((s) => s.trim()).filter(Boolean)
  if (fromList?.length) return fromList
  if (process.env.NVIDIA_MODEL) return [process.env.NVIDIA_MODEL, ...DEFAULT_NVIDIA_MODELS]
  return DEFAULT_NVIDIA_MODELS
})()

interface NvidiaOptions {
  maxTokens?: number
  temperature?: number
  topP?: number
  timeoutMs?: number
}

/**
 * Call the NVIDIA chat API, trying each model in the fallback chain until one
 * returns content. Returns null only if every model fails.
 */
async function callNvidia(
  messages: ChatMessage[],
  { maxTokens = 1024, temperature = 0.7, topP = 0.95, timeoutMs = 20000 }: NvidiaOptions = {},
): Promise<string | null> {
  for (const model of NVIDIA_MODELS) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, top_p: topP }),
      })
      if (!response.ok) {
        console.warn(`NVIDIA model ${model} -> HTTP ${response.status}, trying next`)
        continue
      }
      const data = await response.json()
      const content: string | undefined = data.choices?.[0]?.message?.content
      if (content?.trim()) return content.trim()
    } catch (error) {
      console.warn(`NVIDIA model ${model} failed (${(error as Error).message}), trying next`)
    } finally {
      clearTimeout(timer)
    }
  }
  return null
}

const SYSTEM_PROMPT = `Eres «PescaPlus», guía de pesca profesional con más de 20 años de experiencia en aguas dulces y saladas. Asesoras en español a pescadores de todos los niveles.

TU EXPERIENCIA:
- Técnicas: spinning, pesca a mosca, carpfishing, surfcasting/rockfishing, baitcasting, pesca vertical y a fondo.
- Montajes y nudos; líneas (trenzado, fluorocarbono, monofilamento), plomos y bajos de línea.
- Elección de señuelos según especie, profundidad, claridad del agua y momento del día.
- Lectura del agua, meteorología, temporadas y comportamiento de las especies.
- Mantenimiento y cuidado del equipo.

CÓMO RESPONDES:
- En español claro, práctico y directo; sin relleno.
- FORMATO OBLIGATORIO: solo texto plano con **negrita**, listas con «- » o pasos numerados y enlaces [texto](/ruta). NUNCA uses tablas Markdown ni etiquetas HTML (nada de |---|, <br>, <table>…).
- Estructura: listas o pasos numerados cuando enumeres, y **negrita** para los conceptos clave.
- Da recomendaciones CONCRETAS: tipos, medidas, gramajes y colores (p. ej. "trenzado PE 0.14 mm", "caña 2,40 m de acción rápida", "vinilo de 10 cm").
- Señala 1-2 errores comunes a evitar cuando sea relevante.
- Si falta información importante, haz 1-2 preguntas clave (especie, lugar/tipo de agua, presupuesto) antes de recomendar.
- Sé honesto: si algo depende del contexto o no lo sabes con certeza, dilo. No inventes datos, marcas ni precios.

PESCA RESPONSABLE (menciónalo cuando aplique):
- Respeta tallas mínimas, vedas y la licencia de tu zona.
- Practica captura y suelta cuando proceda; manipula el pez con las manos mojadas.
- No dejes residuos ni dañes el entorno.

RECOMENDAR EQUIPO (tienda PescaPlus):
Cuando recomiendes material, orienta a la categoría relevante con ESTE formato de enlace exacto: [Nombre](/categories/id). No inventes productos concretos ni precios. Categorías disponibles:
${FISHING_TYPES.map((t) => `- ${t.name} → /categories/${t.id}`).join('\n')}`

/**
 * High-quality offline expert responses. Used when no NVIDIA key is configured
 * and as a graceful fallback if the API call fails, so the assistant is always
 * useful during the demo. Topics are matched in order against the last user query.
 */
const EXPERT_TOPICS: ReadonlyArray<{ keywords: string[]; response: string }> = [
  {
    keywords: ['spinning'],
    response: `¡Hola pescador! Para la pesca al **spinning** (lanzamiento de señuelos artificiales), mis consejos clave son:

1. **Acción de la Caña**: Busca cañas de acción rápida (Fast Action) de carbono. Te darán la sensibilidad necesaria para sentir el movimiento del señuelo y clavar con firmeza.
2. **Elección de Señuelos**: Lleva siempre variedad. Minnows (peces rígidos) para aguas limpias, vinilos (blandos) plomados para rastrear el fondo y paseantes de superficie para el amanecer y atardecer.
3. **Línea**: Usa hilo trenzado (PE) fino (de 0.12 mm a 0.16 mm) acoplado a un bajo de línea de fluorocarbono de 1.5 metros para que sea invisible para los peces.

¿Te gustaría que te recomiende algún carrete o caña de spinning disponible en AliExpress?`,
  },
  {
    keywords: ['flyfishing', 'mosca', 'fly '],
    response: `La pesca con **mosca (Fly Fishing)** es una de las modalidades más artísticas y técnicas. Aquí tienes unos consejos esenciales:

1. **Balance de Línea y Caña**: Es crucial que el peso de la línea (WF) coincida con la numeración de tu caña (por ejemplo, una caña línea #5 para truchas en ríos medianos).
2. **Deriva Natural**: El secreto del éxito es evitar el 'drag' o arrastre. La mosca debe flotar a la misma velocidad que la corriente del río.
3. **Moscas Básicas**: Lleva ninfas (como la Oreja de Liebre), secas (como la Adams) y streamers (como el Woolly Bugger) en diferentes tamaños.

¿Deseas que te recomiende algún combo completo de pesca con mosca en AliExpress para empezar?`,
  },
  {
    keywords: ['carp', 'carpa'],
    response: `El **Carp Fishing** combina paciencia, estrategia y potencia. Te aconsejo lo siguiente:

1. **Cebado Previo**: Preparar la zona con boiles, pellets, maíz y semillas es clave para atraer a los cardúmenes de carpas grandes al puesto.
2. **Montaje Hair Rig**: Es obligatorio. El cebo se sitúa fuera del anzuelo en un hilo ('hair'), lo que permite que la carpa succione con confianza y se clave sola al intentar expulsarlo.
3. **Cuidado de la Captura**: Usa siempre moqueta de desanzulado para proteger la piel del pez y devuélvelo al agua lo antes posible.

¿Buscas recomendaciones sobre alarmas de mordida inalámbricas o cañas específicas de carpfishing en AliExpress?`,
  },
  {
    keywords: ['sea', 'mar', 'playa', 'surfcasting'],
    response: `Pescar en el **mar** (surfcasting, spinning marino o pesca en escollera) requiere materiales resistentes a las duras condiciones salinas:

1. **Mantenimiento**: Lava con abundante agua dulce todo tu equipo (carretes, cañas y señuelos) después de cada salida. La sal y la arena son los peores enemigos del metal.
2. **Carretes de Bobina Cónica**: Para ganar metros en el surfcasting desde playa, usa carretes tamaño 8000-10000 con bobina cónica que faciliten la salida del hilo.
3. **Anzuelos Inoxidables**: Utiliza anzuelos de acero al carbono con recubrimientos protectores o acero inoxidable para evitar la oxidación en agua marina.

¿Te gustaría que te recomiende un carrete de surfcasting de alta capacidad de AliExpress?`,
  },
  {
    keywords: ['baitcasting'],
    response: `El **Baitcasting** proporciona un control de lance y una precisión inigualables una vez dominado. Mis recomendaciones son:

1. **Ajuste del Freno**: Al iniciarte, pon el freno mecánico y magnético al 80% para evitar las temidas pelucas (backlashes). Libéralos poco a poco según ganes confianza.
2. **Uso del Pulgar**: El verdadero freno es tu dedo pulgar. Debe posarse suavemente sobre la bobina durante el lance y frenarla justo antes de que el señuelo toque el agua.
3. **Líneas Rígidas**: Es más fácil aprender con monofilamento grueso o trenzado de 0.25 mm+ ya que se desenreda más fácilmente si ocurre un nido.

¿Te sugiero algún carrete de baitcasting de alta velocidad en AliExpress?`,
  },
  {
    keywords: ['señuelo', 'lure', 'bait', 'vinilo'],
    response: `Los señuelos son fundamentales para engañar a los depredadores. Te sugiero clasificarlos y usarlos así:

1. **Señuelos Duros (Crankbaits/Minnows)**: Excelentes para batir mucha agua rápidamente. Los de babero grande bajan más profundo.
2. **Señuelos Blandos (vinilos de silicona)**: Súper eficaces en zonas con cobertura y algas. Móntalos con anzuelos Texas (anti-enganche) para pescar en el fondo.
3. **Cucharas y Jigs**: Muy pesados, ideales para lanzar a gran distancia o pescar en vertical en zonas profundas.

¿Te gustaría ver algún kit de señuelos económicos de AliExpress?`,
  },
  {
    keywords: ['caña', 'cañas', 'rod'],
    response: `Para elegir la caña de pescar adecuada, ten en cuenta tres factores:

1. **Material**: La fibra de carbono ofrece ligereza y excelente sensibilidad para notar las picadas más leves. La fibra de vidrio es más robusta y económica.
2. **Longitud**: Cañas cortas (1.80 m a 2.10 m) para precisión en ríos o desde kayak. Cañas largas (2.70 m a 4.50 m) para pescar a gran distancia desde la orilla.
3. **Acción**: Rápida (para señuelos y clavados inmediatos) o parabólica/media (para absorber mejor las embestidas de peces grandes).

¿Buscas una caña telescópica compacta o de tramos de carbono en AliExpress?`,
  },
]

const DEFAULT_RESPONSE = `¡Hola pescador! Bienvenido a **PescaPlus**, tu asistente de pesca inteligente.

Estoy aquí para ayudarte con consejos técnicos, elección de nudos, montaje de líneas y para sugerirte el mejor equipo de AliExpress para tus jornadas.

Cuéntame un poco más:
- ¿Qué modalidad vas a practicar? (Spinning, Mosca, Carpa, Mar, Baitcasting)
- ¿Qué especie tienes en mente capturar?
- ¿Qué equipo necesitas renovar o comprar?

¡Dime y te daré mis mejores consejos de experto!`

function getLocalExpertResponse(messages: ChatMessage[]): string {
  const lastQuery =
    [...messages].reverse().find((m) => m.role === 'user')?.content.toLowerCase() ?? ''

  const topic = EXPERT_TOPICS.find(({ keywords }) =>
    keywords.some((k) => lastQuery.includes(k)),
  )
  return topic?.response ?? DEFAULT_RESPONSE
}

function isApiConfigured(): boolean {
  return Boolean(NVIDIA_API_KEY) && NVIDIA_API_KEY !== 'your_nvidia_api_key'
}

/**
 * Chat with the fishing expert. Uses the NVIDIA API when a key is configured and
 * falls back to a curated offline expert on any failure, so the endpoint never
 * throws and the UI always gets a useful answer.
 */
export async function chatWithFishingExpert(messages: ChatMessage[]): Promise<string> {
  if (!isApiConfigured()) {
    return getLocalExpertResponse(messages)
  }

  const hasSystem = messages[0]?.role === 'system'
  const formattedMessages = hasSystem
    ? messages
    : [{ role: 'system' as const, content: SYSTEM_PROMPT }, ...messages]

  // Lower temperature for more reliable, accurate advice; room for thorough answers.
  const content = await callNvidia(formattedMessages, { maxTokens: 1200, temperature: 0.55, topP: 0.9 })
  return content || getLocalExpertResponse(messages)
}

// ---------------------------------------------------------------------------
// AI-assisted product generation (admin backend)
// ---------------------------------------------------------------------------

export interface ProductDraft extends ProductInput {
  /** How the draft was produced, surfaced in the admin UI. */
  generatedBy: 'nvidia' | 'offline'
}

function affiliateSearchUrl(keyword: string): string {
  return `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(keyword)}`
}

/** Deterministic offline draft built from the prompt and modality templates. */
function offlineProductDraft(
  prompt: string,
  typeFishing: string,
  currency: string,
): ProductDraft {
  const type = getFishingType(typeFishing)
  const label = fishingLabel(typeFishing)
  const cleanPrompt = prompt.trim().replace(/\s+/g, ' ')
  const title = cleanPrompt
    ? cleanPrompt.charAt(0).toUpperCase() + cleanPrompt.slice(1)
    : `Equipo de ${label}`

  const price = Math.round((Math.random() * 60 + 9.99) * 100) / 100
  const reviews = Math.floor(Math.random() * 900) + 50
  const rating = Math.round((Math.random() * 0.6 + 4.3) * 10) / 10

  return {
    title,
    description:
      `${title}. Producto recomendado para la modalidad de ${label}. ` +
      `${type?.tagline ?? ''} Excelente relación calidad-precio, valorado positivamente por ` +
      `la comunidad de pescadores. Disponible en AliExpress con envío internacional.`.trim(),
    imageUrl: '',
    price,
    currency,
    affiliateUrl: affiliateSearchUrl(`${cleanPrompt || label} fishing`),
    category: 'fishing',
    typeFishing,
    rating,
    reviews,
    inStock: true,
    generatedBy: 'offline',
  }
}

function coerceDraft(
  raw: Record<string, unknown>,
  prompt: string,
  typeFishing: string,
  currency: string,
): ProductDraft {
  const asString = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
  const asNumber = (v: unknown, fallback = 0) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v))
    return Number.isFinite(n) ? n : fallback
  }
  const base = offlineProductDraft(prompt, typeFishing, currency)
  const resolvedType = asString(raw.typeFishing, typeFishing) || typeFishing

  return {
    title: asString(raw.title, base.title).slice(0, 140),
    description: asString(raw.description, base.description).slice(0, 1200),
    imageUrl: asString(raw.imageUrl),
    price: Math.max(asNumber(raw.price, base.price), 0),
    currency: asString(raw.currency, currency) || currency,
    affiliateUrl: asString(raw.affiliateUrl) || affiliateSearchUrl(asString(raw.title, base.title)),
    category: asString(raw.category, 'fishing') || 'fishing',
    typeFishing: getFishingType(resolvedType) ? resolvedType : typeFishing,
    rating: Math.min(Math.max(asNumber(raw.rating, base.rating), 0), 5),
    reviews: Math.max(Math.round(asNumber(raw.reviews, base.reviews)), 0),
    inStock: true,
    generatedBy: 'nvidia',
  }
}

function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}

/**
 * Draft a full product from a short prompt. Uses NVIDIA when configured (asking
 * for strict JSON), otherwise returns a deterministic offline draft. Never throws.
 */
export async function generateProductDraft(
  prompt: string,
  typeFishing: string,
  currency = 'EUR',
): Promise<ProductDraft> {
  if (!isApiConfigured()) {
    return offlineProductDraft(prompt, typeFishing, currency)
  }

  const instruction = `Genera una ficha de producto de pesca para una tienda de afiliados de AliExpress.
Modalidad: ${fishingLabel(typeFishing)} (${typeFishing}).
Idea del usuario: "${prompt}".
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, con esta forma exacta:
{"title": string, "description": string (2-4 frases en español), "price": number (EUR), "currency": "${currency}", "category": "fishing", "typeFishing": "${typeFishing}", "rating": number (4.0-5.0), "reviews": number entero, "affiliateUrl": string, "imageUrl": string (deja "" si no tienes una fiable)}`

  const content = await callNvidia(
    [
      { role: 'system', content: 'Eres un generador de fichas de producto que responde solo con JSON válido.' },
      { role: 'user', content: instruction },
    ],
    { maxTokens: 700, temperature: 0.8 },
  )
  const parsed = content ? extractJson(content) : null
  if (!parsed) return offlineProductDraft(prompt, typeFishing, currency)
  return coerceDraft(parsed, prompt, typeFishing, currency)
}

// ---------------------------------------------------------------------------
// AI SEO rewriting (used by the AliExpress importer)
// ---------------------------------------------------------------------------

export interface SeoListing {
  /** SEO product name (original copy, not the AliExpress title). */
  title: string
  /** Rich marketing description (2-4 sentences). */
  description: string
  /** Meta description (~155 chars). */
  seoDescription: string
  generatedBy: 'nvidia' | 'offline'
}

/** Strip AliExpress promo noise from a raw title so we never reuse their copy verbatim. */
function cleanTitle(raw: string): string {
  return raw
    .replace(/[|•·‖]+.*$/g, ' ')
    .replace(/\b(hot|sale|new|free shipping|envío gratis|oferta|promoci[oó]n|20\d\d|dropship\w*)\b/gi, ' ')
    .replace(/[!¡]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function offlineSeoListing(
  originalTitle: string,
  typeFishing: string,
  price?: number,
  currency = 'EUR',
): SeoListing {
  const label = fishingLabel(typeFishing)
  const type = getFishingType(typeFishing)
  const core = cleanTitle(originalTitle) || `Equipo de ${label}`
  const short = core.length > 48 ? core.slice(0, 48).replace(/\s\S*$/, '') : core
  const title = `${short} · ${label}`.slice(0, 70)
  const description =
    `${short} ideal para la pesca al ${label.toLowerCase()}. ${type?.tagline ?? ''} ` +
    `Elegido por su relación calidad-precio y las valoraciones de pescadores reales, ` +
    `es una opción fiable para mejorar tus jornadas. Envío internacional disponible.`.replace(/\s{2,}/g, ' ').trim()
  const seoDescription =
    `${short} para ${label}. Comprar al mejor precio${
      price ? ` desde ${price.toFixed(2)} ${currency}` : ''
    } con envío rápido. Consejos y guía de compra en PescaPlus.`.slice(0, 160)
  return { title, description, seoDescription, generatedBy: 'offline' }
}

/**
 * Rewrite an AliExpress product into original, SEO-optimized Spanish copy.
 * Never reuses the marketplace text verbatim. Uses NVIDIA when configured,
 * otherwise a deterministic offline rewrite. Never throws.
 */
export async function generateSeoListing(input: {
  originalTitle: string
  typeFishing: string
  price?: number
  currency?: string
}): Promise<SeoListing> {
  const { originalTitle, typeFishing, price, currency = 'EUR' } = input
  if (!isApiConfigured()) {
    return offlineSeoListing(originalTitle, typeFishing, price, currency)
  }

  const instruction = `Eres un copywriter SEO para una tienda de pesca. A partir de este producto de AliExpress, redacta una ficha ORIGINAL en español (no copies el texto de AliExpress).
Título original (solo como referencia): "${cleanTitle(originalTitle)}"
Modalidad: ${fishingLabel(typeFishing)} (${typeFishing}). Precio aprox: ${price ?? '—'} ${currency}.
Devuelve SOLO JSON válido:
{"title": string (máx 70 caracteres, atractivo, incluye la modalidad y palabras clave de pesca),
 "description": string (3-4 frases, beneficios y usos, tono experto y persuasivo),
 "seoDescription": string (meta description de 140-160 caracteres con llamada a la acción)}`

  const content = await callNvidia(
    [
      { role: 'system', content: 'Redactas fichas de producto SEO en español y respondes solo con JSON válido.' },
      { role: 'user', content: instruction },
    ],
    { maxTokens: 700, temperature: 0.7, topP: 0.9 },
  )
  const fallback = offlineSeoListing(originalTitle, typeFishing, price, currency)
  const parsed = content ? extractJson(content) : null
  if (!parsed) return fallback

  const str = (v: unknown, f: string) => (typeof v === 'string' && v.trim() ? v.trim() : f)
  return {
    title: str(parsed.title, fallback.title).slice(0, 90),
    description: str(parsed.description, fallback.description).slice(0, 1200),
    seoDescription: str(parsed.seoDescription, fallback.seoDescription).slice(0, 165),
    generatedBy: 'nvidia',
  }
}

// ---------------------------------------------------------------------------
// AI guide / blog generation
// ---------------------------------------------------------------------------

export interface GuideDraft {
  title: string
  excerpt: string
  content: string
  seoDescription: string
  generatedBy: 'nvidia' | 'offline'
}

function offlineGuide(topic: string, label: string): GuideDraft {
  const t = topic.trim() || `Guía de ${label || 'pesca'}`
  const title = t.charAt(0).toUpperCase() + t.slice(1)
  const content = [
    `Esta guía te ayuda con **${t}**${label ? ` en la modalidad de ${label.toLowerCase()}` : ''}. Reunimos lo esencial para que elijas bien tu equipo y mejores tus resultados.`,
    ``,
    `**Qué tener en cuenta**`,
    `- Define tu objetivo: especie, lugar y presupuesto.`,
    `- Prioriza calidad en las piezas que más sufren (carrete y línea).`,
    `- Lee valoraciones reales antes de comprar.`,
    ``,
    `**Recomendaciones**`,
    `- Empieza con un equipo versátil y amplía según tu técnica.`,
    `- Mantén y limpia tu material tras cada salida.`,
    ``,
    `Explora nuestras categorías para encontrar el aparejo ideal y usa el asistente IA si tienes dudas.`,
  ].join('\n')
  return {
    title,
    excerpt: `Todo lo que necesitas saber sobre ${t.toLowerCase()}: qué mirar, recomendaciones y consejos prácticos.`,
    content,
    seoDescription: `Guía de ${t.toLowerCase()}: consejos, qué tener en cuenta y recomendaciones para acertar. Aparejos seleccionados en PescaPlus.`.slice(0, 160),
    generatedBy: 'offline',
  }
}

/** Generate a fishing buying guide / blog article. Never throws. */
export async function generateGuide(topic: string, typeFishing?: string): Promise<GuideDraft> {
  const label = typeFishing ? fishingLabel(typeFishing) : ''
  const fallback = offlineGuide(topic, label)
  if (!isApiConfigured()) return fallback

  const instruction = `Escribe una guía/artículo de blog de pesca en español sobre: "${topic}"${label ? ` (categoría: ${label})` : ''}.
Tono experto, útil y ameno. Devuelve SOLO JSON válido:
{"title": string (atractivo y con palabras clave SEO),
 "excerpt": string (resumen de 1-2 frases),
 "content": string (400-700 palabras en markdown LIGERO: usa **negrita** para los títulos de sección y "- " para listas; NO uses HTML ni #),
 "seoDescription": string (meta descripción de 140-160 caracteres)}`

  const content = await callNvidia(
    [
      { role: 'system', content: 'Eres un redactor experto en pesca. Respondes solo con JSON válido.' },
      { role: 'user', content: instruction },
    ],
    { maxTokens: 1800, temperature: 0.75 },
  )
  const parsed = content ? extractJson(content) : null
  if (!parsed) return fallback

  const str = (v: unknown, f: string) => (typeof v === 'string' && v.trim() ? v.trim() : f)
  return {
    title: str(parsed.title, fallback.title).slice(0, 140),
    excerpt: str(parsed.excerpt, fallback.excerpt).slice(0, 300),
    content: str(parsed.content, fallback.content),
    seoDescription: str(parsed.seoDescription, fallback.seoDescription).slice(0, 165),
    generatedBy: 'nvidia',
  }
}
