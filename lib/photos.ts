/**
 * Boat photo storage on Vercel Blob.
 *
 * Like Resend and Stripe elsewhere in this app, the feature degrades instead of
 * breaking: without BLOB_READ_WRITE_TOKEN uploads are refused with a clear
 * message and the patrón can still paste an image URL, so listings can have
 * photos from day one and gain real uploads the moment the token is set.
 *
 * Files are resized client-side before they get here (long edge ≤ 1600 px,
 * JPEG), so the payload stays well under Vercel's 4.5 MB request body limit and
 * we don't pay to store 8 MP phone originals.
 */
export const MAX_PHOTOS = 8
const MAX_BYTES = 3 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Find the Blob read-write token.
 *
 * The SDK defaults to `BLOB_READ_WRITE_TOKEN`, but Vercel lets you pick an
 * environment-variable PREFIX when connecting a store to a project, in which
 * case the var is `<PREFIX>_READ_WRITE_TOKEN` and nothing works with no clue as
 * to why. So: use the standard name if present, otherwise accept any variable
 * that looks like a Blob token (`vercel_blob_rw_…`). Values are never logged.
 */
export function blobToken(): string | undefined {
  const std = process.env.BLOB_READ_WRITE_TOKEN
  if (std) return std
  for (const [name, value] of Object.entries(process.env)) {
    if (name.endsWith('_READ_WRITE_TOKEN') && value?.startsWith('vercel_blob_rw_')) return value
  }
  return undefined
}

export function blobConfigured(): boolean {
  return !!blobToken()
}

export interface UploadResult {
  ok: boolean
  url?: string
  error?: string
}

export async function uploadPhoto(file: File, operatorId: string): Promise<UploadResult> {
  if (!blobConfigured()) {
    return { ok: false, error: 'La subida de fotos aún no está activada. Pega la dirección de una imagen mientras tanto.' }
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: 'Formato no admitido. Usa JPG, PNG o WebP.' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'La imagen pesa demasiado (máx. 3 MB).' }
  }
  try {
    const { put } = await import('@vercel/blob')
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const blob = await put(`charters/${operatorId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`, file, {
      access: 'public',
      contentType: file.type,
      // Blob adds its own random suffix; ours already is unique.
      addRandomSuffix: false,
      token: blobToken(),
    })
    return { ok: true, url: blob.url }
  } catch (error) {
    console.error('Photo upload failed:', error)
    return { ok: false, error: 'No se pudo subir la foto. Inténtalo de nuevo.' }
  }
}

/** Remove a blob we own. Never throws: a stale URL shouldn't block the edit. */
export async function deletePhoto(url: string): Promise<void> {
  if (!blobConfigured() || !isBlobUrl(url)) return
  try {
    const { del } = await import('@vercel/blob')
    await del(url, { token: blobToken() })
  } catch (error) {
    console.warn('Photo delete failed:', error)
  }
}

/** True for URLs we host ourselves (so we know what we may delete). */
export function isBlobUrl(url: string): boolean {
  try {
    return /\.public\.blob\.vercel-storage\.com$/i.test(new URL(url).hostname)
  } catch {
    return false
  }
}

/**
 * Accept a photo URL typed by the patrón. Only https images, and never a
 * `javascript:`/`data:` payload dressed up as a link.
 */
export function isValidPhotoUrl(url: string): boolean {
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
