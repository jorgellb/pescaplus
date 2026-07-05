'use client'

import { useState } from 'react'
import type { Product } from '@/types'
import { FISHING_TYPES } from '@/lib/fishing'
import ProductImage from '@/components/ProductImage'

interface ProductEditorProps {
  initial: Product | null
  onClose: () => void
  onSaved: () => void
}

type FormState = {
  title: string
  typeFishing: string
  price: string
  currency: string
  rating: string
  reviews: string
  imageUrl: string
  images: string
  videoUrl: string
  affiliateUrl: string
  description: string
  seoDescription: string
  inStock: boolean
}

function toForm(p: Product | null): FormState {
  return {
    title: p?.title ?? '',
    typeFishing: p?.typeFishing ?? FISHING_TYPES[0].id,
    price: p ? String(p.price) : '',
    currency: p?.currency ?? 'EUR',
    rating: p ? String(p.rating) : '4.6',
    reviews: p ? String(p.reviews) : '0',
    imageUrl: p?.imageUrl ?? '',
    images: (p?.images ?? []).join('\n'),
    videoUrl: p?.videoUrl ?? '',
    affiliateUrl: p?.affiliateUrl ?? 'https://www.aliexpress.com',
    description: p?.description ?? '',
    seoDescription: p?.seoDescription ?? '',
    inStock: p?.inStock ?? true,
  }
}

const field =
  'w-full px-3 py-2.5 bg-slate-950/80 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 text-sm transition-all'
const labelCls = 'text-[11px] font-bold uppercase tracking-widest text-slate-400'

export default function ProductEditor({ initial, onClose, onSaved }: ProductEditorProps) {
  const [form, setForm] = useState<FormState>(toForm(initial))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // AI assist
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNote, setAiNote] = useState('')

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

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
          imageUrl: d.imageUrl || f.imageUrl,
        }))
        setAiNote(
          d.generatedBy === 'nvidia'
            ? '✨ Ficha generada con IA (NVIDIA). Revisa y ajusta antes de guardar.'
            : '✨ Ficha generada con el asistente offline. Configura NVIDIA_API_KEY para IA real.',
        )
      } else {
        setError(data.error || 'No se pudo generar la ficha')
      }
    } catch {
      setError('Error de red al generar con IA')
    } finally {
      setAiLoading(false)
    }
  }

  const save = async () => {
    setError('')
    const price = parseFloat(form.price)
    if (!form.title.trim() || form.title.trim().length < 2) {
      setError('El título es obligatorio (mínimo 2 caracteres).')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Introduce un precio válido.')
      return
    }

    setSaving(true)
    const images = form.images
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      seoDescription: form.seoDescription.trim(),
      imageUrl: form.imageUrl.trim() || images[0] || '',
      images,
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
      if (data.success) {
        onSaved()
      } else {
        setError(data.error || 'No se pudo guardar')
      }
    } catch {
      setError('Error de red al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl my-4 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-extrabold text-white">
            {initial ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* AI assistant */}
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                Generar ficha con IA
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generateWithAI()}
                placeholder="Ej: carrete de spinning estanco para lucio con freno potente"
                className={field}
              />
              <button
                onClick={generateWithAI}
                disabled={aiLoading || !aiPrompt.trim()}
                className="whitespace-nowrap bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-sm px-4 py-2.5 rounded-lg active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {aiLoading ? 'Generando…' : 'Generar ✨'}
              </button>
            </div>
            {aiNote && <p className="text-[11px] text-cyan-300/90">{aiNote}</p>}
          </div>

          {/* Preview + core fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-950 border border-white/5">
              <ProductImage
                src={form.imageUrl}
                alt={form.title || 'Vista previa'}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="sm:col-span-2 space-y-3">
              <div className="space-y-1">
                <label className={labelCls}>Título</label>
                <input value={form.title} onChange={(e) => set('title', e.target.value)} className={field} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Modalidad</label>
                  <select
                    value={form.typeFishing}
                    onChange={(e) => set('typeFishing', e.target.value)}
                    className={field}
                  >
                    {FISHING_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.icon} {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Stock</label>
                  <label className="flex items-center gap-2 h-[42px] px-3 bg-slate-950/80 border border-white/10 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.inStock}
                      onChange={(e) => set('inStock', e.target.checked)}
                      className="accent-cyan-500"
                    />
                    <span className="text-sm text-slate-300">Disponible</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Numeric fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Precio</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                className={field}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Moneda</label>
              <input value={form.currency} onChange={(e) => set('currency', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Valoración</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={form.rating}
                onChange={(e) => set('rating', e.target.value)}
                className={field}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Reseñas</label>
              <input
                type="number"
                min="0"
                value={form.reviews}
                onChange={(e) => set('reviews', e.target.value)}
                className={field}
              />
            </div>
          </div>

          {/* URLs & media */}
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Imagen principal (URL)</label>
              <input
                value={form.imageUrl}
                onChange={(e) => set('imageUrl', e.target.value)}
                placeholder="https://…"
                className={field}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Galería de imágenes (una URL por línea)</label>
              <textarea
                value={form.images}
                onChange={(e) => set('images', e.target.value)}
                rows={3}
                placeholder={'https://…jpg\nhttps://…jpg'}
                className={`${field} resize-y font-mono text-xs`}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Vídeo del producto (URL mp4, opcional)</label>
              <input
                value={form.videoUrl}
                onChange={(e) => set('videoUrl', e.target.value)}
                placeholder="https://…mp4"
                className={field}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Enlace de afiliado (AliExpress)</label>
              <input
                value={form.affiliateUrl}
                onChange={(e) => set('affiliateUrl', e.target.value)}
                placeholder="https://www.aliexpress.com/…"
                className={field}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={4}
                className={`${field} resize-y`}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Meta descripción SEO (~155 caracteres)</label>
              <textarea
                value={form.seoDescription}
                onChange={(e) => set('seoDescription', e.target.value)}
                rows={2}
                maxLength={165}
                placeholder="Se genera con IA al importar; edítala aquí…"
                className={`${field} resize-y`}
              />
              <p className="text-[10px] text-slate-500 text-right">{form.seoDescription.length}/160</p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2.5 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm px-6 py-2.5 rounded-lg shadow-md shadow-cyan-500/10 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  )
}
