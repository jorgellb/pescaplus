'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CharterIcon from './CharterIcon'

const MAX_EDGE = 1600
const QUALITY = 0.82

/**
 * Boat photo manager for the patrón: pick files (or paste a URL), reorder, and
 * delete. Images are resized in the browser before upload — a phone original is
 * 4-8 MB, which both blows past the serverless body limit and costs storage for
 * pixels nobody sees at 1600 px wide.
 */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    // Already small enough and not huge on disk → send as-is.
    if (scale === 1 && file.size < 1_500_000) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', QUALITY))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file // navegador sin createImageBitmap: que lo valide el servidor
  }
}

export default function PhotoUploader({ operatorId, manageToken, photos: initial }: {
  operatorId: string; manageToken: string; photos: string[]
}) {
  const router = useRouter()
  const [photos, setPhotos] = useState<string[]>(initial)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [uploadsOn, setUploadsOn] = useState<boolean | null>(null)
  const [max, setMax] = useState(8)
  const [showUrl, setShowUrl] = useState(false)
  const [url, setUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/charters/operador/fotos')
      .then((r) => r.json())
      .then((d) => { setUploadsOn(!!d.blobConfigured); setMax(d.max ?? 8) })
      .catch(() => setUploadsOn(false))
  }, [])

  const send = async (body: FormData) => {
    setBusy(true); setMsg('')
    try {
      const res = await fetch('/api/charters/operador/fotos', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok || !data.success) { setMsg(data.error || 'No se pudo añadir la foto.'); return false }
      setPhotos(data.photos); router.refresh(); return true
    } catch { setMsg('Fallo de red.'); return false } finally { setBusy(false) }
  }

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    for (const file of Array.from(files).slice(0, max - photos.length)) {
      const fd = new FormData()
      fd.append('operatorId', operatorId)
      fd.append('manageToken', manageToken)
      fd.append('file', await shrink(file))
      const ok = await send(fd)
      if (!ok) break
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const addUrl = async () => {
    if (!url.trim()) return
    const fd = new FormData()
    fd.append('operatorId', operatorId)
    fd.append('manageToken', manageToken)
    fd.append('url', url.trim())
    if (await send(fd)) { setUrl(''); setShowUrl(false) }
  }

  const remove = async (target: string) => {
    setBusy(true); setMsg('')
    try {
      const res = await fetch('/api/charters/operador/fotos', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId, manageToken, url: target }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setMsg(data.error || 'No se pudo borrar.'); return }
      setPhotos(data.photos); router.refresh()
    } catch { setMsg('Fallo de red.') } finally { setBusy(false) }
  }

  const move = async (from: number, to: number) => {
    if (to < 0 || to >= photos.length) return
    const next = [...photos]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setPhotos(next)
    await fetch('/api/charters/operador/fotos', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorId, manageToken, photos: next }),
    }).catch(() => {})
    router.refresh()
  }

  const full = photos.length >= max

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-ink text-[15px]">
          <CharterIcon name="camera" className="w-[18px] h-[18px] text-accent" />
          Fotos del barco
          <span className="text-[12px] font-normal text-ink/45">({photos.length}/{max})</span>
        </p>
      </div>
      <p className="text-[13px] text-ink/55 -mt-1">
        Es lo primero que mira un pescador. La primera foto es la portada del anuncio.
      </p>

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {photos.map((p, i) => (
            <li key={p} className="relative group aspect-[4/3] rounded-xl overflow-hidden border border-ink/[0.07] bg-ink/[0.04]">
              {/* Fotos externas de cualquier host: <img> plano, sin optimizador. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt={`Foto ${i + 1} del barco`} className="absolute inset-0 w-full h-full object-cover" />
              {i === 0 && <span className="absolute top-1.5 left-1.5 bg-accent text-paper text-[10px] font-bold px-2 py-0.5 rounded-full">Portada</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between p-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <span className="flex gap-1">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0 || busy}
                    aria-label="Mover antes" className="w-6 h-6 rounded-full bg-white/90 text-ink text-xs disabled:opacity-30">‹</button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === photos.length - 1 || busy}
                    aria-label="Mover después" className="w-6 h-6 rounded-full bg-white/90 text-ink text-xs disabled:opacity-30">›</button>
                </span>
                <button type="button" onClick={() => remove(p)} disabled={busy}
                  aria-label="Borrar foto" className="w-6 h-6 rounded-full bg-white/90 text-red-600 text-xs">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!full && (
        <div className="flex flex-wrap items-center gap-2">
          {uploadsOn !== false && (
            <>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
                onChange={(e) => onFiles(e.target.files)} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
                className="inline-flex items-center gap-2 bg-accent text-paper px-4 py-2 text-sm font-semibold rounded-full hover:brightness-110 disabled:opacity-60">
                <CharterIcon name="camera" className="w-4 h-4" />
                {busy ? 'Subiendo…' : 'Subir fotos'}
              </button>
            </>
          )}
          <button type="button" onClick={() => setShowUrl((v) => !v)}
            className="text-[13px] font-semibold text-accent hover:underline px-2">
            {showUrl ? 'Cancelar' : 'o pegar una dirección'}
          </button>
        </div>
      )}

      {showUrl && !full && (
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…"
            className="flex-1 border border-ink/12 rounded-xl bg-paper px-3 py-2 text-sm focus:outline-none focus:border-accent" />
          <button type="button" onClick={addUrl} disabled={busy}
            className="bg-ink text-paper px-4 py-2 text-sm font-semibold rounded-xl disabled:opacity-60">Añadir</button>
        </div>
      )}

      {uploadsOn === false && (
        <p className="text-[12.5px] text-amber-800 bg-amber-500/10 border border-amber-600/25 rounded-xl p-2.5">
          La subida de archivos aún no está activada en el servidor (falta configurar el almacenamiento).
          Mientras tanto puedes añadir fotos pegando su dirección.
        </p>
      )}
      {msg && <p className="text-sm text-red-700">{msg}</p>}
    </div>
  )
}
