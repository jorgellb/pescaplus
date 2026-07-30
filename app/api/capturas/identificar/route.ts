import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { identifySpecies } from '@/lib/openrouter-ai'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const maxDuration = 60

/**
 * Tope de tamaño de la foto.
 *
 * El cliente la reduce a ~640 px antes de enviarla (unos 40 KB en base64), así
 * que 400 KB deja margen de sobra para móviles con cámaras raras. Se corta aquí
 * igualmente: sin tope, una foto de 12 MP en base64 son ~16 MB por petición, y
 * además el proveedor gratuito responde 429 con imágenes grandes.
 */
const MAX_CHARS = 400_000

const schema = z.object({
  image: z.string().min(64).max(MAX_CHARS),
  // Contexto opcional: desempata entre especies parecidas, nunca filtra.
  spotSlug: z.string().max(80).optional(),
  month: z.number().int().min(1).max(12).optional(),
})

/**
 * Sugiere qué especie hay en una foto de captura.
 *
 * La foto se usa y se descarta: no se guarda en disco ni en base de datos, y no
 * se asocia a ninguna cuenta. Lo único que sale de aquí es un id de especie.
 *
 * Es una SUGERENCIA para ahorrarle al pescador buscar en una lista de 29; la
 * confirma él. No decide nada legal.
 */
export async function POST(request: NextRequest) {
  // La identificación cuesta una llamada a un modelo con visión y la cuota
  // gratuita es finita: 20 por hora y IP es de sobra para apuntar una jornada.
  const limit = rateLimit(`identificar:${clientIp(request)}`, 20, 60 * 60_000)
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: 'Has identificado muchas fotos seguidas. Espera un rato.' },
      { status: 429 },
    )
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Foto no válida o demasiado grande.' }, { status: 400 })
  }

  try {
    // La zona da el mar, que es el contexto útil ("Cantábrico" pesa distinto
    // que "Canarias"). Si el slug no existe, se ignora sin más.
    let seaName: string | null = null
    if (parsed.data.spotSlug) {
      const { getSpot } = await import('@/lib/fishing-spots')
      const { seaName: nombreDelMar } = await import('@/lib/zone-facts')
      const spot = getSpot(parsed.data.spotSlug)
      if (spot) seaName = nombreDelMar(spot)
    }

    const result = await identifySpecies(parsed.data.image, { seaName, month: parsed.data.month })

    /*
     * Se distinguen DOS cosas que antes se confundían:
     *  - `null`: ningún modelo contestó (cuota agotada, red). Decirle al
     *    pescador "no la reconozco" sería mentira: no se ha llegado a mirar.
     *  - lista vacía: los modelos SÍ miraron y no ven nada de la guía. Eso sí
     *    es "no la reconozco", y es una respuesta correcta.
     */
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'El identificador no está disponible ahora mismo. Inténtalo en un minuto.' },
        { status: 503 },
      )
    }
    if (result.candidates.length === 0) {
      return NextResponse.json({ success: true, result: null })
    }
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Error identificando la especie:', error)
    return NextResponse.json({ success: false, error: 'No se ha podido identificar.' }, { status: 500 })
  }
}
