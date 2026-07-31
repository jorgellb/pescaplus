import { NextResponse } from 'next/server'

/** Siempre en vivo: un estado cacheado no dice nada de si el servidor responde. */
export const dynamic = 'force-dynamic'

/**
 * Señal de vida para el orquestador (Coolify, Docker, un balanceador…).
 *
 * Comprueba DOS cosas distintas a propósito:
 *
 *  - Que el proceso responde (si esta ruta contesta, Next está en pie).
 *  - Que la base de datos contesta, informativo y con tope de tiempo.
 *
 * La base de datos NO tumba el health check, y es deliberado: si Aiven tiene un
 * hipo de diez segundos, tirar el contenedor y reiniciarlo empeora las cosas —
 * el sitio sigue sirviendo páginas cacheadas perfectamente durante ese rato.
 * Solo se devuelve 503 si el proceso está roto de verdad.
 */
export async function GET() {
  const inicio = Date.now()
  let bd: 'ok' | 'lenta' | 'caida' | 'sin-configurar' = 'sin-configurar'

  if (process.env.DATABASE_URL) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, rechaza) => setTimeout(() => rechaza(new Error('timeout')), 3000)),
      ])
      bd = Date.now() - inicio > 1000 ? 'lenta' : 'ok'
    } catch {
      bd = 'caida'
    }
  }

  return NextResponse.json({
    ok: true,
    bd,
    ms: Date.now() - inicio,
    hora: new Date().toISOString(),
  })
}
