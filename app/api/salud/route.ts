import { NextResponse } from 'next/server'
import { photosStorageState, dirStorageState, imageCacheDir } from '@/lib/photos'

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
    // Almacenamiento de las fotos de los barcos. «efimero» significa que la
    // carpeta NO está en un volumen: se puede escribir, pero el próximo
    // despliegue se lleva las fotos por delante sin dar ningún error. Tampoco
    // tumba el health check — el sitio funciona igual — pero así se ve antes de
    // perder nada. Ver lib/photos.ts.
    fotos: photosStorageState(),
    // Lo mismo para la caché de imágenes optimizadas, que NO tiene volumen
    // todavía. «efimero» aquí no pierde datos —se regeneran— pero cuesta caro:
    // ~2 s por foto, y /especies tiene 29, así que la primera visita tras cada
    // despliegue se arrastra. «ok» significa que el volumen está montado y bien.
    imagenes: dirStorageState(imageCacheDir()),
    ms: Date.now() - inicio,
    hora: new Date().toISOString(),
  })
}
