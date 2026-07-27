import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserFromRequest } from '@/lib/auth'
import { createWaypoint } from '@/lib/waypoints-store'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Importa marcas ya interpretadas en el navegador.
 *
 * El fichero se lee en el cliente para poder enseñar qué trae antes de tocar
 * nada. Aquí llega la lista, y aquí se vuelve a validar: que el navegador ya lo
 * haya mirado no es motivo para fiarse de lo que manda.
 */
const marca = z.object({
  name: z.string().min(1).max(80),
  type: z.string().max(20).optional(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  depthM: z.number().min(0).max(11000).nullable().optional(),
  notes: z.string().max(500).optional(),
})

const schema = z.object({ waypoints: z.array(marca).min(1).max(5000) })

export async function POST(request: NextRequest) {
  const limit = rateLimit(`import:${clientIp(request)}`, 20, 60 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiadas importaciones seguidas.' }, { status: 429 })
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })

  let imported = 0
  const errors: string[] = []
  for (const wp of parsed.data.waypoints) {
    try {
      // Lo importado entra SIEMPRE como privado, diga lo que diga el fichero.
      await createWaypoint(user.id, { ...wp, visibility: 'private' })
      imported += 1
    } catch (error) {
      // Una marca mala no aborta el lote: perder 300 marcas buenas por una
      // corrupta sería el peor resultado posible.
      if (errors.length < 5) errors.push(`${wp.name}: ${(error as Error).message}`)
    }
  }
  return NextResponse.json({ success: true, imported, found: parsed.data.waypoints.length, errors })
}
