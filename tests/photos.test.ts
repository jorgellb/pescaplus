import { describe, it, expect, beforeEach } from 'vitest'
import { isValidPhotoUrl, sanitizePhotos, isBlobUrl, blobConfigured, MAX_PHOTOS } from '@/lib/photos'
import { registerOperator, updateOperatorProfile } from '@/lib/operators-store'

const g = globalThis as unknown as Record<string, unknown[]>
beforeEach(() => { g.__pescaplusOperators = [] })

describe('fotos — validación de direcciones', () => {
  it('solo acepta https', () => {
    expect(isValidPhotoUrl('https://cdn.ejemplo.com/barco.jpg')).toBe(true)
    expect(isValidPhotoUrl('http://cdn.ejemplo.com/barco.jpg')).toBe(false)
    expect(isValidPhotoUrl('no-es-una-url')).toBe(false)
  })

  it('rechaza esquemas peligrosos disfrazados de enlace', () => {
    expect(isValidPhotoUrl('javascript:alert(1)')).toBe(false)
    expect(isValidPhotoUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBe(false)
    expect(isValidPhotoUrl('file:///etc/passwd')).toBe(false)
  })

  it('sanitizePhotos filtra, deduplica y respeta el máximo', () => {
    expect(sanitizePhotos(['https://a.com/1.jpg', 'javascript:x', 'https://a.com/1.jpg', 'https://a.com/2.jpg']))
      .toEqual(['https://a.com/1.jpg', 'https://a.com/2.jpg'])
    expect(sanitizePhotos('no-es-array')).toEqual([])
    const many = Array.from({ length: MAX_PHOTOS + 5 }, (_, i) => `https://a.com/${i}.jpg`)
    expect(sanitizePhotos(many)).toHaveLength(MAX_PHOTOS)
  })

  it('reconoce las URLs de nuestro propio almacenamiento (las únicas que borramos)', () => {
    expect(isBlobUrl('https://abc123.public.blob.vercel-storage.com/charters/x/1.jpg')).toBe(true)
    expect(isBlobUrl('https://cdn.ajeno.com/1.jpg')).toBe(false)
    expect(isBlobUrl('no-es-url')).toBe(false)
  })

  it('sin token de almacenamiento, la subida queda desactivada (no rompe)', () => {
    // En tests no hay BLOB_READ_WRITE_TOKEN: el modo "pega una URL" sigue vivo.
    expect(blobConfigured()).toBe(false)
  })
})

describe('fotos — persistencia en el perfil del patrón', () => {
  it('guarda solo direcciones válidas y conserva el orden (la primera es portada)', async () => {
    const op = await registerOperator({ name: 'P', email: 'p@x.es', spotSlug: 'tarifa', licenseRef: 'L', insuranceRef: 'S' })
    expect(op.photos).toEqual([])

    const saved = await updateOperatorProfile(op.id, op.manageToken, {
      photos: ['https://a.com/portada.jpg', 'javascript:alert(1)', 'https://a.com/cubierta.jpg'],
    })
    expect(saved!.photos).toEqual(['https://a.com/portada.jpg', 'https://a.com/cubierta.jpg'])

    // Reordenar cambia la portada.
    const reordered = await updateOperatorProfile(op.id, op.manageToken, {
      photos: ['https://a.com/cubierta.jpg', 'https://a.com/portada.jpg'],
    })
    expect(reordered!.photos[0]).toBe('https://a.com/cubierta.jpg')

    // Token equivocado no toca nada.
    expect(await updateOperatorProfile(op.id, 'malo', { photos: [] })).toBeNull()
  })
})
