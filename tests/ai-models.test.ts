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
  it('el chat pregunta primero a Groq gpt-oss-120b con razonamiento bajo', async () => {
    interceptar(() => Response.json({ choices: [{ message: { content: 'Usa un minnow de 12 cm.' } }] }))
    const { chatWithFishingExpert } = await cargar()

    const respuesta = await chatWithFishingExpert([{ role: 'user', content: '¿Qué señuelo para lubina?' }])

    expect(respuesta).toBe('Usa un minnow de 12 cm.')
    expect(peticiones[0].url).toContain('api.groq.com')
    expect(peticiones[0].body.model).toBe('openai/gpt-oss-120b')
    expect(peticiones[0].body.reasoning_effort).toBe('low')
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
