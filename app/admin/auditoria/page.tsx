'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { AuditLogEntry, AuditAction } from '@/lib/admin-audit'
import Icon, { type IconName } from '@/components/icons/Icon'

const ACTION_LABEL: Record<AuditAction, string> = {
  create: 'Creado',
  update: 'Editado',
  delete: 'Eliminado',
  verify: 'Verificado',
  unverify: 'Revocado',
}
const ACTION_ICON: Record<AuditAction, IconName> = {
  create: 'plus',
  update: 'edit',
  delete: 'ban',
  verify: 'checkCircle',
  unverify: 'warning',
}
const ACTION_CLASS: Record<AuditAction, string> = {
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  verify: 'bg-accent/10 text-accent',
  unverify: 'bg-amber-100 text-amber-700',
}
const ENTITY_LABEL: Record<string, string> = {
  charter: 'Chárter',
  operator: 'Operador',
  meetup: 'Quedada',
  review: 'Reseña',
  user: 'Usuario',
  contactMessage: 'Mensaje',
  product: 'Producto',
  guide: 'Guía',
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'medium' })
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState<string>('todas')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/auditoria')
      const data = await res.json()
      if (data.success) setEntries(data.entries)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const entityOptions = useMemo(() => ['todas', ...Array.from(new Set(entries.map((e) => e.entity)))], [entries])
  const visible = entityFilter === 'todas' ? entries : entries.filter((e) => e.entity === entityFilter)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ink/[0.07] pb-4">
        <div>
          <h1 className="font-display uppercase text-3xl md:text-4xl text-ink leading-none">Auditoría</h1>
          <p className="text-ink/60 text-sm mt-1">Qué se ha creado, editado o borrado desde el panel — con fecha e IP de origen.</p>
        </div>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-2 bg-paper border border-ink/25 rounded-lg text-ink text-sm focus:outline-none focus:border-accent"
        >
          {entityOptions.map((e) => (
            <option key={e} value={e}>{e === 'todas' ? 'Todas las entidades' : ENTITY_LABEL[e] || e}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-24 text-center text-ink/60 text-sm">Cargando registro…</div>
      ) : visible.length === 0 ? (
        <div className="py-20 text-center text-ink/60 text-sm border border-ink/10 bg-white rounded-2xl">Todavía no hay acciones registradas.</div>
      ) : (
        <div className="overflow-x-auto border border-ink/10 rounded-2xl bg-white">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-ink/60 border-b border-ink/10">
                <th className="px-4 py-3 font-bold">Fecha</th>
                <th className="px-4 py-3 font-bold">Acción</th>
                <th className="px-4 py-3 font-bold">Entidad</th>
                <th className="px-4 py-3 font-bold">Detalle</th>
                <th className="px-4 py-3 font-bold">IP</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e.id} className="border-b border-ink/10 last:border-0 hover:bg-ink/[0.02]">
                  <td className="px-4 py-3 text-ink/60 whitespace-nowrap font-mono text-xs">{formatDate(e.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${ACTION_CLASS[e.action]}`}>
                      <Icon name={ACTION_ICON[e.action]} className="w-3 h-3" strokeWidth={2.2} />{ACTION_LABEL[e.action]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink/70">{ENTITY_LABEL[e.entity] || e.entity}</td>
                  <td className="px-4 py-3 text-ink/80 max-w-[360px] truncate">{e.summary || <span className="text-ink/40">—</span>}</td>
                  <td className="px-4 py-3 text-ink/60 font-mono text-xs">{e.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <p className="text-[11px] text-ink/60 inline-flex items-center gap-1.5">
          <Icon name="clipboard" className="w-3.5 h-3.5" strokeWidth={1.8} />{entries.length} acciones registradas
        </p>
      )}
    </div>
  )
}
