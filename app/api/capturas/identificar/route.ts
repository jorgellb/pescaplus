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
    const guess = await identifySpecies(parsed.data.image)
    if (!guess) {
      // No es un error: el modelo puede no reconocerla, y decirlo es correcto.
      return NextResponse.json({ success: true, guess: null })
    }
    return NextResponse.json({ success: true, guess })
  } catch (error) {
    console.error('Error identificando la especie:', error)
    return NextResponse.json({ success: false, error: 'No se ha podido identificar.' }, { status: 500 })
  }
}
