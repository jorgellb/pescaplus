import { NextResponse } from 'next/server'
import { join } from 'node:path'
import { ownPhotoPath, photosDir, PHOTO_TYPES } from '@/lib/photos'

/**
 * Sirve las fotos de los barcos desde el disco del servidor.
 *
 * Vive fuera de `public/` a propósito: `public/` se hornea dentro de la imagen
 * del contenedor, así que lo que subiera un patrón desaparecería en el
 * siguiente despliegue. Estas viven en un volumen, y por eso hay que servirlas
 * con una ruta en vez de dejárselas al servidor de ficheros estáticos.
 *
 * SEGURIDAD: la ruta que pide el navegador es entrada del usuario y acaba
 * convertida en una ruta de disco, que es la receta clásica del path traversal.
 * Toda la validación está en `ownPhotoPath`, que solo acepta exactamente la
 * forma que generamos nosotros —dos segmentos, nombre con marca de tiempo y una
 * extensión de la lista blanca— y comprueba además que la ruta resuelta siga
 * dentro de la carpeta. Ni `..`, ni subcarpetas, ni SVG (que puede llevar
 * scripts dentro).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ ruta: string[] }> }) {
  const { ruta } = await params
  const rel = ownPhotoPath(`/fotos/${ruta.join('/')}`)
  if (!rel) return new NextResponse('No encontrada', { status: 404 })

  try {
    const { readFile } = await import('node:fs/promises')
    const datos = await readFile(join(photosDir(), rel))
    const ext = rel.slice(rel.lastIndexOf('.') + 1)
    return new NextResponse(new Uint8Array(datos), {
      headers: {
        'Content-Type': PHOTO_TYPES[ext] ?? 'application/octet-stream',
        // El nombre lleva marca de tiempo y es único, así que el fichero nunca
        // cambia de contenido: se puede cachear para siempre.
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Que el navegador no intente adivinar el tipo pese a la lista blanca.
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new NextResponse('No encontrada', { status: 404 })
  }
}
