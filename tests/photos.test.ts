import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import {
  isValidPhotoUrl,
  sanitizePhotos,
  isOwnPhotoUrl,
  ownPhotoPath,
  uploadsEnabled,
  uploadPhoto,
  deletePhoto,
  photosDir,
  MAX_PHOTOS,
} from '@/lib/photos'
import { registerOperator, updateOperatorProfile } from '@/lib/operators-store'

// Carpeta de usar y tirar: las pruebas no tocan la del proyecto.
const DIR = mkdtempSync(join(tmpdir(), 'pescaplus-fotos-'))
process.env.PHOTOS_DIR = DIR
afterAll(() => rmSync(DIR, { recursive: true, force: true }))

const g = globalThis as unknown as Record<string, unknown[]>
beforeEach(() => { g.__pescaplusOperators = [] })

describe('fotos — validación de direcciones', () => {
  it('acepta https y las nuestras, y nada más', () => {
    expect(isValidPhotoUrl('https://cdn.ejemplo.com/barco.jpg')).toBe(true)
    expect(isValidPhotoUrl('/fotos/op-1/1750000000000-a1b2c3.jpg')).toBe(true)
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

  it('reconoce las URLs de nuestro almacenamiento (las únicas que borramos)', () => {
    expect(isOwnPhotoUrl('/fotos/op-1/1750000000000-a1b2c3.webp')).toBe(true)
    expect(isOwnPhotoUrl('https://cdn.ajeno.com/1.jpg')).toBe(false)
    expect(isOwnPhotoUrl('no-es-url')).toBe(false)
  })
})

describe('fotos — no se puede salir de la carpeta', () => {
  // Esta ruta es entrada del usuario y acaba siendo una ruta de disco: es la
  // receta clásica del path traversal, así que se prueba a conciencia.
  const ataques = [
    '/fotos/../../../etc/passwd',
    '/fotos/op-1/../../../etc/passwd',
    '/fotos/op-1/..%2f..%2fetc%2fpasswd',
    '/fotos/op-1/1750000000000-a1b2c3.jpg/../../otro.jpg',
    '/fotos//1750000000000-a1b2c3.jpg',
    '/fotos/op-1/1750000000000-a1b2c3.svg',   // SVG puede llevar scripts
    '/fotos/op-1/1750000000000-a1b2c3.html',
    '/fotos/op-1/cualquier-cosa.jpg',          // no tiene nuestra forma
    '/fotos/op-1/sub/carpeta/1750000000000-a1b2c3.jpg',
  ]

  it.each(ataques)('rechaza %s', (ruta) => {
    expect(ownPhotoPath(ruta)).toBeNull()
  })

  it('acepta exactamente la forma que generamos nosotros', () => {
    expect(ownPhotoPath('/fotos/op-1/1750000000000-a1b2c3.jpg')).toBe(`op-1${sep}1750000000000-a1b2c3.jpg`)
  })
})

describe('fotos — subida y borrado en disco', () => {
  it('guarda el fichero, devuelve una URL nuestra y lo borra al quitarlo', async () => {
    expect(uploadsEnabled()).toBe(true)

    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xdb])], 'barco.jpg', { type: 'image/jpeg' })
    const res = await uploadPhoto(file, 'op-1')
    expect(res.ok).toBe(true)
    expect(isOwnPhotoUrl(res.url!)).toBe(true)

    const enDisco = join(photosDir(), ownPhotoPath(res.url!)!)
    expect(existsSync(enDisco)).toBe(true)

    await deletePhoto(res.url!)
    expect(existsSync(enDisco)).toBe(false)
  })

  it('rechaza formatos que no son imagen y no escribe nada', async () => {
    const antes = readdirSync(photosDir()).length
    const malo = new File([new Uint8Array([1])], 'x.svg', { type: 'image/svg+xml' })
    const res = await uploadPhoto(malo, 'op-2')
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/Formato no admitido/)
    expect(readdirSync(photosDir()).length).toBe(antes)
  })

  it('borrar una URL ajena no toca el disco ni lanza', async () => {
    await expect(deletePhoto('https://cdn.ajeno.com/1.jpg')).resolves.toBeUndefined()
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

  it('guarda también las fotos subidas a nuestro disco', async () => {
    const op = await registerOperator({ name: 'P', email: 'p2@x.es', spotSlug: 'tarifa', licenseRef: 'L', insuranceRef: 'S' })
    const saved = await updateOperatorProfile(op.id, op.manageToken, {
      photos: ['/fotos/op-1/1750000000000-a1b2c3.jpg'],
    })
    expect(saved!.photos).toEqual(['/fotos/op-1/1750000000000-a1b2c3.jpg'])
  })
})
