import { NextRequest, NextResponse } from 'next/server'
import { getOperatorByToken, updateOperatorProfile } from '@/lib/operators-store'
import { uploadPhoto, deletePhoto, blobConfigured, isBlobUrl, isValidPhotoUrl, MAX_PHOTOS } from '@/lib/photos'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/** Upload a photo (multipart) or attach one by URL. Owner-scoped by token. */
export async function POST(request: NextRequest) {
  const limit = rateLimit(`fotos:${clientIp(request)}`, 40, 30 * 60_000)
  if (!limit.ok) return NextResponse.json({ success: false, error: 'Demasiadas subidas. Espera unos minutos.' }, { status: 429 })

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ success: false, error: 'Petición no válida.' }, { status: 400 })

  const operatorId = String(form.get('operatorId') ?? '')
  const manageToken = String(form.get('manageToken') ?? '')
  const op = await getOperatorByToken(operatorId, manageToken)
  if (!op) return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 403 })
  if (op.photos.length >= MAX_PHOTOS) {
    return NextResponse.json({ success: false, error: `Máximo ${MAX_PHOTOS} fotos.` }, { status: 400 })
  }

  // Dos vías: fichero subido, o una dirección pegada (funciona sin Blob).
  let url = ''
  const file = form.get('file')
  const pasted = String(form.get('url') ?? '').trim()

  if (file && typeof file === 'object' && 'arrayBuffer' in file) {
    const res = await uploadPhoto(file as File, op.id)
    if (!res.ok) return NextResponse.json({ success: false, error: res.error }, { status: 400 })
    url = res.url!
  } else if (pasted) {
    if (!isValidPhotoUrl(pasted)) return NextResponse.json({ success: false, error: 'La dirección debe empezar por https://' }, { status: 400 })
    url = pasted
  } else {
    return NextResponse.json({ success: false, error: 'No has elegido ninguna imagen.' }, { status: 400 })
  }

  try {
    const updated = await updateOperatorProfile(op.id, manageToken, { photos: [...op.photos, url] })
    return NextResponse.json({ success: true, url, photos: updated?.photos ?? [] })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

/** Remove a photo (and the stored blob, if it's one of ours). */
export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const operatorId = String(body?.operatorId ?? '')
  const manageToken = String(body?.manageToken ?? '')
  const url = String(body?.url ?? '')
  const op = await getOperatorByToken(operatorId, manageToken)
  if (!op) return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 403 })

  try {
    const photos = op.photos.filter((p) => p !== url)
    const updated = await updateOperatorProfile(op.id, manageToken, { photos })
    // El blob se borra después: si falla, la ficha ya está correcta.
    if (isBlobUrl(url)) await deletePhoto(url)
    return NextResponse.json({ success: true, photos: updated?.photos ?? [] })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

/** Reorder: the first photo is the listing's cover. */
export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const op = await getOperatorByToken(String(body?.operatorId ?? ''), String(body?.manageToken ?? ''))
  if (!op) return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 403 })
  const next = Array.isArray(body?.photos) ? body.photos : null
  if (!next) return NextResponse.json({ success: false, error: 'Datos no válidos.' }, { status: 400 })
  // Solo reordena: no permite colar URLs nuevas por esta vía.
  const owned = new Set(op.photos)
  const reordered = next.filter((u: unknown): u is string => typeof u === 'string' && owned.has(u))
  try {
    const updated = await updateOperatorProfile(op.id, String(body.manageToken), { photos: reordered })
    return NextResponse.json({ success: true, photos: updated?.photos ?? [] })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ blobConfigured: blobConfigured(), max: MAX_PHOTOS })
}
