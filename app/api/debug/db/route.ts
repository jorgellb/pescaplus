import { NextRequest, NextResponse } from 'next/server'

// TEMPORAL — diagnóstico de conexión a la BD. Borrar tras usar.
// No expone secretos: solo estado, host, longitud del CA y el mensaje de error.
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('key') !== 'diag2026') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const url = process.env.DATABASE_URL || ''
  const info: Record<string, unknown> = {
    configured: /^postgres(ql)?:\/\//.test(url),
    host: (url.match(/@([^/:]+)/) || [])[1] || null,
    port: (url.match(/:(\d+)\//) || [])[1] || null,
    urlHasSslmode: /sslmode/i.test(url),
    hasCaCert: !!process.env.DATABASE_CA_CERT,
    caCertLen: process.env.DATABASE_CA_CERT?.length ?? 0,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
  }
  try {
    const { prisma } = await import('@/lib/prisma')
    const r = (await prisma.$queryRawUnsafe('SELECT 1 AS ok')) as unknown
    info.dbOk = true
    info.result = r
  } catch (e) {
    info.dbOk = false
    info.error = String((e as Error)?.message || e).slice(0, 400)
  }
  return NextResponse.json(info)
}
