'use client'

import { useState } from 'react'
import Icon from '@/components/icons/Icon'
import { FISHING_SPOTS } from '@/lib/fishing-spots'
import type { AdminCharter } from '@/app/admin/charters/page'

export interface OperatorOption { id: string; name: string; businessName: string }

interface CharterEditorProps {
  charter: AdminCharter | null
  operators: OperatorOption[]
  onClose: () => void
  onSaved: () => void
}

type FormState = {
  operatorId: string
  spotSlug: string
  dateISO: string
  timeStart: string
  durationH: string
  modality: 'tierra' | 'kayak' | 'barco'
  targetSpecies: string
  level: string
  pricePerPerson: string
  maxPlaces: string
  minToConfirm: string
  tripType: 'privada' | 'compartida'
  privatePrice: string
  meetingPoint: string
  highlights: string
  includes: string
  notes: string
  status: 'open' | 'confirmed' | 'cancelled'
}

function toForm(c: AdminCharter | null, defaultOperatorId: string): FormState {
  return {
    operatorId: c?.operatorId ?? defaultOperatorId,
    spotSlug: c?.spotSlug ?? FISHING_SPOTS[0]?.slug ?? '',
    dateISO: c?.dateISO ?? '',
    timeStart: c?.timeStart ?? '',
    durationH: c?.durationH != null ? String(c.durationH) : '',
    modality: c?.modality ?? 'barco',
    targetSpecies: c?.targetSpecies ?? '',
    level: c?.level ?? '',
    pricePerPerson: c ? String(c.pricePerPerson) : '',
    maxPlaces: c ? String(c.maxPlaces) : '6',
    minToConfirm: c ? String(c.minToConfirm) : '1',
    tripType: c?.tripType ?? 'compartida',
    privatePrice: c?.privatePrice != null ? String(c.privatePrice) : '',
    meetingPoint: c?.meetingPoint ?? '',
    highlights: c?.highlights ?? '',
    includes: c?.includes ?? '',
    notes: c?.notes ?? '',
    status: c?.status ?? 'open',
  }
}

const field = 'w-full px-3 py-2.5 bg-paper border border-ink/25 rounded-lg text-ink placeholder-ink/60 focus:outline-none focus:border-accent text-sm transition-colors'
const labelCls = 'text-[11px] font-bold uppercase tracking-widest text-ink/60'

export default function CharterEditor({ charter, operators, onClose, onSaved }: CharterEditorProps) {
  const [form, setForm] = useState<FormState>(toForm(charter, operators[0]?.id ?? ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const save = async () => {
    setError('')
    if (!charter && !form.operatorId) return setError('Elige el operador.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateISO)) return setError('Fecha no válida.')
    if (!/^\d{2}:\d{2}$/.test(form.timeStart)) return setError('Hora no válida.')
    if (!(Number(form.pricePerPerson) > 0)) return setError('Indica el precio por persona.')
    setSaving(true)
    const base = {
      dateISO: form.dateISO,
      timeStart: form.timeStart,
      durationH: form.durationH ? Number(form.durationH) : null,
      modality: form.modality,
      targetSpecies: form.targetSpecies.trim(),
      level: form.level.trim(),
      pricePerPerson: Number(form.pricePerPerson),
      maxPlaces: Number(form.maxPlaces),
      minToConfirm: Number(form.minToConfirm),
      tripType: form.tripType,
      privatePrice: form.privatePrice ? Number(form.privatePrice) : null,
      meetingPoint: form.meetingPoint.trim(),
      highlights: form.highlights.trim(),
      includes: form.includes.trim(),
      notes: form.notes.trim(),
    }
    try {
      const res = charter
        ? await fetch(`/api/admin/charters/${charter.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...base, status: form.status }) })
        : await fetch('/api/admin/charters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...base, operatorId: form.operatorId, spotSlug: form.spotSlug }) })
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
      <div className="w-full max-w-2xl my-4 bg-white border border-ink/10 rounded-xl shadow-hard-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/[0.07] sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-display uppercase text-xl text-ink">{charter ? 'Editar chárter' : 'Nuevo chárter'}</h2>
            {charter && <p className="text-xs text-ink/60 mt-0.5">{charter.operator?.businessName || charter.operator?.name || 'Operador desconocido'} · {charter.spotSlug}</p>}
          </div>
          <button onClick={onClose} className="text-ink/60 hover:text-ink"><Icon name="close" className="w-5 h-5" strokeWidth={2} /></button>
        </div>

        <div className="p-6 space-y-5">
          {!charter && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Operador</label>
                <select value={form.operatorId} onChange={(e) => set('operatorId', e.target.value)} className={field}>
                  {operators.length === 0 && <option value="">No hay operadores verificados</option>}
                  {operators.map((o) => <option key={o.id} value={o.id}>{o.businessName || o.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Zona</label>
                <select value={form.spotSlug} onChange={(e) => set('spotSlug', e.target.value)} className={field}>
                  {FISHING_SPOTS.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Fecha</label>
              <input type="date" value={form.dateISO} onChange={(e) => set('dateISO', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Hora</label>
              <input type="time" value={form.timeStart} onChange={(e) => set('timeStart', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Duración (h)</label>
              <input type="number" min={0.5} max={24} step={0.5} value={form.durationH} onChange={(e) => set('durationH', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Modalidad</label>
              <select value={form.modality} onChange={(e) => set('modality', e.target.value as FormState['modality'])} className={field}>
                <option value="barco">Barco</option>
                <option value="kayak">Kayak</option>
                <option value="tierra">Tierra</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>€ / persona</label>
              <input type="number" min={0} max={5000} value={form.pricePerPerson} onChange={(e) => set('pricePerPerson', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Plazas máx.</label>
              <input type="number" min={1} max={50} value={form.maxPlaces} onChange={(e) => set('maxPlaces', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Mínimo para confirmar</label>
              <input type="number" min={1} value={form.minToConfirm} onChange={(e) => set('minToConfirm', e.target.value)} className={field} />
            </div>
            {charter && (
              <div className="space-y-1">
                <label className={labelCls}>Estado</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value as FormState['status'])} className={field}>
                  <option value="open">Abierto</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Tipo de salida</label>
              <select value={form.tripType} onChange={(e) => set('tripType', e.target.value as FormState['tripType'])} className={field}>
                <option value="compartida">Compartida</option>
                <option value="privada">Privada</option>
              </select>
            </div>
            {form.tripType === 'privada' && (
              <div className="space-y-1">
                <label className={labelCls}>Precio salida privada (€)</label>
                <input type="number" min={0} max={50000} value={form.privatePrice} onChange={(e) => set('privatePrice', e.target.value)} className={field} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Especie objetivo</label>
              <input value={form.targetSpecies} onChange={(e) => set('targetSpecies', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Nivel</label>
              <input value={form.level} onChange={(e) => set('level', e.target.value)} className={field} />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Punto de encuentro</label>
            <input value={form.meetingPoint} onChange={(e) => set('meetingPoint', e.target.value)} className={field} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Destacado (una línea)</label>
            <input value={form.highlights} onChange={(e) => set('highlights', e.target.value)} className={field} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Qué incluye</label>
            <textarea value={form.includes} onChange={(e) => set('includes', e.target.value)} rows={2} className={`${field} resize-y`} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Notas</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} className={`${field} resize-y`} />
          </div>

          {charter && charter.bookings.length > 0 && (
            <div className="border border-ink/10 rounded-lg p-3 space-y-1.5 bg-paper">
              <p className={labelCls}>Reservas ({charter.bookings.length})</p>
              {charter.bookings.map((b) => (
                <p key={b.id} className="text-xs text-ink/70">{b.name} · {b.people} plaza(s) · <span className="font-semibold">{b.status}</span></p>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink/[0.07] sticky bottom-0 bg-white">
          <button onClick={onClose} className="text-sm font-semibold text-ink/60 hover:text-ink px-4 py-2.5">Cancelar</button>
          <button onClick={save} disabled={saving} className="bg-ink text-paper hover:bg-accent font-bold text-sm px-6 py-2.5 border border-ink/10 rounded-xl transition-colors disabled:opacity-40">
            {saving ? 'Guardando…' : charter ? 'Guardar' : 'Crear chárter'}
          </button>
        </div>
      </div>
    </div>
  )
}
