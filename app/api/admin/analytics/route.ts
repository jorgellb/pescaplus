import { NextResponse, type NextRequest } from 'next/server'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { getClickStats } from '@/lib/clicks-store'
import { analiticaCompleta, embudo } from '@/lib/analytics-queries'

export const dynamic = 'force-dynamic'

/** Ventanas que ofrece el panel. Se valida contra la lista para que nadie pida
 *  10.000 días y se lleve por delante la base de datos con un solo GET. */
const VENTANAS = [1, 7, 30, 90]

export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const pedidos = Number(request.nextUrl.searchParams.get('dias'))
  const dias = VENTANAS.includes(pedidos) ? pedidos : 30

  /*
   * `stats` es la analítica vieja de ProductClick y se mantiene: lleva meses
   * acumulando clics y el registro de eventos empieza vacío. Convivirán hasta
   * que `Event` tenga historia suficiente.
   */
  const [stats, analitica, recorrido] = await Promise.all([
    getClickStats(),
    analiticaCompleta(dias),
    embudo(dias),
  ])
  return NextResponse.json({ success: true, stats, analitica, recorrido })
}
