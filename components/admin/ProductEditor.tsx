'use client'

import { useRef, useState } from 'react'
import type { Product } from '@/types'
import { FISHING_TYPES } from '@/lib/fishing'
import { renderDescription } from '@/lib/markdown'
import ProductImage from '@/components/ProductImage'

interface ProductEditorProps {
  initial: Product | null
  onClose: () => void
  onSaved: () => void
}

type ImageRow = { url: string; alt: string }
type FormState = {
  title: string
  typeFishing: string
  price: string
  currency: string
  rating: string
  reviews: string
  images: ImageRow[]
  videoUrl: string
  affiliateUrl: string
  description: string
  seoTitle: string
  seoDescription: string
  inStock: boolean
}

function toForm(p: Product | null): FormState {
  const images: ImageRow[] = (p?.images ?? []).map((url, i) => ({ url, alt: p?.imageAlts?.[i] ?? '' }))
  return {
    title: p?.title ?? '',
    typeFishing: p?.typeFishing ?? FISHING_TYPES[0].id,
    price: p ? String(p.price) : '',
    currency: p?.currency ?? 'EUR',
    rating: p ? String(p.rating) : '4.6',
    reviews: p ? String(p.reviews) : '0',
    images: images.length ? images : [{ url: '', alt: '' }],
    videoUrl: p?.videoUrl ?? '',
    affiliateUrl: p?.affiliateUrl ?? 'https://www.aliexpress.com',
    description: p?.description ?? '',
    seoTitle: p?.seoTitle ?? '',
    seoDescription: p?.seoDescription ?? '',
    inStock: p?.inStock ?? true,
  }
}

const field =
  'w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 text-sm transition-all'
const labelCls = 'text-[11px] font-bold uppercase tracking-widest text-slate-500'

export default function ProductEditor({ initial, onClose, onSaved }: ProductEditorProps) {
  const [form, setForm] = useState<FormState>(toForm(initial))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const descRef = useRef<HTMLTextAreaElement>(null)

  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNote, setAiNote] = useState('')

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // --- image manager ---
  const setImage = (i: number, patch: Partial<ImageRow>) =>
    setForm((f) => ({ ...f, images: f.images.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }))
  const addImage = () => setForm((f) => ({ ...f, images: [...f.images, { url: '', alt: '' }] }))
  const removeImage = (i: number) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) || [{ url: '', alt: '' }] }))
  const moveImage = (i: number, dir: -1 | 1) =>
    setForm((f) => {
      const arr = [...f.images]
      const j = i + dir
      if (j < 0 || j >= arr.length) return f
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...f, images: arr }
    })

  // --- description toolbar ---
  const surround = (before: string, after: string, placeholder: string) => {
    const ta = descRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e, value } = ta
    const sel = value.slice(s, e) || placeholder
    const next = value.slice(0, s) + before + sel + after + value.slice(e)
    set('description', next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = s + before.length
      ta.selectionEnd = s + before.length + sel.length
    })
  }
  const bulletLines = () => {
    const ta = descRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e, value } = ta
    const block = value.slice(s, e) || 'Elemento'
    const bulleted = block.split('\n').map((l) => (l.trim() ? `- ${l.replace(/^- /, '')}` : l)).join('\n')
    set('description', value.slice(0, s) + bulleted + value.slice(e))
    requestAnimationFrame(() => ta.focus())
  }

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    setAiNote('')
    setError('')
    try {
      const res = await fetch('/api/admin/generate-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, typeFishing: form.typeFishing, currency: form.currency }),
      })
      const data = await res.json()
      if (data.success) {
        const d = data.draft
        setForm((f) => ({
          ...f,
          title: d.title ?? f.title,
          description: d.description ?? f.description,
          price: d.price != null ? String(d.price) : f.price,
          currency: d.currency ?? f.currency,
          typeFishing: d.typeFishing ?? f.typeFishing,
          rating: d.rating != null ? String(d.rating) : f.rating,
          reviews: d.reviews != null ? String(d.reviews) : f.reviews,
          affiliateUrl: d.affiliateUrl || f.affiliateUrl,
          images: d.imageUrl ? [{ url: d.imageUrl, alt: '' }, ...f.images.filter((r) => r.url)] : f.images,
        }))
        setAiNote(
          d.generatedBy === 'nvidia'
            ? '✨ Ficha generada con IA. Revisa y ajusta antes de guardar.'
            : '✨ Generada con el asistente offline (configura NVIDIA para IA real).',
        )
      } else setError(data.error || 'No se pudo generar la ficha')
    } catch {
      setError('Error de red al generar con IA')
    } finally {
      setAiLoading(false)
    }
  }

  const save = async () => {
    setError('')
    const price = parseFloat(form.price)
    if (form.title.trim().length < 2) return setError('El título es obligatorio (mínimo 2 caracteres).')
    if (!Number.isFinite(price) || price < 0) return setError('Introduce un precio válido.')

    const rows = form.images.filter((r) => r.url.trim())
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      seoTitle: form.seoTitle.trim(),
      seoDescription: form.seoDescription.trim(),
      imageUrl: rows[0]?.url.trim() || '',
      images: rows.map((r) => r.url.trim()),
      imageAlts: rows.map((r) => r.alt.trim()),
      videoUrl: form.videoUrl.trim(),
      price,
      currency: form.currency.trim() || 'EUR',
      affiliateUrl: form.affiliateUrl.trim(),
      category: 'fishing',
      typeFishing: form.typeFishing,
      rating: parseFloat(form.rating) || 0,
      reviews: parseInt(form.reviews, 10) || 0,
      inStock: form.inStock,
    }

    try {
      const res = initial
        ? await fetch(`/api/products/${initial.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const data = await res.json()
      if (data.success) onSaved()
      else setError(data.error || 'No se pudo guardar')
    } catch {
      setError('Error de red al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl my-4 rounded-2xl bg-white border border-slate-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-extrabold text-slate-900">{initial ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-7">
          {/* AI assistant */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sky-700">
              <span className="text-lg">🤖</span>
              <span className="text-xs font-bold uppercase tracking-widest">Generar ficha con IA</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generateWithAI()}
                placeholder="Ej: carrete de spinning estanco para lucio"
                className={field}
              />
              <button
                onClick={generateWithAI}
                disabled={aiLoading || !aiPrompt.trim()}
                className="whitespace-nowrap bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm px-4 py-2.5 rounded-lg active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {aiLoading ? 'Generando…' : 'Generar ✨'}
              </button>
            </div>
            {aiNote && <p className="text-[11px] text-sky-700">{aiNote}</p>}
          </div>

          {/* Core fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
              <ProductImage src={form.images[0]?.url ?? ''} alt={form.title || 'Vista previa'} className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="sm:col-span-2 space-y-3">
              <div className="space-y-1">
                <label className={labelCls}>Título</label>
                <input value={form.title} onChange={(e) => set('title', e.target.value)} className={field} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Categoría</label>
                  <select value={form.typeFishing} onChange={(e) => set('typeFishing', e.target.value)} className={field}>
                    {FISHING_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Stock</label>
                  <label className="flex items-center gap-2 h-[42px] px-3 bg-white border border-slate-300 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={form.inStock} onChange={(e) => set('inStock', e.target.checked)} className="accent-sky-600" />
                    <span className="text-sm text-slate-600">Disponible</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Numeric */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1"><label className={labelCls}>Precio</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} className={field} /></div>
            <div className="space-y-1"><label className={labelCls}>Moneda</label>
              <input value={form.currency} onChange={(e) => set('currency', e.target.value)} className={field} /></div>
            <div className="space-y-1"><label className={labelCls}>Valoración</label>
              <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => set('rating', e.target.value)} className={field} /></div>
            <div className="space-y-1"><label className={labelCls}>Vendidos</label>
              <input type="number" min="0" value={form.reviews} onChange={(e) => set('reviews', e.target.value)} className={field} /></div>
          </div>

          {/* Image manager */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={labelCls}>Imágenes (la primera es la principal)</label>
              <button onClick={addImage} className="text-xs font-bold text-sky-600 hover:text-sky-700">+ Añadir imagen</button>
            </div>
            <div className="space-y-2">
              {form.images.map((row, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-white border border-slate-200">
                    <ProductImage src={row.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-sky-600 text-white text-[8px] font-bold text-center py-0.5">PRINCIPAL</span>}
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <input value={row.url} onChange={(e) => setImage(i, { url: e.target.value })} placeholder="URL de la imagen (https://…)" className={`${field} py-1.5 text-xs`} />
                    <input value={row.alt} onChange={(e) => setImage(i, { alt: e.target.value })} placeholder="Texto ALT (describe la imagen para SEO/accesibilidad)" className={`${field} py-1.5 text-xs`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveImage(i, -1)} disabled={i === 0} className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-30 text-xs">↑</button>
                    <button onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-30 text-xs">↓</button>
                    <button onClick={() => removeImage(i)} className="w-6 h-6 rounded bg-white border border-red-200 text-red-500 hover:bg-red-50 text-xs">✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Vídeo del producto (URL mp4, opcional)</label>
              <input value={form.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://…mp4" className={field} />
            </div>
          </div>

          {/* Description with toolbar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={labelCls}>Descripción (admite enlaces y formato)</label>
              <button onClick={() => setShowPreview((v) => !v)} className="text-xs font-bold text-sky-600 hover:text-sky-700">
                {showPreview ? 'Editar' : 'Vista previa'}
              </button>
            </div>
            {showPreview ? (
              <div
                className="min-h-[8rem] p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600 [&_a]:text-sky-600 [&_a]:underline [&_strong]:text-slate-800 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: renderDescription(form.description) || '<span class="text-slate-400">Nada que previsualizar…</span>' }}
              />
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => surround('**', '**', 'negrita')} className="px-2.5 py-1 text-xs font-bold rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700">B</button>
                  <button onClick={() => surround('_', '_', 'cursiva')} className="px-2.5 py-1 text-xs italic rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700">i</button>
                  <button onClick={() => surround('[', '](https://)', 'texto del enlace')} className="px-2.5 py-1 text-xs rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700">🔗 Enlace</button>
                  <button onClick={bulletLines} className="px-2.5 py-1 text-xs rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700">• Lista</button>
                </div>
                <textarea
                  ref={descRef}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={6}
                  placeholder={'Describe el producto…\n\nUsa **negrita**, _cursiva_, listas con "- " y enlaces [texto](https://…).'}
                  className={`${field} resize-y font-mono text-xs leading-relaxed`}
                />
              </>
            )}
            <p className="text-[10px] text-slate-400">
              Formato: <code>**negrita**</code>, <code>_cursiva_</code>, <code>[texto](https://enlace)</code>, listas con <code>- </code>
            </p>
          </div>

          {/* SEO */}
          <div className="space-y-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">SEO</p>
            <div className="space-y-1">
              <label className={labelCls}>Título SEO (meta title, ~60 car.)</label>
              <input value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} maxLength={70} placeholder="Si lo dejas vacío se usa el título del producto" className={field} />
              <p className="text-[10px] text-slate-400 text-right">{form.seoTitle.length}/60</p>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Meta descripción (~155 car.)</label>
              <textarea value={form.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} rows={2} maxLength={165} className={`${field} resize-y`} />
              <p className="text-[10px] text-slate-400 text-right">{form.seoDescription.length}/160</p>
            </div>
          </div>

          {/* Affiliate */}
          <div className="space-y-1">
            <label className={labelCls}>Enlace de afiliado (AliExpress)</label>
            <input value={form.affiliateUrl} onChange={(e) => set('affiliateUrl', e.target.value)} placeholder="https://www.aliexpress.com/…" className={field} />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="text-sm font-semibold text-slate-500 hover:text-slate-800 px-4 py-2.5 rounded-lg transition-colors">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-sm active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  )
}
