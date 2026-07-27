import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { listUserCatchesWithContext } from '@/lib/catch-reports'
import { patrones, MIN_MUESTRAS } from '@/lib/catch-patterns'

/**
 * Con qué condiciones pican TUS especies.
 *
 * Es tuyo y solo tuyo: sale de tus capturas, incluye dónde pescas y con qué
 * marea sales. No hay listado global ni forma de ver el de nadie más.
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Inicia sesión.' }, { status: 401 })

  const capturas = await listUserCatchesWithContext(user.id)
  const encontrados = patrones(capturas)

  // Cuántas capturas hay de cada especie, tengan patrón o no: así se puede
  // decir "te faltan 2 lubinas" en vez de dejar un hueco sin explicación.
  const cuenta: Record<string, number> = {}
  for (const c of capturas) cuenta[c.speciesId] = (cuenta[c.speciesId] ?? 0) + 1

  return NextResponse.json(
    { success: true, minimo: MIN_MUESTRAS, selladas: capturas.length, cuenta, patrones: encontrados },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
