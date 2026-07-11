'use client'

import { useState, useEffect, useCallback } from 'react'
import { fishingLabel } from '@/lib/fishing'

interface Stats {
  total: number
  last7: number
  windowDays: number
  byProduct: { productId: string; title: string; count: number }[]
  byCategory: { typeFishing: string; count: number }[]
  byDay: { date: string; count: number }[]
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/analytics')
      const data = await res.json()
      if (data.success) setStats(data.stats)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  if (loading) return <div className="py-24 text-center text-slate-400 text-sm">Cargando analítica…</div>
  if (!stats) return <div className="py-24 text-center text-slate-400 text-sm">No se pudo cargar la analítica.</div>

  const dayMax = Math.max(...stats.byDay.map((d) => d.count), 1)
  const prodMax = Math.max(...stats.byProduct.map((p) => p.count), 1)
  const catMax = Math.max(...stats.byCategory.map((c) => c.count), 1)
  const topCat = stats.byCategory[0]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Analítica de afiliados</h1>
        <p className="text-sm text-slate-400 mt-1">
          Clics en los botones de compra (redirecciones a AliExpress). Ventana: últimos {stats.windowDays} días.
        </p>
      </div>

      {stats.total === 0 ? (
        <div className="py-20 text-center border border-white/5 rounded-2xl bg-slate-900/20 space-y-3">
          <span className="text-5xl">📊</span>
          <p className="text-slate-300 font-semibold">Aún no hay clics registrados</p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Cuando los visitantes pulsen <span className="text-emerald-400 font-semibold">Comprar</span>, verás aquí qué
            productos y categorías convierten.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Clics totales" value={stats.total.toLocaleString('es-ES')} icon="🖱️" />
            <Kpi label="Clics (7 días)" value={stats.last7.toLocaleString('es-ES')} icon="📈" />
            <Kpi label="Productos con clics" value={String(stats.byProduct.length)} icon="📦" />
            <Kpi label="Categoría top" value={topCat ? fishingLabel(topCat.typeFishing) : '—'} icon="🏆" small />
          </div>

          {/* Daily bar chart (single series) */}
          <section className="rounded-2xl border border-white/5 bg-slate-900/30 p-5">
            <h2 className="text-sm font-bold text-slate-200 mb-4">Clics por día (últimos 14)</h2>
            <div className="flex items-end gap-1.5 h-40" role="img" aria-label="Clics por día, últimos 14 días">
              {stats.byDay.map((d) => {
                const pct = Math.round((d.count / dayMax) * 100)
                const label = new Date(d.date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 group" title={`${label}: ${d.count} clics`}>
                    <span className="text-[10px] text-slate-400 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</span>
                    <div
                      className="w-full rounded-t bg-sky-500/80 group-hover:bg-sky-400 transition-colors min-h-[2px]"
                      style={{ height: `${Math.max(pct, d.count > 0 ? 4 : 0)}%` }}
                    />
                    <span className="text-[9px] text-slate-500 tabular-nums">{label.slice(0, 2)}</span>
                  </div>
                )
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top products */}
            <section className="rounded-2xl border border-white/5 bg-slate-900/30 p-5">
              <h2 className="text-sm font-bold text-slate-200 mb-4">Productos más clicados</h2>
              <div className="space-y-3">
                {stats.byProduct.map((p) => (
                  <a key={p.productId} href={`/products/${p.productId}`} target="_blank" className="block group" title={`${p.count} clics`}>
                    <div className="flex justify-between items-center gap-2 mb-1">
                      <span className="text-xs text-slate-300 truncate group-hover:text-sky-400 transition-colors">{p.title}</span>
                      <span className="text-xs font-bold text-slate-200 tabular-nums flex-shrink-0">{p.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.round((p.count / prodMax) * 100)}%` }} />
                    </div>
                  </a>
                ))}
              </div>
            </section>

            {/* By category */}
            <section className="rounded-2xl border border-white/5 bg-slate-900/30 p-5">
              <h2 className="text-sm font-bold text-slate-200 mb-4">Clics por categoría</h2>
              <div className="space-y-3">
                {stats.byCategory.map((c) => (
                  <div key={c.typeFishing} title={`${c.count} clics`}>
                    <div className="flex justify-between items-center gap-2 mb-1">
                      <span className="text-xs text-slate-300">{fishingLabel(c.typeFishing)}</span>
                      <span className="text-xs font-bold text-slate-200 tabular-nums">{c.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round((c.count / catMax) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value, icon, small }: { label: string; value: string; icon: string; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-4 flex items-center gap-3">
      <span className="text-2xl p-2.5 bg-slate-950/60 rounded-xl border border-white/5">{icon}</span>
      <div className="min-w-0">
        <p className={`font-extrabold text-slate-100 leading-none truncate ${small ? 'text-base' : 'text-xl'}`}>{value}</p>
        <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  )
}
