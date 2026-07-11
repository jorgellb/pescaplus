'use client'

import { useState, useEffect, useCallback } from 'react'
import { FISHING_TYPES } from '@/lib/fishing'

interface Integrations {
  database: { configured: boolean; backend: 'database' | 'memory' }
  aliexpress: { configured: boolean }
  nvidia: { configured: boolean }
  adminPassword: { usingDefault: boolean }
}

interface Settings {
  storeName: string
  defaultCurrency: string
  defaultType: string
  aiAssistantEnabled: boolean
  productsPerPage: number
}

const field =
  'w-full px-3 py-2.5 bg-slate-950/80 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 text-sm transition-all'
const labelCls = 'text-[11px] font-bold uppercase tracking-widest text-slate-400'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [integrations, setIntegrations] = useState<Integrations | null>(null)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/settings')
    const data = await res.json()
    if (data.success) {
      setSettings(data.settings)
      setIntegrations(data.integrations)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const saveSettings = async () => {
    if (!settings) return
    setSaving(true)
    setNote('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (data.success) {
        setSettings(data.settings)
        setNote('✅ Ajustes guardados.')
      } else {
        setNote('❌ No se pudieron guardar los ajustes.')
      }
    } finally {
      setSaving(false)
    }
  }

  const refreshPrices = async () => {
    setNote('♻️ Consultando AliExpress…')
    const res = await fetch('/api/admin/refresh', { method: 'POST' })
    const data = await res.json()
    if (data.success && data.configured) {
      setNote(`✅ Precios/enlaces revisados: ${data.updated} actualizados, ${data.unavailable} marcados sin stock (de ${data.checked}).`)
    } else if (data.success && !data.configured) {
      setNote('⚠️ AliExpress no está configurado (define ALIEXPRESS_APP_KEY/SECRET).')
    } else {
      setNote('❌ Error al refrescar precios.')
    }
  }

  const resetCatalog = async () => {
    if (!confirm('¿Restablecer el catálogo a los productos originales? Se perderán los cambios.')) return
    const res = await fetch('/api/admin/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    })
    const data = await res.json()
    setNote(data.success ? `♻️ Catálogo restablecido (${data.count} productos).` : '❌ Error al restablecer.')
  }

  const exportCatalog = async () => {
    const res = await fetch('/api/admin/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'export' }),
    })
    const data = await res.json()
    if (!data.success) return
    const blob = new Blob([JSON.stringify(data.products, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pescaplus-catalogo.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!settings || !integrations) {
    return <div className="py-24 text-center text-slate-400 text-sm">Cargando configuración…</div>
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s))

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Configuración</h1>
        <p className="text-sm text-slate-400 mt-1">Integraciones, valores por defecto y mantenimiento del catálogo.</p>
      </div>

      {/* Integrations */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Estado de integraciones</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <IntegrationRow
            title="Base de datos"
            ok={integrations.database.configured}
            detail={
              integrations.database.backend === 'database'
                ? 'Prisma / Neon conectada'
                : 'En memoria (define DATABASE_URL para persistir)'
            }
          />
          <IntegrationRow
            title="AliExpress"
            ok={integrations.aliexpress.configured}
            detail={integrations.aliexpress.configured ? 'API firmada activa' : 'Catálogo local (opcional)'}
          />
          <IntegrationRow
            title="Asistente IA (NVIDIA)"
            ok={integrations.nvidia.configured}
            detail={integrations.nvidia.configured ? 'Modelo remoto activo' : 'Fallback experto offline'}
          />
          <IntegrationRow
            title="Contraseña de admin"
            ok={!integrations.adminPassword.usingDefault}
            detail={integrations.adminPassword.usingDefault ? 'Usando la contraseña por defecto ⚠️' : 'ADMIN_PASSWORD configurada'}
          />
        </div>
      </section>

      {/* Editable settings */}
      <section className="space-y-4 p-5 rounded-2xl border border-white/5 bg-slate-900/30">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Valores por defecto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelCls}>Nombre de la tienda</label>
            <input value={settings.storeName} onChange={(e) => set('storeName', e.target.value)} className={field} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Moneda por defecto</label>
            <input value={settings.defaultCurrency} onChange={(e) => set('defaultCurrency', e.target.value)} className={field} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Modalidad por defecto</label>
            <select value={settings.defaultType} onChange={(e) => set('defaultType', e.target.value)} className={field}>
              {FISHING_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Productos por página</label>
            <input
              type="number"
              min={4}
              max={48}
              value={settings.productsPerPage}
              onChange={(e) => set('productsPerPage', parseInt(e.target.value, 10) || 12)}
              className={field}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.aiAssistantEnabled}
            onChange={(e) => set('aiAssistantEnabled', e.target.checked)}
            className="accent-cyan-500"
          />
          <span className="text-sm text-slate-300">Habilitar asistente IA en la tienda</span>
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-cyan-500/10 active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {saving ? 'Guardando…' : 'Guardar ajustes'}
          </button>
          {note && <span className="text-xs text-slate-400">{note}</span>}
        </div>
      </section>

      {/* Catalog maintenance */}
      <section className="space-y-4 p-5 rounded-2xl border border-white/5 bg-slate-900/30">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Mantenimiento del catálogo</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={refreshPrices}
            className="text-sm font-semibold text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl transition-all"
          >
            ♻️ Refrescar precios y enlaces (AliExpress)
          </button>
          <button
            onClick={exportCatalog}
            className="text-sm font-semibold text-slate-200 bg-slate-800/60 hover:bg-slate-800 border border-white/5 px-4 py-2.5 rounded-xl transition-all"
          >
            ⬇️ Exportar catálogo (JSON)
          </button>
          <button
            onClick={resetCatalog}
            className="text-sm font-semibold text-amber-300 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl transition-all"
          >
            ♻️ Restablecer al catálogo original
          </button>
        </div>
      </section>
    </div>
  )
}

function IntegrationRow({ title, ok, detail }: { title: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-white/5 bg-slate-950/40">
      <span className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-400' : 'bg-slate-600'}`} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  )
}
