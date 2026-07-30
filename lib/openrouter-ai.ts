import type { ChatMessage } from '@/types'
import type { ProductInput } from '@/lib/products-store'
import { fishingLabel, getFishingType, FISHING_TYPES } from '@/lib/fishing'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1'
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_BASE_URL = process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1'

interface ModelRef {
  provider: 'groq' | 'openrouter'
  model: string
}
const groq = (model: string): ModelRef => ({ provider: 'groq', model })
const openrouter = (model: string): ModelRef => ({ provider: 'openrouter', model })

/**
 * Groq (gratis, sin coste ni con crédito comprado) da un límite MUCHO más
 * generoso que el nivel gratuito de OpenRouter — documentación oficial,
 * 2026-07-28: 30 peticiones/min POR MODELO, con tope diario de 14.400 en
 * `llama-3.1-8b-instant` y 1.000 en `llama-3.3-70b-versatile` (frente a las
 * 50/día COMPARTIDAS entre todos los modelos gratuitos de OpenRouter). Se
 * ponen primero en la cadena por eso. Probados en vivo: ambos responden JSON
 * válido en menos de 1,3 s, sin gastar tokens en razonar.
 *
 * `openai/gpt-oss-120b` de Groq tiene el MISMO fallo que los razonadores
 * grandes ya vistos con NVIDIA y con OpenRouter gratis: quema TODO el
 * presupuesto de tokens "pensando" (898 de 900 en la prueba) y no llega a
 * escribir el JSON. `gpt-oss-20b` funciona pero gasta la mayoría de tokens
 * razonando (724 de 883) — se deja fuera por el mismo motivo de cautela que
 * `nemotron-nano-9b-v2:free`. Ninguno de los dos se usa aquí.
 */
const GROQ_MODELS: ModelRef[] = [
  groq('llama-3.1-8b-instant'),
  groq('llama-3.3-70b-versatile'),
]

/**
 * SOLO MODELOS GRATUITOS (":free") — decisión explícita de Jorge para no
 * gastar nada. Quedan como red de seguridad DETRÁS de Groq: si Groq entero
 * fallara (cuenta distinta, infraestructura distinta), esta cadena sigue
 * funcionando de forma independiente.
 *
 * Probados uno a uno en vivo antes de elegir estos 4 (ver `proveedor-ia-openrouter`
 * en la memoria del proyecto). De los ~18 modelos gratuitos que ofrecía
 * OpenRouter en ese momento, la mayoría no sirven para JSON estricto:
 * `openai/gpt-oss-20b:free`, `cohere/north-mini-code:free` y `poolside/*:free`
 * dan timeout o "fetch failed" con regularidad; `inclusionai/ling-3.0-flash:free`,
 * `openrouter/free` y los `nvidia/nemotron-3-*:free` (super-120b, nano-30b,
 * omni-reasoning, ultra-550b) queman TODO el presupuesto de tokens
 * "pensando" y nunca llegan a escribir el JSON. Estos 4 sí respondieron con
 * JSON válido de forma consistente. Override con la env var OPENROUTER_MODELS
 * (coma-separada) o una sola OPENROUTER_MODEL.
 */
const DEFAULT_OPENROUTER_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-nano-9b-v2:free',
]
const OPENROUTER_MODELS: string[] = (() => {
  const fromList = process.env.OPENROUTER_MODELS?.split(',').map((s) => s.trim()).filter(Boolean)
  if (fromList?.length) return fromList
  if (process.env.OPENROUTER_MODEL) return [process.env.OPENROUTER_MODEL, ...DEFAULT_OPENROUTER_MODELS]
  return DEFAULT_OPENROUTER_MODELS
})()

/** Cadena por defecto: Groq primero (más rápido y con más cuota gratis diaria), OpenRouter como red detrás. */
const DEFAULT_MODEL_CHAIN: ModelRef[] = [...GROQ_MODELS, ...OPENROUTER_MODELS.map(openrouter)]

/**
 * Reintentos del MISMO modelo ante un 429 antes de pasar al siguiente.
 *
 * Uno, no dos: con tres modelos en cadena y dos reintentos cada uno la llamada
 * llegaba a 125 s, y la ruta de reescritura tiene `maxDuration = 120` — en
 * producción se habría cortado justo cuando iba a contestar. Con uno, el peor
 * caso queda holgado y sigue absorbiendo el 429 típico del límite por minuto.
 */
const REINTENTOS_429 = 1

interface AiCallOptions {
  maxTokens?: number
  temperature?: number
  topP?: number
  timeoutMs?: number
  /** Abort if the stream stalls (no bytes) for this long. Streaming only. */
  idleMs?: number
  /** Per-call model chain override (e.g. a single stronger model for long-form content). */
  models?: ModelRef[]
}

/**
 * Call the chat API (Groq and/or OpenRouter), trying each model in the
 * fallback chain until one returns content. Returns null only if every model
 * fails.
 */
async function callAiModel(
  messages: ChatMessage[],
  { maxTokens = 1024, temperature = 0.7, topP = 0.95, timeoutMs = 20000, models }: AiCallOptions = {},
): Promise<string | null> {
  for (const ref of models ?? DEFAULT_MODEL_CHAIN) {
    const isGroq = ref.provider === 'groq'
    const baseUrl = isGroq ? GROQ_BASE_URL : OPENROUTER_BASE_URL
    const apiKey = isGroq ? GROQ_API_KEY : OPENROUTER_API_KEY
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
    if (!isGroq) {
      headers['HTTP-Referer'] = 'https://pescaplus.es'
      headers['X-Title'] = 'PescaPlus'
    }

    for (let intento = 0; intento <= REINTENTOS_429; intento++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          signal: controller.signal,
          headers,
          body: JSON.stringify({ model: ref.model, messages, max_tokens: maxTokens, temperature, top_p: topP }),
        })

        /**
         * Un 429 NO significa "este modelo no sirve": significa "espera un
         * momento". Antes se saltaba al siguiente modelo, así que un límite POR
         * MINUTO quemaba los tres de la cadena en dos segundos y la función
         * devolvía null.
         *
         * Es lo que rompía el pulido SEO en bloque: el tope de Groq son 12.000
         * tokens por minuto y cada pulido gasta ~2.500, así que al tercer
         * producto seguido salta — con la cuota DIARIA intacta (999 de 1.000
         * peticiones disponibles cuando se diagnosticó).
         *
         * Se espera lo que pida el proveedor (`retry-after`) o un margen
         * creciente, y se reintenta el MISMO modelo. Solo al agotar los
         * reintentos se pasa al siguiente.
         */
        if (response.status === 429 && intento < REINTENTOS_429) {
          const retryAfter = Number(response.headers.get('retry-after'))
          const esperaS = Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter, 20)
            : 3 * (intento + 1)
          console.warn(`${ref.provider} ${ref.model} -> 429, esperando ${esperaS}s y reintentando`)
          await new Promise((r) => setTimeout(r, esperaS * 1000))
          continue
        }

        if (!response.ok) {
          console.warn(`${ref.provider} model ${ref.model} -> HTTP ${response.status}, trying next`)
          break
        }
        const data = await response.json()
        const content: string | undefined = data.choices?.[0]?.message?.content
        if (content?.trim()) return content.trim()
        break
      } catch (error) {
        console.warn(`${ref.provider} model ${ref.model} failed (${(error as Error).message}), trying next`)
        break
      } finally {
        clearTimeout(timer)
      }
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
 * High-quality offline expert responses. Used when no OpenRouter key is
 * configured and as a graceful fallback if the API call fails, so the
 * assistant is always useful during the demo. Topics are matched in order
 * against the last user query.
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
  const hasGroq = Boolean(GROQ_API_KEY)
  const hasOpenRouter = Boolean(OPENROUTER_API_KEY) && OPENROUTER_API_KEY !== 'your_openrouter_api_key'
  return hasGroq || hasOpenRouter
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
 * Chat with the fishing expert. Uses OpenRouter when a key is configured and
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
  const content = await callAiModel(formattedMessages, { maxTokens: 1200, temperature: 0.55, topP: 0.9 })
  return content || getLocalExpertResponse(messages)
}

/**
 * Stream the chat API token by token (SSE). Walks the same fallback chain as
 * `callAiModel`: if a model fails before yielding anything, the next is
 * tried; once a model starts emitting, its stream is committed. Yields
 * nothing if every model fails (the caller then falls back to the offline
 * expert).
 */
async function* streamAiModel(
  messages: ChatMessage[],
  { maxTokens = 1024, temperature = 0.7, topP = 0.95, idleMs = 20000 }: AiCallOptions = {},
): AsyncGenerator<string> {
  for (const ref of DEFAULT_MODEL_CHAIN) {
    const controller = new AbortController()
    let timer = setTimeout(() => controller.abort(), idleMs)
    let yielded = false
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    try {
      const isGroq = ref.provider === 'groq'
      const baseUrl = isGroq ? GROQ_BASE_URL : OPENROUTER_BASE_URL
      const apiKey = isGroq ? GROQ_API_KEY : OPENROUTER_API_KEY
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      }
      if (!isGroq) {
        headers['HTTP-Referer'] = 'https://pescaplus.es'
        headers['X-Title'] = 'PescaPlus'
      }
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify({ model: ref.model, messages, max_tokens: maxTokens, temperature, top_p: topP, stream: true }),
      })
      if (!response.ok || !response.body) {
        console.warn(`${ref.provider} stream ${ref.model} -> HTTP ${response.status}, trying next`)
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
      console.warn(`${ref.provider} stream ${ref.model} failed (${(error as Error).message}), trying next`)
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
 * token from the AI provider chain, or a simulated stream of the offline
 * expert when the API is not configured or every model fails.
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
  for await (const chunk of streamAiModel(formattedMessages, { maxTokens: 1200, temperature: 0.55, topP: 0.9 })) {
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
  generatedBy: 'ai' | 'offline'
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
    generatedBy: 'ai',
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
 * `extractJson` + logging de diagnóstico por qué falla, para que un fallo nunca
 * sea silencioso.
 */
function parseAiJson(label: string, content: string | null): Record<string, unknown> | null {
  if (!content) {
    console.warn(`${label}: sin contenido de ningún modelo de OpenRouter`)
    return null
  }
  const parsed = extractJson(content)
  if (!parsed) {
    console.warn(`${label}: JSON no parseable · inicio: ${content.slice(0, 160).replace(/\n/g, ' ')}`)
    return null
  }
  return parsed
}

/**
 * Draft a full product from a short prompt. Uses OpenRouter when configured
 * (asking for strict JSON), otherwise returns a deterministic offline draft.
 * Never throws.
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

  const content = await callAiModel(
    [
      { role: 'system', content: 'Eres un generador de fichas de producto que responde solo con JSON válido.' },
      { role: 'user', content: instruction },
    ],
    { maxTokens: 900, temperature: 0.8, timeoutMs: 30000 },
  )
  const parsed = parseAiJson('generate-product-draft', content)
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
  generatedBy: 'ai' | 'offline'
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
 * Never reuses the marketplace text verbatim. Uses OpenRouter when configured,
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

  const instruction = `Eres el redactor SEO de PescaPlus, una tienda de pesca española. A partir de este producto de nuestra selección, redacta una ficha ORIGINAL (no copies el texto de nuestra selección).
Título original (solo como referencia): "${cleanTitle(originalTitle)}"
Modalidad: ${fishingLabel(typeFishing)} (${typeFishing}). Precio aprox: ${price ?? '—'} ${currency}.

${SPANISH_RULE}

Conserva del título original los datos que el comprador busca (medida, material, ratio, capacidad, uso) y quita las marcas de vendedor de marketplace.

Devuelve SOLO JSON válido:
{"title": string (40-70 caracteres, describe el producto con su dato clave),
 "description": string (3-4 frases, beneficios y usos, tono experto y cercano),
 "seoDescription": string (meta descripción de 140-160 caracteres, NUNCA más de 160, con llamada a la acción)}`

  const content = await callAiModel(
    [
      { role: 'system', content: 'Eres redactor SEO español de una tienda de pesca. Escribes en castellano de España impecable y respondes solo con JSON válido.' },
      { role: 'user', content: instruction },
    ],
    {
      maxTokens: 900,
      temperature: 0.6,
      topP: 0.9,
      timeoutMs: 30000,
      // Calidad por delante de velocidad: el 8b inventa gramática y anglicismos.
      models: [groq('llama-3.3-70b-versatile'), ...DEFAULT_MODEL_CHAIN],
    },
  )
  const fallback = offlineSeoListing(originalTitle, typeFishing, price, currency)
  const parsed = parseAiJson('generate-seo-listing', content)
  if (!parsed) return fallback

  const str = (v: unknown, f: string) => (typeof v === 'string' && v.trim() ? v.trim() : f)
  return {
    title: str(parsed.title, fallback.title).slice(0, 90),
    description: str(parsed.description, fallback.description).slice(0, 1200),
    seoDescription: recorteLimpio(str(parsed.seoDescription, fallback.seoDescription), 160),
    generatedBy: 'ai',
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
  generatedBy: 'ai' | 'offline'
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

  const content = await callAiModel(
    [
      { role: 'system', content: 'Eres un redactor experto en pesca. Respondes solo con JSON válido.' },
      { role: 'user', content: instruction },
    ],
    { maxTokens: 1800, temperature: 0.75, timeoutMs: 30000 },
  )
  const parsed = parseAiJson('generate-guide', content)
  if (!parsed) return fallback

  const str = (v: unknown, f: string) => (typeof v === 'string' && v.trim() ? v.trim() : f)
  return {
    title: str(parsed.title, fallback.title).slice(0, 140),
    excerpt: str(parsed.excerpt, fallback.excerpt).slice(0, 300),
    content: str(parsed.content, fallback.content),
    seoDescription: recorteLimpio(str(parsed.seoDescription, fallback.seoDescription), 160),
    generatedBy: 'ai',
  }
}

// ---------------------------------------------------------------------------
// AI rewriting from a free-form admin instruction (rewrite existing content)
// ---------------------------------------------------------------------------

/** Keep rewrites on-brand: human voice, never reveal AI or name a marketplace. */
const BRAND_RULE =
  'Escribe como el equipo humano de la tienda PescaPlus. NUNCA menciones AliExpress ni ningún marketplace, ni que el texto lo genera una inteligencia artificial. Mantén la veracidad: no inventes datos, marcas ni precios que no aparezcan.'

/**
 * Reglas de idioma para TODO lo que se publica de cara al cliente.
 *
 * Están escritas porque los modelos pequeños fallaban justo en esto: llamaban
 * "cazadores" a los pescadores, trataban de usted (el resto del sitio tutea) y
 * colaban anglicismos. Se repiten en cada prompt en vez de confiar en el
 * prompt de sistema: los modelos flojos se saltan las instrucciones lejanas.
 */
const SPANISH_RULE = `IDIOMA (INNEGOCIABLE):
- Castellano de España, correcto y natural. Nada de inglés ("rod", "reel", "lure" → caña, carrete, señuelo).
- TUTEA al lector: "compra", "descubre", "mejora tus jornadas". NUNCA de usted ("compre", "visite", "adquiera").
- Son PESCADORES, jamás "cazadores"; se habla de CAPTURAS y especies, jamás de "presas".
- Acentúa siempre correctamente (señuelo, caña, línea, nítida), aunque el texto original venga mal escrito.
- Mayúsculas a la española: solo la primera palabra y los nombres propios. "Caña telescópica de carbono", NO "Caña Telescópica De Carbono".`

const asString = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim() : fallback)

/**
 * Recorta a `max` caracteres SIN partir la última palabra.
 *
 * Un `slice(0, 165)` seco dejaba metas acabadas en "…y compra ahor", que es
 * exactamente lo que se lee en el resultado de Google. Si hay un espacio
 * razonablemente cerca del final se corta ahí y se limpia la puntuación
 * huérfana.
 */
function recorteLimpio(text: string, max: number): string {
  if (text.length <= max) return text
  const cortado = text.slice(0, max)
  const ultimoEspacio = cortado.lastIndexOf(' ')
  const base = ultimoEspacio > max * 0.6 ? cortado.slice(0, ultimoEspacio) : cortado
  return base.replace(/[\s,;:.¡!¿?-]+$/, '')
}

export interface RewrittenProduct {
  title: string
  description: string
  seoDescription: string
  generatedBy: 'ai' | 'offline'
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

${SPANISH_RULE}

${BRAND_RULE}
Devuelve SOLO JSON válido: {"title": string (máx 90 caracteres), "description": string (2-5 frases, admite **negrita** y listas con "- "), "seoDescription": string (meta descripción, máx 160 caracteres)}`

  const content = await callAiModel(
    [
      { role: 'system', content: 'Reescribes fichas de producto en castellano de España impecable y respondes solo con JSON válido.' },
      { role: 'user', content: prompt },
    ],
    {
      maxTokens: 1000,
      temperature: 0.6,
      timeoutMs: 30000,
      models: [groq('llama-3.3-70b-versatile'), ...DEFAULT_MODEL_CHAIN],
    },
  )
  const parsed = parseAiJson('rewrite-product-copy', content)
  if (!parsed) return { ...current, generatedBy: 'offline' }
  return {
    title: asString(parsed.title, current.title).slice(0, 140),
    description: asString(parsed.description, current.description).slice(0, 1200),
    seoDescription: recorteLimpio(asString(parsed.seoDescription, current.seoDescription), 160),
    generatedBy: 'ai',
  }
}

export interface RewrittenGuide {
  title: string
  excerpt: string
  content: string
  seoDescription: string
  generatedBy: 'ai' | 'offline'
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

  const content = await callAiModel(
    [
      { role: 'system', content: 'Reescribes artículos de blog de pesca en español y respondes solo con JSON válido.' },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 2200, temperature: 0.7, timeoutMs: 40000 },
  )
  const parsed = parseAiJson('rewrite-guide-copy', content)
  if (!parsed) return { ...current, generatedBy: 'offline' }
  return {
    title: asString(parsed.title, current.title).slice(0, 140),
    excerpt: asString(parsed.excerpt, current.excerpt).slice(0, 300),
    content: asString(parsed.content, current.content),
    seoDescription: recorteLimpio(asString(parsed.seoDescription, current.seoDescription), 160),
    generatedBy: 'ai',
  }
}

export interface PolishedProduct {
  title: string
  seoTitle: string
  description: string
  seoDescription: string
  imageAlts: string[]
  generatedBy: 'ai' | 'offline'
  /**
   * `true` cuando NINGÚN modelo contestó (cuota por minuto, red). No es lo
   * mismo que "ha contestado y no pasaba la revisión": en el primer caso hay
   * que esperar y reintentar, en el segundo insistir no arregla nada. Sin esta
   * distinción, el pulido en bloque contaba los 429 como fichas fallidas y
   * parecía que la función estaba rota.
   */
  unavailable?: boolean
}

const asStringArray = (v: unknown, len: number): string[] => {
  if (!Array.isArray(v)) return []
  return v.slice(0, len).map((x) => (typeof x === 'string' ? x.trim().slice(0, 240) : ''))
}

/**
 * Vocabulario que delata que el modelo se ha ido a otro deporte o a otro
 * idioma. "Cazador"/"presa" salieron en fichas reales: el modelo arrastra
 * vocabulario de caza al hablar de depredadores y acaba llamando "cazadores"
 * a los pescadores.
 */
const SEO_BANNED = /\b(cazador|cazadores|caza|presa|presas|hunter|angler|fisherman|rod\b|reel\b|lure\b)\b/i

/** Restos del propio prompt que algún modelo copia literalmente. */
const SEO_PLACEHOLDER = /texto ancla|texto-ancla|\[nombre\]|\bstring\b|p\. ?ej\.|lorem/i

/**
 * Qué se considera un pulido ACEPTABLE. Devuelve la lista de motivos por los
 * que no lo es (vacía = correcto).
 *
 * Existe porque sin esto el pulido publicaba tal cual "Carrete Spinning" como
 * meta título (16 de los 60 caracteres útiles), metas de 107 caracteres,
 * "¡Pescar ha nunca sido tan divertido!" y hasta el marcador `[texto ancla]`
 * del propio prompt. Se prefiere no tocar la ficha antes que empeorarla.
 */
function seoProblems(
  p: { title: string; seoTitle: string; description: string; seoDescription: string },
  catLink: string,
): string[] {
  const malos: string[] = []
  const todo = `${p.title} ${p.seoTitle} ${p.description} ${p.seoDescription}`

  if (SEO_BANNED.test(todo)) malos.push('vocabulario impropio (caza/inglés)')
  if (SEO_PLACEHOLDER.test(todo)) malos.push('ha copiado un marcador del prompt')

  if (p.title.length < 15 || p.title.length > 70) malos.push(`título de ${p.title.length} car.`)
  if (p.title === p.title.toLowerCase()) malos.push('título todo en minúsculas')
  if (p.title === p.title.toUpperCase()) malos.push('título todo en mayúsculas')

  // Mayúsculas a la inglesa ("Caña De Pescar Con Carrete"): en castellano los
  // títulos van en minúscula salvo la primera palabra y los nombres propios.
  // Se detecta por los conectores, que nunca se capitalizan en medio.
  if (/ (De|Del|La|El|Los|Las|Y|O|Con|Para|Por|En|A|Al)\b/.test(`${p.title} ${p.seoTitle}`)) {
    malos.push('mayúsculas a la inglesa en el título')
  }

  /**
   * Las longitudes se juzgan con manga ancha A PROPÓSITO. Contar caracteres se
   * le da fatal a un modelo de lenguaje, y rechazar por 8 caracteres de más
   * dejaba la ficha SIN PULIR — el peor resultado posible, porque el original
   * sin tocar es justo lo que se quería mejorar. Aquí solo se rechaza lo
   * absurdo (un meta título de 12 caracteres, una meta de 300); el ajuste fino
   * al tamaño exacto lo hace `recorteLimpio`, que es determinista y no falla.
   * Lo que sí se rechaza sin piedad es lo que el código NO puede arreglar: el
   * idioma, el vocabulario y el tono.
   */
  if (p.seoTitle.length < 25 || p.seoTitle.length > 75) malos.push(`meta título de ${p.seoTitle.length} car.`)
  if (p.seoDescription.length < 100 || p.seoDescription.length > 200) malos.push(`meta descripción de ${p.seoDescription.length} car.`)
  if (p.description.length < 180) malos.push(`descripción de ${p.description.length} car.`)

  // Trato de usted: el resto del sitio tutea.
  if (/\b(compre|visite|descubra|adquiera|disfrute|elija|consulte)\b/i.test(todo)) malos.push('trata de usted')

  if (catLink && !p.description.includes(`](${catLink})`)) malos.push('falta el enlace interno a la categoría')

  return malos
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

  const ancla = catLabel ? catLabel.toLowerCase() : ''
  const prompt = `Eres el redactor SEO de PescaPlus, una tienda de pesca española. Pule esta ficha para que posicione en Google.es y la lea un pescador español.

FICHA ACTUAL:
- Título: ${input.title}
- Descripción: ${input.description}
${catLabel ? `- Categoría: ${catLabel} (página: ${catLink})` : ''}

${SPANISH_RULE}

TAREAS:
1. "title" (40-65 caracteres): quita marcas de vendedor de marketplace (DEUKIO, Sougayilang, Zukibo, Lixada, Noeby, DNDYUJU, Rooblinos, SEASIR, JOSBY, Proberos, Hirisi, Anatono…) y códigos raros, pero CONSERVA los datos que el comprador busca: medida, material, ratio, capacidad, uso (p. ej. "3 m", "fibra de carbono", "5.2:1", "agua salada"). MAYÚSCULAS A LA ESPAÑOLA: solo la primera palabra y los nombres propios. Se escribe "Caña telescópica de fibra de carbono 3 m", NO "Caña Telescópica De Fibra De Carbono" (eso es el estilo inglés y en castellano está mal).
2. "description" (3-5 frases, mínimo 200 caracteres): beneficios y usos reales, con las palabras clave integradas con naturalidad. Marca 2-3 conceptos clave con **negrita**.${catLink ? ` Incluye UNA sola vez, dentro de una frase, un enlace markdown a su categoría con esta forma EXACTA: [${ancla}](${catLink}). El texto del enlace debe ser palabras de verdad como "${ancla}" — NUNCA escribas literalmente "texto ancla".` : ''}
3. "seoTitle" (50-60 caracteres, APROVÉCHALOS): la palabra clave principal al principio y " | PescaPlus" al final si cabe. Un meta título de 20 caracteres desperdicia el espacio donde caben las palabras que la gente busca. Escríbelo como una frase con sentido, no encadenando palabras clave con barras.
4. "seoDescription" (entre 140 y 160 caracteres, NUNCA más de 160): resume el beneficio principal y termina con una llamada a la acción. Cuenta los caracteres y termina la frase — si te pasas de 160 se corta a media palabra en Google.${imageCount > 0 ? `\n5. "imageAlts": EXACTAMENTE ${imageCount} textos alternativos DISTINTOS entre sí, de 6 a 14 palabras, describiendo el producto y su uso; sin "imagen de", sin marcas de vendedor y sin comillas.` : ''}

${BRAND_RULE}
Devuelve SOLO JSON válido: {"title": string, "seoTitle": string, "description": string, "seoDescription": string${imageCount > 0 ? ', "imageAlts": string[]' : ''}}`

  /**
   * Se lee SIN recortar: recortar antes de revisar escondía el fallo — una
   * meta descripción de 200 caracteres se convertía en uno de 165 cortado a
   * media palabra y pasaba la revisión como si midiera bien. El recorte de
   * seguridad se aplica solo al aceptar.
   */
  const leer = (parsed: Record<string, unknown>) => {
    const title = asString(parsed.title, current.title)
    return {
      title,
      seoTitle: asString(parsed.seoTitle, title),
      description: asString(parsed.description, current.description),
      seoDescription: asString(parsed.seoDescription, current.seoDescription),
      imageAlts: imageCount > 0 ? asStringArray(parsed.imageAlts, imageCount) : [],
    }
  }

  const recortar = (p: ReturnType<typeof leer>) => ({
    ...p,
    title: p.title.slice(0, 140),
    // 60 es lo que enseña Google antes de cortar con puntos suspensivos.
    seoTitle: recorteLimpio(p.seoTitle, 60),
    description: p.description.slice(0, 1400),
    seoDescription: recorteLimpio(p.seoDescription, 160),
  })

  /**
   * Dos pasadas: la primera con el modelo grande, y si el resultado no pasa la
   * revisión se repite diciéndole exactamente qué ha hecho mal. Se prefiere
   * dejar la ficha como estaba antes que publicar un pulido peor que el
   * original — por eso el último recurso devuelve `current`, no el intento
   * fallido.
   */
  let ultimo: ReturnType<typeof leer> | null = null
  let ultimosFallos: string[] = []
  /** ¿Contestó alguna vez algún modelo? Si no, es cuota, no mala redacción. */
  let hubeRespuesta = false

  for (let intento = 0; intento < 2; intento++) {
    const correccion = intento === 0 || !ultimo
      ? ''
      : `\n\nTU INTENTO ANTERIOR NO VALE. Falla en: ${ultimosFallos.join('; ')}.\nCorrígelo exactamente y respeta las longitudes pedidas.`

    const content = await callAiModel(
      [
        { role: 'system', content: 'Eres redactor SEO español de una tienda de pesca. Escribes en castellano de España impecable y respondes solo con JSON válido.' },
        { role: 'user', content: prompt + correccion },
      ],
      {
        /*
         * 900 y no 1600. Los proveedores cuentan los tokens PEDIDOS contra el
         * cupo, no los consumidos: reservar 1600 para una salida que ocupa unos
         * 600 gastaba el presupuesto diario al triple de velocidad. El tope de
         * Groq son 100.000 tokens/día, así que la diferencia es entre ~40
         * fichas al día y bastantes más.
         */
        maxTokens: 900,
        temperature: intento === 0 ? 0.5 : 0.3,
        timeoutMs: 30000,
        // El 8b es demasiado flojo para esto: inventa gramática ("¡Pescar ha
        // nunca sido tan divertido!") y llegó a devolver JSON no parseable.
        // Aquí manda calidad, no velocidad.
        models: [groq('llama-3.3-70b-versatile'), openrouter('google/gemma-4-31b-it:free'), openrouter('google/gemma-4-26b-a4b-it:free')],
      },
    )
    const parsed = parseAiJson('polish-product-seo', content)
    if (!parsed) continue
    hubeRespuesta = true

    const cand = leer(parsed)
    const fallos = seoProblems(cand, catLink)
    if (fallos.length === 0) return { ...recortar(cand), generatedBy: 'ai' }

    ultimo = cand
    ultimosFallos = fallos
    console.warn(`polish-product-seo: intento ${intento + 1} rechazado (${fallos.join('; ')}) · "${input.title.slice(0, 60)}"`)
  }

  if (!hubeRespuesta) {
    console.warn(`polish-product-seo: ningún modelo disponible · "${input.title.slice(0, 60)}"`)
    return { ...current, generatedBy: 'offline', unavailable: true }
  }
  console.warn(`polish-product-seo: se deja la ficha sin tocar · "${input.title.slice(0, 60)}"`)
  return { ...current, generatedBy: 'offline' }
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

  const content = await callAiModel(
    [
      { role: 'system', content: 'Eres un pescador experto español. Respondes solo en español, breve y concreto, sin mostrar razonamiento.' },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 400, temperature: 0.6 },
  )
  return sanitizeSpanishProse(content ?? '')
}

/**
 * Algunos modelos filtran razonamiento en voz alta (a menudo en inglés) en vez
 * de la respuesta. Quita bloques <think> y descarta lo que suene a texto de
 * planificación en inglés — el plan queda completo sin la narrativa, y una
 * fuga rompería la identidad de asesor humano.
 */
export function sanitizeSpanishProse(text: string): string {
  let t = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*?<\/think>/i, '').trim()
  const english = (t.match(/\b(the|we|let's|lets|must|should|paragraph|words|advice|craft|user|tone)\b/gi) ?? []).length
  const spanish = (t.match(/\b(el|la|los|las|de|con|para|que|una|pesca|marea|viento|agua|hora)\b/gi) ?? []).length
  if (english > 2 && english >= spanish) return ''
  if (/\b(AI|IA|inteligencia artificial|prompt|modelo de lenguaje)\b/i.test(t)) return ''
  return t.slice(0, 900).trim()
}

export interface ZoneGuideContent {
  intro: string
  species: string
  techniques: string
  seasons: string
  tips: string[]
}

const GUIDE_BANNED = /\b(AI|IA|inteligencia artificial|prompt|modelo de lenguaje|aliexpress|marketplace)\b/i

function validGuideField(t: string, min: number, max: number): boolean {
  if (t.length < min || t.length > max) return false
  if (GUIDE_BANNED.test(t)) return false
  // Fuga de razonamiento en inglés.
  const english = (t.match(/\b(the|we|let's|must|should|paragraph|words)\b/gi) ?? []).length
  const spanish = (t.match(/\b(el|la|los|las|de|con|para|que|una)\b/gi) ?? []).length
  return !(english > 2 && english >= spanish)
}

/**
 * Local fishing guide for a zone — the editorial layer over the forecast.
 * Anchored EXCLUSIVELY on the provided fact sheet: the prompt forbids invented
 * place names and species outside the list; output is validated field by field
 * (length, language, banned terms) and rejected wholesale on any failure so a
 * bad generation never ships. Returns null on failure (caller retries).
 */
export async function generateZoneGuide(facts: {
  name: string
  region: string
  waterType: 'mar' | 'interior'
  sea: string
  orientation: string | null
  tides: string
  knownFor: string
  speciesLines: string[]
  neighbors: string[]
}): Promise<ZoneGuideContent | null> {
  if (!isApiConfigured()) return null

  const prompt = `Escribe la guía local de pesca deportiva de ${facts.name} (${facts.region}, España) para la web PescaPlus.

DATOS REALES DE LA ZONA (tu ÚNICA fuente; no añadas nada que no esté aquí):
- Aguas: ${facts.sea}${facts.orientation ? `; costa orientada al ${facts.orientation}` : ''}
- Régimen de mareas: ${facts.tides}
- La zona es conocida por: ${facts.knownFor}
- Especies con su temporada y técnica: ${facts.speciesLines.join(' · ') || 'las propias de estas aguas'}
- Zonas de pesca vecinas: ${facts.neighbors.join(' y ')}

REGLAS ESTRICTAS:
1. PROHIBIDO inventar: nada de nombres de playas, espigones, puertos concretos, calles, negocios, récords ni cifras que no estén en los datos.
2. SOLO las especies listadas arriba; no menciones ninguna otra especie.
3. Español de España impecable, tono de pescador local veterano, concreto y útil. Sin relleno ni frases comodín ("paraíso de la pesca", "sin duda").
4. Cada afirmación debe apoyarse en los datos (orientación, mar, mareas, temporadas).
5. Escribe DIRECTAMENTE el JSON, sin razonamiento previo.
6. LONGITUD OBLIGATORIA: cada sección DEBE alcanzar su mínimo de palabras; si te quedas corto, desarrolla más el detalle práctico (montajes, horarios, lectura del agua). No entregues secciones breves.

Devuelve SOLO JSON válido:
{"intro": string (130-170 palabras: el carácter pesquero de la zona, sus aguas, orientación y qué la hace distinta),
"species": string (120-160 palabras: qué se pesca y en qué temporada, con detalle práctico),
"techniques": string (120-160 palabras: cómo se pesca aquí${facts.waterType === 'mar' ? ' desde orilla y desde embarcación' : ' en estas aguas interiores'}, técnicas y montajes),
"seasons": string (80-120 palabras: mejor época del año, momento del día y ${facts.waterType === 'mar' ? 'el papel de la marea' : 'el papel del nivel y la presión'}),
"tips": [4 strings (15-30 palabras cada uno): consejos prácticos de la zona, incluyendo uno de seguridad y uno de normativa/respeto]}`

  const content = await callAiModel(
    [
      { role: 'system', content: 'Eres redactor experto de pesca deportiva española. Respondes SOLO con JSON válido en español, sin mostrar razonamiento.' },
      { role: 'user', content: prompt },
    ],
    {
      maxTokens: 3200,
      temperature: 0.6,
      timeoutMs: 30000,
      // El Llama grande de Groq primero (rápido, sin razonar, 1.000/día de
      // cuota — de sobra para una guía que se genera de vez en cuando); la
      // pareja Gemma de OpenRouter como red si Groq fallara entero.
      models: [groq('llama-3.3-70b-versatile'), openrouter('google/gemma-4-31b-it:free'), openrouter('google/gemma-4-26b-a4b-it:free')],
    },
  )
  if (!content) {
    console.warn(`zone-guide ${facts.name}: sin contenido de ningún modelo`)
    return null
  }
  const parsed = extractJson(content)
  if (!parsed) {
    console.warn(`zone-guide ${facts.name}: JSON no parseable · inicio: ${content.slice(0, 160).replace(/\n/g, ' ')}`)
    return null
  }

  const g: ZoneGuideContent = {
    intro: sanitizeSpanishProse(asString(parsed.intro, '')),
    species: sanitizeSpanishProse(asString(parsed.species, '')),
    techniques: sanitizeSpanishProse(asString(parsed.techniques, '')),
    seasons: sanitizeSpanishProse(asString(parsed.seasons, '')),
    tips: Array.isArray(parsed.tips)
      ? parsed.tips.filter((t): t is string => typeof t === 'string').map((t) => sanitizeSpanishProse(t)).filter(Boolean).slice(0, 5)
      : [],
  }

  const checks: [string, boolean][] = [
    ['intro', validGuideField(g.intro, 420, 1600)],
    ['species', validGuideField(g.species, 380, 1500)],
    ['techniques', validGuideField(g.techniques, 380, 1500)],
    ['seasons', validGuideField(g.seasons, 250, 1100)],
    ['tips', g.tips.length >= 3 && g.tips.every((t) => validGuideField(t, 40, 320))],
  ]
  const failed = checks.filter(([, ok]) => !ok).map(([k]) => k)
  if (failed.length) {
    console.warn(`zone-guide ${facts.name}: validación fallida en [${failed.join(', ')}]`, {
      intro: g.intro.length, species: g.species.length, techniques: g.techniques.length,
      seasons: g.seasons.length, tips: g.tips.map((t) => t.length),
    })
    return null
  }
  return g
}


// ---------------------------------------------------------------------------
// Identificación de especie a partir de una foto
// ---------------------------------------------------------------------------

export interface SpeciesCandidate {
  speciesId: string
  name: string
  /** 0-100. Es la seguridad que declara el modelo, no una probabilidad medida. */
  score: number
  /** Qué ha visto para decirlo ("banda dorada entre los ojos"). */
  evidence: string
}

export interface SpeciesIdResult {
  /** Candidatos de más a menos probable, ya validados contra el catálogo. */
  candidates: SpeciesCandidate[]
  /** Los dos modelos coincidieron en el primero. Sube mucho la fiabilidad. */
  agreement: boolean
}

/** Contexto opcional: pesa en el desempate, NUNCA descarta un candidato. */
export interface SpeciesIdContext {
  /** Nombre del mar/zona ("Mediterráneo", "Cantábrico", "aguas de Canarias"). */
  seaName?: string | null
  /** Mes 1-12 de la captura. */
  month?: number | null
}

/** Una pasada de identificación contra un modelo con visión. */
async function askVision(
  imageDataUrl: string,
  guide: string,
  ctx: SpeciesIdContext,
  model: ModelRef,
): Promise<{ id: string; score: number; evidence: string }[] | null> {
  const donde = ctx.seaName ? `\nDÓNDE se ha pescado: ${ctx.seaName}.` : ''
  const cuando = ctx.month ? `\nMES: ${ctx.month} (1=enero, 12=diciembre).` : ''
  const contexto = donde || cuando
    ? `${donde}${cuando}
Usa esto SOLO para desempatar entre candidatos que se parezcan: si dos encajan visualmente igual, prefiere la más propia de esa zona y esa época. Si lo que ves es claramente otra especie, dilo IGUALMENTE — el contexto no manda sobre la foto.`
    : ''

  const content = await callAiModel(
    [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Eres un ictiólogo identificando una captura de pesca en España a partir de una foto.

GUÍA DE CAMPO (rasgos que separan cada especie de sus parecidas):
${guide}
${contexto}

CÓMO TRABAJAR:
1. Fíjate primero en la FORMA del cuerpo y el tipo de animal (pez alargado, pez alto y comprimido, pez plano, cefalópodo, anguiliforme).
2. Después busca las marcas concretas de la guía: barras verticales, banda dorada entre los ojos, número de aletas dorsales, dientes, escudetes en la línea lateral, líneas onduladas del dorso.
3. Si la foto no permite ver la marca que decide entre dos especies parecidas, dilo bajando la seguridad — no adivines.

Devuelve los 3 candidatos más probables, de mayor a menor, SOLO con ids de la guía.
Devuelve SOLO JSON válido:
{"candidatos": [{"id": "<id>", "seguridad": <0-100>, "evidencia": "<qué has visto, máximo 12 palabras>"}]}

Si en la foto no hay ningún animal de la guía, devuelve {"candidatos": []}.`,
          },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      } as unknown as ChatMessage,
    ],
    { maxTokens: 700, temperature: 0.1, timeoutMs: 40000, models: [model] },
  )

  const parsed = parseAiJson(`identify-species:${model.model}`, content)
  if (!parsed) return null
  const raw = Array.isArray(parsed.candidatos) ? parsed.candidatos : []
  return raw
    .map((c) => {
      const o = (c ?? {}) as Record<string, unknown>
      return {
        id: typeof o.id === 'string' ? o.id.trim() : '',
        score: Math.max(0, Math.min(100, Number(o.seguridad) || 0)),
        evidence: typeof o.evidencia === 'string' ? o.evidencia.trim().slice(0, 90) : '',
      }
    })
    .filter((c) => c.id)
}

/**
 * Qué especie hay en una foto de captura.
 *
 * Tres cosas la hacen bastante más fiable que preguntar "¿qué pez es?":
 *
 *  1. GUÍA DE CAMPO. Se le pasan los `idTraits` de cada especie, redactados
 *     para separar las que se confunden. Medido con fotos degradadas, dar solo
 *     la lista de nombres acertaba el 69% y TODOS los fallos eran confusiones
 *     de familia (breca→dorada, herrera→sargo, corvina→lubina).
 *  2. DOS MODELOS. Se pregunta a dos y se suman sus puntuaciones. Cuando
 *     coinciden en el primero (`agreement`), la respuesta es mucho más
 *     fiable, y eso se le puede decir al pescador.
 *  3. CONTEXTO COMO PESO, NO COMO FILTRO. La zona y el mes desempatan entre
 *     parecidas, pero jamás descartan un candidato: el catálogo de especies
 *     por zona está limitado a 6 y curado para páginas de destino, así que
 *     usarlo para filtrar impediría reconocer una captura legítima que no
 *     estuviera en esa lista.
 *
 * SIGUE SIENDO UNA SUGERENCIA que confirma el pescador, y no decide nada legal
 * (talla mínima, especie protegida): eso se consulta en la fuente oficial.
 *
 * `imageDataUrl` debe venir ya reducida (~640 px): con la foto original el
 * proveedor gratuito devuelve 429.
 */
export async function identifySpecies(
  imageDataUrl: string,
  ctx: SpeciesIdContext = {},
): Promise<SpeciesIdResult | null> {
  if (!isApiConfigured()) return null
  if (!/^data:image\/(jpe?g|png|webp);base64,/i.test(imageDataUrl)) return null

  const { SEA_SPECIES } = await import('@/lib/fishing-species')
  const guide = SEA_SPECIES.map((s) => `${s.id} (${s.name}): ${s.idTraits}`).join('\n')

  /*
   * SEGUNDA OPINIÓN SOLO CUANDO HACE FALTA.
   *
   * Los dos Gemma son los únicos gratuitos que aceptan imagen y aciertan (el
   * `nemotron-nano-12b-v2-vl` confundió una lubina con un pez espada). La
   * tentación es preguntar a los dos siempre y sumar, pero eso DUPLICA el
   * consumo y el pool gratuito devuelve 429 con facilidad — medido: 60
   * llamadas seguidas lo agotan. Así que se pregunta al segundo solo si el
   * primero duda, que es justo cuando una segunda opinión aporta algo. Con una
   * foto clara se resuelve con una sola llamada.
   */
  const SEGURO = 80
  const a = await askVision(imageDataUrl, guide, ctx, openrouter('google/gemma-4-31b-it:free'))
  const dudaA = !a || a.length === 0 || (a[0]?.score ?? 0) < SEGURO
  const b = dudaA
    ? await askVision(imageDataUrl, guide, ctx, openrouter('google/gemma-4-26b-a4b-it:free'))
    : null

  // Ningún modelo contestó: es un fallo técnico (cuota, red), NO "no la
  // reconozco". Quien llama debe poder distinguirlo para no mentir al usuario.
  if (!a && !b) return null

  // Se suman las puntuaciones de ambos; un id que solo conoce uno sigue
  // contando, pero pesa la mitad que uno en el que coinciden los dos.
  const pool = new Map<string, { score: number; votos: number; evidence: string }>()
  for (const lista of [a, b]) {
    for (const c of lista ?? []) {
      const sp = SEA_SPECIES.find((s) => s.id === c.id)
      if (!sp) continue // id inventado: fuera
      const e = pool.get(sp.id) ?? { score: 0, votos: 0, evidence: '' }
      e.score += c.score
      e.votos += 1
      if (!e.evidence && c.evidence) e.evidence = c.evidence
      pool.set(sp.id, e)
    }
  }
  if (pool.size === 0) return { candidates: [], agreement: false }

  const candidates = [...pool.entries()]
    .sort((x, y) => y[1].score - x[1].score)
    .slice(0, 3)
    .map(([id, e]) => {
      const sp = SEA_SPECIES.find((s) => s.id === id)!
      return {
        speciesId: id,
        name: sp.name,
        score: Math.round(e.score / Math.max(1, e.votos)),
        evidence: e.evidence,
      }
    })

  const primeroA = (a ?? [])[0]?.id
  const primeroB = (b ?? [])[0]?.id
  const agreement = Boolean(primeroA && primeroB && primeroA === primeroB)

  return { candidates, agreement }
}
