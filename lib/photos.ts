/**
 * Fotos de los barcos, guardadas en el disco del propio servidor.
 *
 * Antes esto iba a Vercel Blob, que era la última atadura que quedaba con
 * Vercel. Ya no: el sitio corre en una máquina propia con 86 GB libres, así que
 * las fotos se guardan ahí y se sirven desde `/fotos/...`.
 *
 * Como en Resend o Stripe, la función se degrada en vez de romperse: si la
 * carpeta no se puede escribir, la subida se rechaza con un mensaje claro y el
 * patrón puede seguir pegando la dirección de una imagen.
 *
 * Las imágenes se redimensionan en el navegador antes de llegar aquí (lado
 * largo <= 1600 px, JPEG), así que no almacenamos originales de 8 megapíxeles.
 *
 * OJO CON EL VOLUMEN: dentro de un contenedor, escribir en una carpeta que no
 * esté montada como volumen funciona... hasta el siguiente despliegue, que se
 * lleva las fotos por delante sin dar ningún error. `photosStorageState()` lo
 * detecta comparando el dispositivo de la carpeta con el de la raíz, y
 * /api/salud lo publica para que se vea antes de perder nada.
 */
import { join, resolve, sep } from 'node:path'
import { mkdirSync, accessSync, statSync, constants } from 'node:fs'

export const MAX_PHOTOS = 8
const MAX_BYTES = 3 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Extensiones que servimos, y su tipo. Lista blanca: nada de SVG ni HTML. */
export const PHOTO_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** Prefijo público. Lo sirve app/fotos/[...ruta]/route.ts. */
export const PHOTOS_URL_PREFIX = '/fotos'

/**
 * Carpeta donde viven las fotos. En el contenedor la fija el Dockerfile a
 * /app/datos/fotos, que es el punto de montaje del volumen; en desarrollo cae
 * en .datos/fotos, dentro del proyecto y fuera de git.
 */
export function photosDir(): string {
  return resolve(process.env.PHOTOS_DIR || join(process.cwd(), '.datos', 'fotos'))
}

export type PhotosStorageState = 'ok' | 'efimero' | 'no-escribible'

/**
 * Estado del almacenamiento, para /api/salud.
 *
 * - `ok`: se puede escribir y está en un dispositivo distinto de la raíz, es
 *   decir, en un volumen de verdad.
 * - `efimero`: se puede escribir, pero está en el sistema de ficheros del
 *   contenedor. **Las fotos se perderán en el próximo despliegue.**
 * - `no-escribible`: no hay dónde guardar; la subida queda desactivada.
 */
export function photosStorageState(): PhotosStorageState {
  return dirStorageState(photosDir())
}

/**
 * La misma comprobación, para cualquier carpeta que deba vivir en un volumen.
 *
 * Se separó de `photosStorageState()` al montar la caché de imágenes: la
 * pregunta —«¿esto es un volumen de verdad o se lo lleva el próximo
 * despliegue?»— es idéntica, y la respuesta se saca igual, comparando el
 * dispositivo de la carpeta con el de la raíz.
 */
export function dirStorageState(dir: string): PhotosStorageState {
  try {
    mkdirSync(dir, { recursive: true })
    accessSync(dir, constants.W_OK)
    // Un volumen montado es otro dispositivo. Si coincide con el de la raíz,
    // estamos escribiendo dentro del contenedor y esto no sobrevive al deploy.
    if (process.env.NODE_ENV === 'production' && statSync(dir).dev === statSync('/').dev) return 'efimero'
    return 'ok'
  } catch {
    return 'no-escribible'
  }
}

/**
 * Dónde guarda Next las fotos ya convertidas a AVIF/WebP.
 *
 * Convertir cuesta ~2 s por foto en este servidor y varias a la vez se estorban,
 * así que si esta carpeta no es un volumen, cada despliegue borra el trabajo y la
 * primera visita a /especies vuelve a convertir las 29. La ruta la fija Next; en
 * el contenedor `cwd` es /app.
 */
export function imageCacheDir(): string {
  return join(process.cwd(), '.next', 'cache', 'images')
}

export function uploadsEnabled(): boolean {
  return photosStorageState() !== 'no-escribible'
}

export interface UploadResult {
  ok: boolean
  url?: string
  error?: string
}

/** Solo lo que podemos poner nosotros en un nombre de fichero. */
function safeSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 64)
}

export async function uploadPhoto(file: File, operatorId: string): Promise<UploadResult> {
  if (!uploadsEnabled()) {
    return { ok: false, error: 'La subida de fotos no está disponible ahora mismo. Pega la dirección de una imagen mientras tanto.' }
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: 'Formato no admitido. Usa JPG, PNG o WebP.' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'La imagen pesa demasiado (máx. 3 MB).' }
  }
  const carpeta = safeSegment(operatorId)
  if (!carpeta) return { ok: false, error: 'Operador no válido.' }

  try {
    const { mkdir, writeFile } = await import('node:fs/promises')
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const destino = join(photosDir(), carpeta)
    await mkdir(destino, { recursive: true })
    await writeFile(join(destino, nombre), Buffer.from(await file.arrayBuffer()))
    return { ok: true, url: `${PHOTOS_URL_PREFIX}/${carpeta}/${nombre}` }
  } catch (error) {
    console.error('Photo upload failed:', error)
    return { ok: false, error: 'No se pudo subir la foto. Inténtalo de nuevo.' }
  }
}

/** Borra una foto nuestra. Nunca lanza: una URL huérfana no debe bloquear la edición. */
export async function deletePhoto(url: string): Promise<void> {
  const rel = ownPhotoPath(url)
  if (!rel) return
  try {
    const { unlink } = await import('node:fs/promises')
    await unlink(join(photosDir(), rel))
  } catch (error) {
    console.warn('Photo delete failed:', error)
  }
}

/**
 * Convierte una URL nuestra en su ruta dentro de la carpeta de fotos, o
 * devuelve null si no es nuestra.
 *
 * Es la única puerta por la que se traduce una entrada del usuario a una ruta
 * de disco, así que aquí se es estricto: dos segmentos, con la forma que
 * generamos nosotros y una extensión de la lista blanca. Sin `..`, sin
 * subcarpetas y sin barras extra, no hay forma de salirse de la carpeta.
 */
export function ownPhotoPath(url: string): string | null {
  const m = /^\/fotos\/([a-z0-9-]{1,64})\/(\d{10,}-[a-z0-9]{1,12}\.(?:jpg|png|webp))$/.exec(url)
  if (!m) return null
  const rel = `${m[1]}${sep}${m[2]}`
  // Cinturón y tirantes: el resultado tiene que seguir dentro de la carpeta.
  const abs = resolve(photosDir(), rel)
  return abs.startsWith(photosDir() + sep) ? rel : null
}

/** True si la foto la alojamos nosotros (o sea, si podemos borrarla). */
export function isOwnPhotoUrl(url: string): boolean {
  return ownPhotoPath(url) !== null
}

/**
 * Acepta la dirección de una foto: o una nuestra, o una https escrita por el
 * patrón. Nunca un `javascript:` ni un `data:` disfrazado de enlace.
 */
export function isValidPhotoUrl(url: string): boolean {
  if (isOwnPhotoUrl(url)) return true
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname.length > 3
  } catch {
    return false
  }
}

export function sanitizePhotos(urls: unknown): string[] {
  if (!Array.isArray(urls)) return []
  return [...new Set(urls.filter((u): u is string => typeof u === 'string' && isValidPhotoUrl(u)))].slice(0, MAX_PHOTOS)
}
