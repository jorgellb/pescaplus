'use client'

import { useState } from 'react'
import Icon from '@/components/icons/Icon'
import type { AdminMeetup } from '@/app/admin/quedadas/page'

interface MeetupEditorProps {
  meetup: AdminMeetup
  onClose: () => void
  onSaved: () => void
}

type FormState = {
  dateISO: string
  timeStart: string
  durationH: string
  modality: 'tierra' | 'kayak' | 'barco'
  targetSpecies: string
  level: string
  maxPlaces: string
  minToConfirm: string
  meetingPoint: string
  notes: string
  status: 'open' | 'confirmed' | 'cancelled'
}

function toForm(m: AdminMeetup): FormState {
  return {
    dateISO: m.dateISO,
    timeStart: m.timeStart,
    durationH: m.durationH != null ? String(m.durationH) : '',
    modality: m.modality,
    targetSpecies: m.targetSpecies,
    level: m.level,
    maxPlaces: String(m.maxPlaces),
    minToConfirm: String(m.minToConfirm),
    meetingPoint: m.meetingPoint,
    notes: m.notes,
    status: m.status,
  }
}

const field = 'w-full px-3 py-2.5 bg-paper border border-ink/25 rounded-lg text-ink placeholder-ink/60 focus:outline-none focus:border-accent text-sm transition-colors'
const labelCls = 'text-[11px] font-bold uppercase tracking-widest text-ink/60'

export default function MeetupEditor({ meetup, onClose, onSaved }: MeetupEditorProps) {
  const [form, setForm] = useState<FormState>(toForm(meetup))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const save = async () => {
    setError('')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateISO)) return setError('Fecha no válida.')
    if (!form.timeStart.trim()) return setError('Falta la hora o franja.')
    setSaving(true)
    const payload = {
      dateISO: form.dateISO,
      timeStart: form.timeStart.trim(),
      durationH: form.durationH ? Number(form.durationH) : null,
      modality: form.modality,
      targetSpecies: form.targetSpecies.trim(),
      level: form.level.trim(),
      maxPlaces: Number(form.maxPlaces),
      minToConfirm: Number(form.minToConfirm),
      meetingPoint: form.meetingPoint.trim(),
      notes: form.notes.trim(),
      status: form.status,
    }
    try {
      const res = await fetch(`/api/admin/quedadas/${meetup.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
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
            <h2 className="font-display uppercase text-xl text-ink">Editar quedada</h2>
            <p className="text-xs text-ink/60 mt-0.5">{meetup.hostName} · {meetup.spotSlug}</p>
          </div>
          <button onClick={onClose} className="text-ink/60 hover:text-ink"><Icon name="close" className="w-5 h-5" strokeWidth={2} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Fecha</label>
              <input type="date" value={form.dateISO} onChange={(e) => set('dateISO', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Hora / franja</label>
              <input value={form.timeStart} onChange={(e) => set('timeStart', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Duración (h)</label>
              <input type="number" min={0.5} max={24} step={0.5} value={form.durationH} onChange={(e) => set('durationH', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Modalidad</label>
              <select value={form.modality} onChange={(e) => set('modality', e.target.value as FormState['modality'])} className={field}>
                <option value="tierra">Tierra</option>
                <option value="kayak">Kayak</option>
                <option value="barco">Barco</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Plazas máx.</label>
              <input type="number" min={1} max={30} value={form.maxPlaces} onChange={(e) => set('maxPlaces', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Mínimo para confirmar</label>
              <input type="number" min={1} value={form.minToConfirm} onChange={(e) => set('minToConfirm', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Estado</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value as FormState['status'])} className={field}>
                <option value="open">Abierta</option>
                <option value="confirmed">Confirmada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
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
            <label className={labelCls}>Notas</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} className={`${field} resize-y`} />
          </div>

          {meetup.rsvps.length > 0 && (
            <div className="border border-ink/10 rounded-lg p-3 space-y-1.5 bg-paper">
              <p className={labelCls}>Apuntados ({meetup.rsvps.length})</p>
              {meetup.rsvps.map((r) => (
                <p key={r.id} className="text-xs text-ink/70">{r.name} · {r.places} plaza(s)</p>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink/[0.07] sticky bottom-0 bg-white">
          <button onClick={onClose} className="text-sm font-semibold text-ink/60 hover:text-ink px-4 py-2.5">Cancelar</button>
          <button onClick={save} disabled={saving} className="bg-ink text-paper hover:bg-accent font-bold text-sm px-6 py-2.5 border border-ink/10 rounded-xl transition-colors disabled:opacity-40">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
