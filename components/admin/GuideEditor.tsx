'use client'

import { useRef, useState } from 'react'
import type { Guide } from '@/types'
import { FISHING_TYPES } from '@/lib/fishing'
import { renderDescription } from '@/lib/markdown'

interface GuideEditorProps {
  initial: Guide | null
  onClose: () => void
  onSaved: () => void
}

type FormState = {
  title: string
  typeFishing: string
  coverImage: string
  coverImageAlt: string
  excerpt: string
  content: string
  seoTitle: string
  seoDescription: string
  published: boolean
}

function toForm(g: Guide | null): FormState {
  return {
    title: g?.title ?? '',
    typeFishing: g?.typeFishing ?? '',
    coverImage: g?.coverImage ?? '',
    coverImageAlt: g?.coverImageAlt ?? '',
    excerpt: g?.excerpt ?? '',
    content: g?.content ?? '',
    seoTitle: g?.seoTitle ?? '',
    seoDescription: g?.seoDescription ?? '',
    published: g?.published ?? true,
  }
}

const field =
  'w-full px-3 py-2.5 bg-paper border border-ink/25 rounded-lg text-ink placeholder-ink/40 focus:outline-none focus:border-accent text-sm transition-colors'
const labelCls = 'text-[11px] font-bold uppercase tracking-widest text-ink/50'

export default function GuideEditor({ initial, onClose, onSaved }: GuideEditorProps) {
  const [form, setForm] = useState<FormState>(toForm(initial))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  const [aiTopic, setAiTopic] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNote, setAiNote] = useState('')

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const surround = (before: string, after: string, ph: string) => {
    const ta = contentRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e, value } = ta
    const sel = value.slice(s, e) || ph
    set('content', value.slice(0, s) + before + sel + after + value.slice(e))
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = s + before.length
      ta.selectionEnd = s + before.length + sel.length
    })
  }

  const generateWithAI = async () => {
    if (!aiTopic.trim()) return
    setAiLoading(true)
    setAiNote('')
    setError('')
    try {
      const res = await fetch('/api/admin/generate-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, typeFishing: form.typeFishing || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        const d = data.draft
        setForm((f) => ({
          ...f,
          title: d.title ?? f.title,
          excerpt: d.excerpt ?? f.excerpt,
          content: d.content ?? f.content,
          seoDescription: d.seoDescription ?? f.seoDescription,
        }))
        setAiNote(d.generatedBy === 'nvidia' ? '✨ Guía generada con IA. Revisa antes de publicar.' : '✨ Generada offline (configura NVIDIA para IA real).')
      } else setError(data.error || 'No se pudo generar la guía')
    } catch {
      setError('Error de red al generar con IA')
    } finally {
      setAiLoading(false)
    }
  }

  const save = async () => {
    setError('')
    if (form.title.trim().length < 2) return setError('El título es obligatorio.')
    if (form.content.trim().length < 1) return setError('El contenido es obligatorio.')
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      typeFishing: form.typeFishing,
      coverImage: form.coverImage.trim(),
      coverImageAlt: form.coverImageAlt.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content.trim(),
      seoTitle: form.seoTitle.trim(),
      seoDescription: form.seoDescription.trim(),
      published: form.published,
      aiOptimized: Boolean(aiNote) || initial?.aiOptimized,
    }
    try {
      const res = initial
        ? await fetch(`/api/admin/guides/${initial.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/admin/guides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/30 backdrop-blur-sm p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-3xl my-4 bg-white border-2 border-ink shadow-hard-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-ink sticky top-0 bg-white z-10">
          <h2 className="font-display uppercase text-xl text-ink">{initial ? 'Editar guía' : 'Nueva guía'}</h2>
          <button onClick={onClose} className="text-ink/50 hover:text-ink text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="border-2 border-accent/30 bg-accent/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-accent">
              <span className="text-lg">🤖</span>
              <span className="text-xs font-bold uppercase tracking-widest">Generar con IA</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateWithAI()} placeholder="Ej: cómo elegir tu primer carrete de spinning" className={field} />
              <button onClick={generateWithAI} disabled={aiLoading || !aiTopic.trim()} className="whitespace-nowrap bg-ink text-paper hover:bg-accent font-bold text-sm px-4 py-2.5 transition-colors disabled:opacity-40">
                {aiLoading ? 'Generando…' : 'Generar ✨'}
              </button>
            </div>
            {aiNote && <p className="text-[11px] text-accent">{aiNote}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className={labelCls}>Título</label>
              <input value={form.title} onChange={(e) => set('title', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Categoría</label>
              <select value={form.typeFishing} onChange={(e) => set('typeFishing', e.target.value)} className={field}>
                <option value="">General</option>
                {FISHING_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Imagen de portada (URL)</label>
              <input value={form.coverImage} onChange={(e) => set('coverImage', e.target.value)} placeholder="https://…" className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>ALT de la portada (SEO/accesibilidad)</label>
              <input value={form.coverImageAlt} onChange={(e) => set('coverImageAlt', e.target.value)} placeholder="Describe la imagen" className={field} />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Extracto (resumen)</label>
            <textarea value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} rows={2} className={`${field} resize-y`} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={labelCls}>Contenido (markdown: **negrita**, listas con “- ”, enlaces)</label>
              <button onClick={() => setShowPreview((v) => !v)} className="text-xs font-bold text-accent hover:underline">{showPreview ? 'Editar' : 'Vista previa'}</button>
            </div>
            {showPreview ? (
              <div className="min-h-[12rem] p-4 border border-ink/15 bg-paper text-sm text-ink/80 [&_strong]:text-ink [&_a]:text-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: renderDescription(form.content) || '<span class="text-ink/40">Nada que previsualizar…</span>' }} />
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => surround('**', '**', 'Título de sección')} className="px-2.5 py-1 text-xs font-bold border border-ink/25 bg-paper hover:bg-ink/5">B</button>
                  <button onClick={() => surround('_', '_', 'cursiva')} className="px-2.5 py-1 text-xs italic border border-ink/25 bg-paper hover:bg-ink/5">i</button>
                  <button onClick={() => surround('[', '](https://)', 'texto')} className="px-2.5 py-1 text-xs border border-ink/25 bg-paper hover:bg-ink/5">🔗 Enlace</button>
                  <button onClick={() => surround('\n![', '](https://)\n', 'texto alt de la imagen')} className="px-2.5 py-1 text-xs border border-ink/25 bg-paper hover:bg-ink/5">🖼️ Imagen</button>
                </div>
                <textarea ref={contentRef} value={form.content} onChange={(e) => set('content', e.target.value)} rows={12} className={`${field} resize-y font-mono text-xs leading-relaxed`} />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 border border-ink/15 bg-paper">
            <p className="text-xs font-bold uppercase tracking-widest text-ink/50">SEO</p>
            <div className="space-y-1">
              <label className={labelCls}>Título SEO</label>
              <input value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} maxLength={120} placeholder="Vacío = título de la guía" className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Meta descripción</label>
              <textarea value={form.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} rows={2} maxLength={165} className={`${field} resize-y`} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)} className="accent-[#1b39ff]" />
            <span className="text-sm text-ink/80">Publicada (visible en /guias)</span>
          </label>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t-2 border-ink sticky bottom-0 bg-white">
          <button onClick={onClose} className="text-sm font-semibold text-ink/60 hover:text-ink px-4 py-2.5">Cancelar</button>
          <button onClick={save} disabled={saving} className="bg-ink text-paper hover:bg-accent font-bold text-sm px-6 py-2.5 border-2 border-ink transition-colors disabled:opacity-40">
            {saving ? 'Guardando…' : initial ? 'Guardar' : 'Crear guía'}
          </button>
        </div>
      </div>
    </div>
  )
}
