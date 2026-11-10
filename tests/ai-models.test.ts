import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * La cadena de modelos de IA.
 *
 * El 2026-11-10 el asistente dejó de responder sin ningún error visible: Groq
 * retiró sus dos Llama, NVIDIA su llama-3.3-70b y OpenRouter los nemotron-nano
 * gratis, así que TODA la cadena caía al experto offline. Estas pruebas fijan
 * dos cosas:
 *  - que ningún modelo retirado vuelve a colarse en una cadena;
 *  - que los gpt-oss de Groq se piden SIEMPRE con `reasoning_effort: 'low'`.
 *    Sin eso gastan todo el presupuesto pensando y devuelven el JSON vacío
 *    (medido: 898 de 900 tokens en razonar).
 */

const RETIRADOS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'meta/llama-3.3-70b-instruct',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'nvidia/nemotron-nano-9b-v2:free',
]

interface Peticion {
  url: string
  body: Record<string, unknown>
}

let peticiones: Peticion[] = []

/** Sustituye `fetch`: guarda cada petición y responde lo que diga `responder`. */
function interceptar(responder: (p: Peticion) => Response) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const p = { url: String(url), body: JSON.parse(String(init?.body ?? '{}')) }
    peticiones.push(p)
    return responder(p)
  }))
}

const noExiste = () => new Response('{"error":{"code":"model_not_found"}}', { status: 404 })

/** Lo que devuelve OpenRouter al gastar las 50 peticiones/día gratis: sin retry-after, con el reinicio en ms. */
const cupoDiarioAgotado = () => new Response(
  '{"error":{"message":"Rate limit exceeded: free-models-per-day","code":429}}',
  { status: 429, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Date.now() + 5 * 3600_000) } },
)

const respuesta = (texto: string) => Response.json({ choices: [{ message: { content: texto } }] })

const flujo = (texto: string) => new Response(
  `data: ${JSON.stringify({ choices: [{ delta: { content: texto } }] })}\n\ndata: [DONE]\n\n`,
  { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
)

const aOpenRouter = (p: Peticion) => p.url.includes('openrouter.ai')

/** El módulo lee las claves al cargarse, así que se importa de nuevo con ellas puestas. */
async function cargar() {
  vi.resetModules()
  return import('@/lib/openrouter-ai')
}

beforeEach(() => {
  peticiones = []
  vi.stubEnv('GROQ_API_KEY', 'test-groq')
  vi.stubEnv('OPENROUTER_API_KEY', 'test-openrouter')
  vi.stubEnv('NVIDIA_API_KEY', 'test-nvidia')
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function comprobarCadena() {
  expect(peticiones.length).toBeGreaterThan(0)
  for (const p of peticiones) {
    expect(RETIRADOS, `modelo retirado en ${p.url}`).not.toContain(p.body.model)
    if (String(p.body.model).startsWith('openai/gpt-oss')) {
      expect(p.body.reasoning_effort, `${p.body.model} sin reasoning_effort`).toBe('low')
    }
  }
}

describe('cadena de modelos de IA', () => {
  it('el chat pregunta primero a OpenRouter con un modelo gratuito', async () => {
    interceptar(() => respuesta('Usa un minnow de 12 cm.'))
    const { chatWithFishingExpert } = await cargar()

    const texto = await chatWithFishingExpert([{ role: 'user', content: '¿Qué señuelo para lubina?' }])

    expect(texto).toBe('Usa un minnow de 12 cm.')
    expect(peticiones[0].url).toContain('openrouter.ai')
    expect(String(peticiones[0].body.model)).toMatch(/:free$/)
  })

  it('detrás de OpenRouter va Groq gpt-oss-120b con razonamiento bajo', async () => {
    interceptar((p) => (aOpenRouter(p) ? noExiste() : respuesta('Vinilo de 10 cm.')))
    const { chatWithFishingExpert } = await cargar()

    expect(await chatWithFishingExpert([{ role: 'user', content: 'hola' }])).toBe('Vinilo de 10 cm.')
    const primeraDeGroq = peticiones.find((p) => p.url.includes('api.groq.com'))
    expect(primeraDeGroq?.body.model).toBe('openai/gpt-oss-120b')
    expect(primeraDeGroq?.body.reasoning_effort).toBe('low')
  })

  it('con el cupo diario de OpenRouter agotado pasa a Groq al momento y no vuelve a preguntar', async () => {
    interceptar((p) => (aOpenRouter(p) ? cupoDiarioAgotado() : respuesta('Respuesta de Groq.')))
    const { chatWithFishingExpert } = await cargar()

    const t0 = Date.now()
    expect(await chatWithFishingExpert([{ role: 'user', content: 'hola' }])).toBe('Respuesta de Groq.')
    expect(Date.now() - t0).toBeLessThan(1000) // antes esperaba 3 s por modelo antes de rendirse
    // El cupo gratis es de toda la cuenta: con un 429 basta para saltarse los dos Gemma.
    expect(peticiones.filter(aOpenRouter)).toHaveLength(1)

    peticiones = []
    expect(await chatWithFishingExpert([{ role: 'user', content: 'otra' }])).toBe('Respuesta de Groq.')
    expect(peticiones.filter(aOpenRouter)).toHaveLength(0)
  })

  it('un 429 de un momento sí espera y reintenta el mismo modelo', async () => {
    let primera = true
    interceptar(() => {
      if (!primera) return respuesta('Ya va.')
      primera = false
      return new Response('{}', { status: 429, headers: { 'retry-after': '1' } })
    })
    const { chatWithFishingExpert } = await cargar()

    expect(await chatWithFishingExpert([{ role: 'user', content: 'hola' }])).toBe('Ya va.')
    expect(peticiones).toHaveLength(2)
    expect(peticiones[1].body.model).toBe(peticiones[0].body.model)
  })

  it('el chat en streaming también se salta OpenRouter con el cupo agotado', async () => {
    interceptar((p) => (aOpenRouter(p) ? cupoDiarioAgotado() : flujo('Hola desde Groq')))
    const { streamFishingExpert } = await cargar()

    let texto = ''
    for await (const trozo of streamFishingExpert([{ role: 'user', content: 'hola' }])) texto += trozo
    expect(texto).toBe('Hola desde Groq')
    expect(peticiones.filter(aOpenRouter)).toHaveLength(1)

    peticiones = []
    for await (const trozo of streamFishingExpert([{ role: 'user', content: 'otra' }])) void trozo
    expect(peticiones.filter(aOpenRouter)).toHaveLength(0)
  })

  it('las fichas SEO no preguntan dos veces al mismo modelo', async () => {
    interceptar(noExiste)
    const { generateSeoListing, rewriteProductCopy } = await cargar()
    for (const llamar of [
      () => generateSeoListing({ originalTitle: 'Vinilo shad 10cm', typeFishing: 'spinning' }),
      () => rewriteProductCopy({ instruction: 'más corto', title: 'Vinilo', description: 'Vinilo para lubina.' }),
    ]) {
      peticiones = []
      await llamar()
      const modelos = peticiones.map((p) => `${p.url} ${p.body.model}`)
      expect(new Set(modelos).size).toBe(modelos.length)
    }
  })

  it('identificar una captura tira de NVIDIA si OpenRouter no tiene cupo', async () => {
    interceptar((p) => (aOpenRouter(p)
      ? cupoDiarioAgotado()
      : respuesta('```json\n{"candidatos": [{"id": "lubina", "seguridad": 95, "evidencia": "cuerpo plateado"}]}\n```')))
    const { identifySpecies } = await cargar()

    const r = await identifySpecies('data:image/jpeg;base64,AAAA')
    expect(r?.candidates[0]?.speciesId).toBe('lubina')
    expect(peticiones.some((p) => p.url.includes('nvidia.com'))).toBe(true)
  })

  it('el chat no prueba ningún modelo retirado aunque todos fallen', async () => {
    interceptar(noExiste)
    const { chatWithFishingExpert } = await cargar()
    await chatWithFishingExpert([{ role: 'user', content: 'hola' }])
    comprobarCadena()
  })

  it('el chat en streaming no prueba ningún modelo retirado', async () => {
    interceptar(noExiste)
    const { streamFishingExpert } = await cargar()
    const gen = streamFishingExpert([{ role: 'user', content: 'hola' }])
    await gen.next() // basta con que recorra la cadena y caiga al experto offline
    await gen.return(undefined)
    comprobarCadena()
  })

  it('crear ficha y pulir SEO no prueban ningún modelo retirado', async () => {
    interceptar(noExiste)
    const { generateProductDraft, polishProductSeo } = await cargar()
    await generateProductDraft('vinilo shad 10 cm', 'spinning')
    await polishProductSeo({ title: 'Vinilo shad 10 cm', description: 'Vinilo para lubina.', typeFishing: 'spinning' })
    comprobarCadena()
    // El pulido mantiene un cupo de NVIDIA aparte del de Groq y OpenRouter.
    expect(peticiones.some((p) => p.url.includes('nvidia.com'))).toBe(true)
  })
})
