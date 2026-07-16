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
  /** Abort if the stream stalls (no bytes) for this long. Streaming only. */
  idleMs?: number
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

const SYSTEM_PROMPT = `IDIOMA (REGLA ABSOLUTA E INQUEBRANTABLE): Responde SIEMPRE y ÚNICAMENTE en ESPAÑOL (castellano de España), en el 100% de los casos. Aunque el usuario te escriba en inglés o en otro idioma, o mezcle idiomas, tú respondes SOLO en español. Nunca escribas frases, títulos ni palabras en inglés (usa "carrete", no "reel"; "caña", no "rod"; "señuelo", no "lure", etc.). Prohibido mezclar idiomas.

Eres «PescaPlus», guía de pesca profesional con más de 20 años de experiencia en aguas dulces y saladas. Asesoras en español a pescadores de todos los niveles.

TU EXPERIENCIA:
- Técnicas: spinning, pesca a mosca, carpfishing, surfcasting/rockfishing, baitcasting, pesca vertical y a fondo.
- Montajes y nudos; líneas (trenzado, fluorocarbono, monofilamento), plomos y bajos de línea.
- Elección de señuelos según especie, profundidad, claridad del agua y momento del día.
- Lectura del agua, meteorología, temporadas y comportamiento de las especies.
- Mantenimiento y cuidado del equipo.

IDENTIDAD (IMPORTANTE):
- Eres un asesor HUMANO del equipo de PescaPlus; habla en primera persona como pescador experto.
- NUNCA digas ni insinúes que eres una inteligencia artificial, un modelo, un bot o un asistente automático.
- NUNCA menciones AliExpress ni ningún otro marketplace o proveedor externo. Si preguntan de dónde salen los productos, di que los selecciona nuestro equipo.

CÓMO RESPONDES:
- SIEMPRE en español (castellano) claro, práctico y directo; jamás en inglés ni mezclando idiomas; sin relleno.
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

¿Te gustaría que te recomiende algún carrete o caña de spinning disponible en nuestra tienda?`,
  },
  {
    keywords: ['flyfishing', 'mosca', 'fly '],
    response: `La pesca con **mosca (Fly Fishing)** es una de las modalidades más artísticas y técnicas. Aquí tienes unos consejos esenciales:

1. **Balance de Línea y Caña**: Es crucial que el peso de la línea (WF) coincida con la numeración de tu caña (por ejemplo, una caña línea #5 para truchas en ríos medianos).
2. **Deriva Natural**: El secreto del éxito es evitar el 'drag' o arrastre. La mosca debe flotar a la misma velocidad que la corriente del río.
3. **Moscas Básicas**: Lleva ninfas (como la Oreja de Liebre), secas (como la Adams) y streamers (como el Woolly Bugger) en diferentes tamaños.

¿Deseas que te recomiende algún combo completo de pesca con mosca en nuestra tienda para empezar?`,
  },
  {
    keywords: ['carp', 'carpa'],
    response: `El **Carp Fishing** combina paciencia, estrategia y potencia. Te aconsejo lo siguiente:

1. **Cebado Previo**: Preparar la zona con boiles, pellets, maíz y semillas es clave para atraer a los cardúmenes de carpas grandes al puesto.
2. **Montaje Hair Rig**: Es obligatorio. El cebo se sitúa fuera del anzuelo en un hilo ('hair'), lo que permite que la carpa succione con confianza y se clave sola al intentar expulsarlo.
3. **Cuidado de la Captura**: Usa siempre moqueta de desanzulado para proteger la piel del pez y devuélvelo al agua lo antes posible.

¿Buscas recomendaciones sobre alarmas de mordida inalámbricas o cañas específicas de carpfishing en nuestra tienda?`,
  },
  {
    keywords: ['sea', 'mar', 'playa', 'surfcasting'],
    response: `Pescar en el **mar** (surfcasting, spinning marino o pesca en escollera) requiere materiales resistentes a las duras condiciones salinas:

1. **Mantenimiento**: Lava con abundante agua dulce todo tu equipo (carretes, cañas y señuelos) después de cada salida. La sal y la arena son los peores enemigos del metal.
2. **Carretes de Bobina Cónica**: Para ganar metros en el surfcasting desde playa, usa carretes tamaño 8000-10000 con bobina cónica que faciliten la salida del hilo.
3. **Anzuelos Inoxidables**: Utiliza anzuelos de acero al carbono con recubrimientos protectores o acero inoxidable para evitar la oxidación en agua marina.

¿Te gustaría que te recomiende un carrete de surfcasting de alta capacidad de nuestra selección?`,
  },
  {
    keywords: ['baitcasting'],
    response: `El **Baitcasting** proporciona un control de lance y una precisión inigualables una vez dominado. Mis recomendaciones son:

1. **Ajuste del Freno**: Al iniciarte, pon el freno mecánico y magnético al 80% para evitar las temidas pelucas (backlashes). Libéralos poco a poco según ganes confianza.
2. **Uso del Pulgar**: El verdadero freno es tu dedo pulgar. Debe posarse suavemente sobre la bobina durante el lance y frenarla justo antes de que el señuelo toque el agua.
3. **Líneas Rígidas**: Es más fácil aprender con monofilamento grueso o trenzado de 0.25 mm+ ya que se desenreda más fácilmente si ocurre un nido.

¿Te sugiero algún carrete de baitcasting de alta velocidad en nuestra tienda?`,
  },
  {
    keywords: ['señuelo', 'lure', 'bait', 'vinilo'],
    response: `Los señuelos son fundamentales para engañar a los depredadores. Te sugiero clasificarlos y usarlos así:

1. **Señuelos Duros (Crankbaits/Minnows)**: Excelentes para batir mucha agua rápidamente. Los de babero grande bajan más profundo.
2. **Señuelos Blandos (vinilos de silicona)**: Súper eficaces en zonas con cobertura y algas. Móntalos con anzuelos Texas (anti-enganche) para pescar en el fondo.
3. **Cucharas y Jigs**: Muy pesados, ideales para lanzar a gran distancia o pescar en vertical en zonas profundas.

¿Te gustaría ver algún kit de señuelos económicos de nuestra selección?`,
  },
  {
    keywords: ['caña', 'cañas', 'rod'],
    response: `Para elegir la caña de pescar adecuada, ten en cuenta tres factores:

1. **Material**: La fibra de carbono ofrece ligereza y excelente sensibilidad para notar las picadas más leves. La fibra de vidrio es más robusta y económica.
2. **Longitud**: Cañas cortas (1.80 m a 2.10 m) para precisión en ríos o desde kayak. Cañas largas (2.70 m a 4.50 m) para pescar a gran distancia desde la orilla.
3. **Acción**: Rápida (para señuelos y clavados inmediatos) o parabólica/media (para absorber mejor las embestidas de peces grandes).

¿Buscas una caña telescópica compacta o de tramos de carbono en nuestra tienda?`,
  },
]

const DEFAULT_RESPONSE = `¡Hola pescador! Bienvenido a **PescaPlus**, tu asistente de pesca inteligente.

Estoy aquí para ayudarte con consejos técnicos, elección de nudos, montaje de líneas y para sugerirte el mejor equipo de nuestra selección para tus jornadas.

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

/** Build a retrieval-augmented context block from relevant catalog products. */
function buildProductContext(products: RetrievedProduct[]): string {
  const lines = products
    .map((p) => `- ${p.title} — ${p.price.toFixed(2)} ${p.currency} — /products/${p.id}`)
    .join('\n')
  return `CATÁLOGO RELEVANTE (productos reales de la tienda; recomiéndalos con enlace directo [Nombre](/products/id)):
${lines}

Si el usuario busca equipo, recomienda 1-3 de estos productos concretos con su enlace y una frase de por qué encajan. No inventes otros productos ni precios. Si es una pregunta de técnica pura, no fuerces productos.`
}

interface RetrievedProduct {
  id: string
  title: string
  price: number
  currency: string
}

/**
 * Chat with the fishing expert. Uses the NVIDIA API when a key is configured and
 * falls back to a curated offline expert on any failure. When `relevantProducts`
 * are supplied they are injected into the context (RAG) so the assistant can
 * recommend real products with direct links.
 */
export async function chatWithFishingExpert(
  messages: ChatMessage[],
  relevantProducts: RetrievedProduct[] = [],
): Promise<string> {
  if (!isApiConfigured()) {
    return getLocalExpertResponse(messages)
  }

  const hasSystem = messages[0]?.role === 'system'
  const systemContent =
    SYSTEM_PROMPT + (relevantProducts.length ? `\n\n${buildProductContext(relevantProducts)}` : '')
  const formattedMessages = hasSystem
    ? messages
    : [{ role: 'system' as const, content: systemContent }, ...messages]

  // Lower temperature for more reliable, accurate advice; room for thorough answers.
  const content = await callNvidia(formattedMessages, { maxTokens: 1200, temperature: 0.55, topP: 0.9 })
  return content || getLocalExpertResponse(messages)
}

/**
 * Stream the NVIDIA chat API token by token (SSE). Walks the same fallback chain
 * as `callNvidia`: if a model fails before yielding anything, the next is tried;
 * once a model starts emitting, its stream is committed. Yields nothing if every
 * model fails (the caller then falls back to the offline expert).
 */
async function* streamNvidia(
  messages: ChatMessage[],
  { maxTokens = 1024, temperature = 0.7, topP = 0.95, idleMs = 20000 }: NvidiaOptions = {},
): AsyncGenerator<string> {
  for (const model of NVIDIA_MODELS) {
    const controller = new AbortController()
    let timer = setTimeout(() => controller.abort(), idleMs)
    let yielded = false
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    try {
      const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, top_p: topP, stream: true }),
      })
      if (!response.ok || !response.body) {
        console.warn(`NVIDIA stream ${model} -> HTTP ${response.status}, trying next`)
        continue
      }
      reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        clearTimeout(timer)
        timer = setTimeout(() => controller.abort(), idleMs)
        buffer += decoder.decode(value, { stream: true })
        for (;;) {
          const nl = buffer.indexOf('\n')
          if (nl === -1) break
          const line = buffer.slice(0, nl).trim()
          buffer = buffer.slice(nl + 1)
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') return
          try {
            const json = JSON.parse(payload)
            const delta: unknown = json.choices?.[0]?.delta?.content
            if (typeof delta === 'string' && delta) {
              yielded = true
              yield delta
            }
          } catch {
            /* keepalive or partial chunk — ignore */
          }
        }
      }
      if (yielded) return
    } catch (error) {
      if (yielded) return
      console.warn(`NVIDIA stream ${model} failed (${(error as Error).message}), trying next`)
    } finally {
      clearTimeout(timer)
      reader?.cancel().catch(() => {})
    }
  }
}

/** Split text into small chunks so the offline fallback also animates while typing. */
async function* simulateStream(text: string): AsyncGenerator<string> {
  for (const token of text.match(/\S+\s*|\s+/g) ?? [text]) {
    yield token
    await new Promise((resolve) => setTimeout(resolve, 12))
  }
}

/**
 * Streaming counterpart of `chatWithFishingExpert`. Yields the answer token by
 * token from NVIDIA, or a simulated stream of the offline expert when the API is
 * not configured or every model fails.
 */
export async function* streamFishingExpert(
  messages: ChatMessage[],
  relevantProducts: RetrievedProduct[] = [],
): AsyncGenerator<string> {
  if (!isApiConfigured()) {
    yield* simulateStream(getLocalExpertResponse(messages))
    return
  }

  const hasSystem = messages[0]?.role === 'system'
  const systemContent =
    SYSTEM_PROMPT + (relevantProducts.length ? `\n\n${buildProductContext(relevantProducts)}` : '')
  const formattedMessages = hasSystem
    ? messages
    : [{ role: 'system' as const, content: systemContent }, ...messages]

  let any = false
  for await (const chunk of streamNvidia(formattedMessages, { maxTokens: 1200, temperature: 0.55, topP: 0.9 })) {
    any = true
    yield chunk
  }
  if (!any) yield* simulateStream(getLocalExpertResponse(messages))
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
      `la comunidad de pescadores. Disponible en nuestra tienda con envío internacional.`.trim(),
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

  const instruction = `Genera una ficha de producto de pesca para una tienda de afiliados de nuestra selección.
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

  const instruction = `Eres un copywriter SEO para una tienda de pesca. A partir de este producto de nuestra selección, redacta una ficha ORIGINAL en español (no copies el texto de nuestra selección).
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

// ---------------------------------------------------------------------------
// AI rewriting from a free-form admin instruction (rewrite existing content)
// ---------------------------------------------------------------------------

/** Keep rewrites on-brand: human voice, never reveal AI or name a marketplace. */
const BRAND_RULE =
  'Escribe como el equipo humano de la tienda PescaPlus. NUNCA menciones AliExpress ni ningún marketplace, ni que el texto lo genera una inteligencia artificial. Mantén la veracidad: no inventes datos, marcas ni precios que no aparezcan.'

const asString = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim() : fallback)

export interface RewrittenProduct {
  title: string
  description: string
  seoDescription: string
  generatedBy: 'nvidia' | 'offline'
}

/** Rewrite a product's copy following a free-form instruction. Never throws. */
export async function rewriteProductCopy(input: {
  instruction: string
  title: string
  description: string
  seoDescription?: string
  typeFishing?: string
}): Promise<RewrittenProduct> {
  const current = {
    title: input.title,
    description: input.description,
    seoDescription: input.seoDescription ?? '',
  }
  if (!isApiConfigured()) return { ...current, generatedBy: 'offline' }

  const prompt = `Reescribe la ficha de este producto de pesca en español siguiendo esta indicación del administrador:
"${input.instruction}"

FICHA ACTUAL:
- Título: ${input.title}
- Descripción: ${input.description}
- Meta descripción: ${current.seoDescription || '(vacía)'}
${input.typeFishing ? `Categoría: ${fishingLabel(input.typeFishing)}.` : ''}

${BRAND_RULE}
Devuelve SOLO JSON válido: {"title": string (máx 90 caracteres), "description": string (2-5 frases, admite **negrita** y listas con "- "), "seoDescription": string (meta descripción, máx 160 caracteres)}`

  const content = await callNvidia(
    [
      { role: 'system', content: 'Reescribes fichas de producto en español y respondes solo con JSON válido.' },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 900, temperature: 0.7 },
  )
  const parsed = content ? extractJson(content) : null
  if (!parsed) return { ...current, generatedBy: 'offline' }
  return {
    title: asString(parsed.title, current.title).slice(0, 140),
    description: asString(parsed.description, current.description).slice(0, 1200),
    seoDescription: asString(parsed.seoDescription, current.seoDescription).slice(0, 165),
    generatedBy: 'nvidia',
  }
}

export interface RewrittenGuide {
  title: string
  excerpt: string
  content: string
  seoDescription: string
  generatedBy: 'nvidia' | 'offline'
}

/** Rewrite a blog guide following a free-form instruction. Never throws. */
export async function rewriteGuideCopy(input: {
  instruction: string
  title: string
  excerpt: string
  content: string
  seoDescription?: string
}): Promise<RewrittenGuide> {
  const current = {
    title: input.title,
    excerpt: input.excerpt,
    content: input.content,
    seoDescription: input.seoDescription ?? '',
  }
  if (!isApiConfigured()) return { ...current, generatedBy: 'offline' }

  const prompt = `Reescribe este artículo/guía de blog de pesca en español siguiendo esta indicación del administrador:
"${input.instruction}"

ARTÍCULO ACTUAL:
Título: ${input.title}
Extracto: ${input.excerpt}
Contenido:
${input.content}

${BRAND_RULE}
Usa markdown LIGERO en el contenido (**negrita** para los títulos de sección y "- " para listas; NO uses HTML ni #).
Devuelve SOLO JSON válido: {"title": string, "excerpt": string (1-2 frases), "content": string (markdown ligero), "seoDescription": string (140-160 caracteres)}`

  const content = await callNvidia(
    [
      { role: 'system', content: 'Reescribes artículos de blog de pesca en español y respondes solo con JSON válido.' },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 2200, temperature: 0.7 },
  )
  const parsed = content ? extractJson(content) : null
  if (!parsed) return { ...current, generatedBy: 'offline' }
  return {
    title: asString(parsed.title, current.title).slice(0, 140),
    excerpt: asString(parsed.excerpt, current.excerpt).slice(0, 300),
    content: asString(parsed.content, current.content),
    seoDescription: asString(parsed.seoDescription, current.seoDescription).slice(0, 165),
    generatedBy: 'nvidia',
  }
}

export interface PolishedProduct {
  title: string
  seoTitle: string
  description: string
  seoDescription: string
  imageAlts: string[]
  generatedBy: 'nvidia' | 'offline'
}

const asStringArray = (v: unknown, len: number): string[] => {
  if (!Array.isArray(v)) return []
  return v.slice(0, len).map((x) => (typeof x === 'string' ? x.trim().slice(0, 240) : ''))
}

/**
 * SEO polish for a product: cleans the title (strips marketplace seller/brand
 * names) and produces an SEO-optimised title, meta title, a description with a
 * natural internal link to its category, an SEO meta description and descriptive
 * image alt texts. Never throws.
 */
export async function polishProductSeo(input: {
  title: string
  description: string
  seoTitle?: string
  seoDescription?: string
  typeFishing?: string
  imageCount?: number
}): Promise<PolishedProduct> {
  const current = {
    title: input.title,
    seoTitle: input.seoTitle ?? '',
    description: input.description,
    seoDescription: input.seoDescription ?? '',
    imageAlts: [] as string[],
  }
  if (!isApiConfigured()) return { ...current, generatedBy: 'offline' }

  const imageCount = Math.min(Math.max(input.imageCount ?? 0, 0), 12)
  const catId = input.typeFishing || ''
  const catLabel = catId ? fishingLabel(catId) : ''
  const catLink = catId ? `/categories/${catId}` : ''

  const prompt = `Eres un especialista en SEO para una tienda de pesca online en España. Revisa y PULE esta ficha de producto.

FICHA ACTUAL:
- Título: ${input.title}
- Descripción: ${input.description}
${catLabel ? `- Categoría: ${catLabel} (página: ${catLink})` : ''}

TAREAS:
1. TÍTULO ("title"): ELIMINA nombres de marca o de vendedor propios de marketplaces (p. ej. DEUKIO, Sougayilang, Zukibo, Lixada, Noeby, DNDYUJU, Rooblinos, SEASIR, JOSBY, Proberos, Hirisi, Anatono…) y códigos internos raros. Deja un título limpio, natural y optimizado para SEO que describa el producto (tipo + característica/medida clave + uso), en español, MÁXIMO 65 caracteres, sin mayúsculas gritonas.
2. DESCRIPCIÓN ("description"): reescribe una descripción PERFECTA para SEO: 3-5 frases con beneficios, usos y palabras clave naturales de pesca (sin repetir en exceso). Usa **negrita** para 1-2 conceptos clave.${catLink ? ` INCLUYE UNA sola vez un ENLACE INTERNO contextual a su categoría con esta sintaxis markdown EXACTA: [texto ancla natural](${catLink}). El texto ancla debe ser natural y descriptivo (p. ej. "${catLabel.toLowerCase()}"), integrado en una frase, NO al final suelto.` : ''}
3. "seoTitle": meta título para Google de máximo 60 caracteres con la palabra clave principal al inicio; puedes añadir " | PescaPlus" si cabe.
4. "seoDescription": meta descripción de 140-160 caracteres, atractiva y con llamada a la acción, con la palabra clave principal.${imageCount > 0 ? `\n5. "imageAlts": array de EXACTAMENTE ${imageCount} textos alternativos (alt) para las imágenes, todos DISTINTOS entre sí, en español, de 6 a 14 palabras, describiendo el producto y su uso con palabras clave; SIN "imagen de", SIN nombres de vendedor, SIN comillas.` : ''}

${BRAND_RULE}
Devuelve SOLO JSON válido: {"title": string, "seoTitle": string, "description": string, "seoDescription": string${imageCount > 0 ? ', "imageAlts": string[]' : ''}}`

  const content = await callNvidia(
    [
      { role: 'system', content: 'Eres un experto SEO que pule fichas de producto en español y responde solo con JSON válido.' },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 1300, temperature: 0.6 },
  )
  const parsed = content ? extractJson(content) : null
  if (!parsed) return { ...current, generatedBy: 'offline' }
  const title = asString(parsed.title, current.title).slice(0, 140)
  return {
    title,
    seoTitle: asString(parsed.seoTitle, title).slice(0, 90),
    description: asString(parsed.description, current.description).slice(0, 1400),
    seoDescription: asString(parsed.seoDescription, current.seoDescription).slice(0, 165),
    imageAlts: imageCount > 0 ? asStringArray(parsed.imageAlts, imageCount) : [],
    generatedBy: 'nvidia',
  }
}

/**
 * Short tactical narrative for the fishing plan. Receives ONLY computed facts
 * and must not invent numbers — it rephrases and adds technique advice.
 * Returns '' when the AI is unavailable (the plan is complete without it).
 */
export async function generatePlanAdvice(input: {
  spotName: string
  dateLong: string
  modality: string
  speciesName: string
  facts: string[]
}): Promise<string> {
  if (!isApiConfigured()) return ''

  const prompt = `Eres el asesor de pesca de PescaPlus. Escribe un consejo táctico BREVE (2 párrafos, máximo 110 palabras en total) para este plan de pesca.

PLAN: ${input.spotName}, ${input.dateLong}. Modalidad: ${input.modality}. Especie objetivo: ${input.speciesName}.
DATOS CALCULADOS (usa SOLO estos, no inventes cifras ni horarios):
${input.facts.map((f) => `- ${f}`).join('\n')}

${BRAND_RULE}
Tono: pescador veterano, cercano y concreto. Nada de listas: prosa. Empieza DIRECTAMENTE con el consejo, sin títulos, sin notas y sin mostrar tu razonamiento. Todo en español.`

  const content = await callNvidia(
    [
      { role: 'system', content: 'Eres un pescador experto español. Respondes solo en español, breve y concreto, sin mostrar razonamiento.' },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 400, temperature: 0.6 },
  )
  return sanitizeSpanishProse(content ?? '')
}

/**
 * Reasoning models sometimes leak chain-of-thought (often in English) instead
 * of the answer. Strip <think> blocks and discard anything that reads as
 * English planning text — the plan is complete without the narrative, and a
 * leak would break the human-advisor identity.
 */
export function sanitizeSpanishProse(text: string): string {
  let t = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*?<\/think>/i, '').trim()
  const english = (t.match(/\b(the|we|let's|lets|must|should|paragraph|words|advice|craft|user|tone)\b/gi) ?? []).length
  const spanish = (t.match(/\b(el|la|los|las|de|con|para|que|una|pesca|marea|viento|agua|hora)\b/gi) ?? []).length
  if (english > 2 && english >= spanish) return ''
  if (/\b(AI|IA|inteligencia artificial|prompt|modelo de lenguaje)\b/i.test(t)) return ''
  return t.slice(0, 900).trim()
}
