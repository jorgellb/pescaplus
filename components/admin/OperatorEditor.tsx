'use client'

import { useState } from 'react'
import Icon from '@/components/icons/Icon'
import { FISHING_SPOTS } from '@/lib/fishing-spots'

export interface AdminOperator {
  id: string
  name: string
  businessName: string
  email: string
  phone: string
  spotSlug: string
  boatName: string
  boatType: string
  capacity: number
  marina: string
  boatLength: number | null
  boatBeam: number | null
  boatEngineHp: number | null
  boatMaxSpeedKn: number | null
  boatYear: number | null
  crewSize: number
  licenseRef: string
  insuranceRef: string
  bio: string
  verified: boolean
}

interface OperatorEditorProps {
  initial: AdminOperator | null
  onClose: () => void
  onSaved: () => void
}

type FormState = {
  name: string; businessName: string; email: string; phone: string; spotSlug: string
  boatName: string; boatType: string; capacity: string
  marina: string; boatLength: string; boatBeam: string; boatEngineHp: string; boatMaxSpeedKn: string; boatYear: string; crewSize: string
  licenseRef: string; insuranceRef: string; bio: string; verified: boolean
}

function toForm(o: AdminOperator | null): FormState {
  return {
    name: o?.name ?? '', businessName: o?.businessName ?? '', email: o?.email ?? '', phone: o?.phone ?? '',
    spotSlug: o?.spotSlug ?? FISHING_SPOTS[0]?.slug ?? '',
    boatName: o?.boatName ?? '', boatType: o?.boatType ?? '', capacity: o ? String(o.capacity) : '6',
    marina: o?.marina ?? '', boatLength: o?.boatLength != null ? String(o.boatLength) : '', boatBeam: o?.boatBeam != null ? String(o.boatBeam) : '',
    boatEngineHp: o?.boatEngineHp != null ? String(o.boatEngineHp) : '', boatMaxSpeedKn: o?.boatMaxSpeedKn != null ? String(o.boatMaxSpeedKn) : '',
    boatYear: o?.boatYear != null ? String(o.boatYear) : '', crewSize: o ? String(o.crewSize) : '1',
    licenseRef: o?.licenseRef ?? '', insuranceRef: o?.insuranceRef ?? '', bio: o?.bio ?? '', verified: o?.verified ?? false,
  }
}

const field = 'w-full px-3 py-2.5 bg-paper border border-ink/25 rounded-lg text-ink placeholder-ink/60 focus:outline-none focus:border-accent text-sm transition-colors'
const labelCls = 'text-[11px] font-bold uppercase tracking-widest text-ink/60'

export default function OperatorEditor({ initial, onClose, onSaved }: OperatorEditorProps) {
  const [form, setForm] = useState<FormState>(toForm(initial))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const save = async () => {
    setError('')
    if (!form.name.trim()) return setError('Falta el nombre.')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return setError('Email no válido.')
    if (!form.spotSlug) return setError('Falta el puerto base.')
    if (!initial && !form.licenseRef.trim()) return setError('Indica la titulación/licencia.')
    if (!initial && !form.insuranceRef.trim()) return setError('Indica el seguro de ocupantes/RC.')
    setSaving(true)
    const num = (v: string) => (v.trim() === '' ? null : Number(v))
    const payload = {
      name: form.name.trim(), businessName: form.businessName.trim(), email: form.email.trim(), phone: form.phone.trim(),
      spotSlug: form.spotSlug, boatName: form.boatName.trim(), boatType: form.boatType.trim(), capacity: Number(form.capacity) || 6,
      marina: form.marina.trim(), boatLength: num(form.boatLength), boatBeam: num(form.boatBeam),
      boatEngineHp: num(form.boatEngineHp), boatMaxSpeedKn: num(form.boatMaxSpeedKn), boatYear: num(form.boatYear),
      crewSize: Number(form.crewSize) || 1,
      licenseRef: form.licenseRef.trim(), insuranceRef: form.insuranceRef.trim(), bio: form.bio.trim(), verified: form.verified,
    }
    try {
      const res = initial
        ? await fetch(`/api/admin/operadores/${initial.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/admin/operadores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
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
          <h2 className="font-display uppercase text-xl text-ink">{initial ? 'Editar operador' : 'Nuevo operador'}</h2>
          <button onClick={onClose} className="text-ink/60 hover:text-ink"><Icon name="close" className="w-5 h-5" strokeWidth={2} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Nombre del patrón</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Empresa (opcional)</label>
              <input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Email</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Teléfono</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={field} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Puerto base</label>
              <select value={form.spotSlug} onChange={(e) => set('spotSlug', e.target.value)} className={field}>
                {FISHING_SPOTS.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Marina / amarre</label>
              <input value={form.marina} onChange={(e) => set('marina', e.target.value)} className={field} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Nombre barco</label>
              <input value={form.boatName} onChange={(e) => set('boatName', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Tipo barco</label>
              <input value={form.boatType} onChange={(e) => set('boatType', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Capacidad</label>
              <input type="number" min={1} max={50} value={form.capacity} onChange={(e) => set('capacity', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Tripulación</label>
              <input type="number" min={1} max={20} value={form.crewSize} onChange={(e) => set('crewSize', e.target.value)} className={field} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Eslora (m)</label>
              <input type="number" min={2} max={60} step={0.1} value={form.boatLength} onChange={(e) => set('boatLength', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Manga (m)</label>
              <input type="number" min={1} max={20} step={0.1} value={form.boatBeam} onChange={(e) => set('boatBeam', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Potencia (CV)</label>
              <input type="number" min={1} max={5000} value={form.boatEngineHp} onChange={(e) => set('boatEngineHp', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Año</label>
              <input type="number" min={1900} value={form.boatYear} onChange={(e) => set('boatYear', e.target.value)} className={field} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Titulación / licencia</label>
              <input value={form.licenseRef} onChange={(e) => set('licenseRef', e.target.value)} className={field} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Seguro de ocupantes / RC</label>
              <input value={form.insuranceRef} onChange={(e) => set('insuranceRef', e.target.value)} className={field} />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Bio</label>
            <textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} rows={3} className={`${field} resize-y`} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.verified} onChange={(e) => set('verified', e.target.checked)} className="accent-[#0a7d72]" />
            <span className="text-sm text-ink/80">Verificado (puede publicar chárters de pago)</span>
          </label>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink/[0.07] sticky bottom-0 bg-white">
          <button onClick={onClose} className="text-sm font-semibold text-ink/60 hover:text-ink px-4 py-2.5">Cancelar</button>
          <button onClick={save} disabled={saving} className="bg-ink text-paper hover:bg-accent font-bold text-sm px-6 py-2.5 border border-ink/10 rounded-xl transition-colors disabled:opacity-40">
            {saving ? 'Guardando…' : initial ? 'Guardar' : 'Crear operador'}
          </button>
        </div>
      </div>
    </div>
  )
}
