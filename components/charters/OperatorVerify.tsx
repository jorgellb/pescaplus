'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Op { id: string; name: string; businessName: string; email: string; phone: string; spotSlug: string; boatName: string; boatType: string; capacity: number; licenseRef: string; insuranceRef: string; bio: string; verified: boolean }

export default function OperatorVerify({ operators }: { operators: Op[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const act = async (id: string, verified: boolean) => {
    setBusy(id)
    try {
      const res = await fetch('/api/admin/operadores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, verified }) })
      if (res.ok) router.refresh()
    } finally { setBusy(null) }
  }
  if (operators.length === 0) return <p className="text-ink/60 text-sm">No hay operadores registrados todavía.</p>
  return (
    <div className="space-y-3">
      {operators.map((o) => (
        <div key={o.id} className={`border rounded-2xl p-4 ${o.verified ? 'border-accent/30 bg-accent/[0.04]' : 'border-amber-700/30 bg-amber-700/[0.05]'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-ink">{o.businessName || o.name} <span className="font-mono text-[10px] uppercase tracking-widest text-ink/45">{o.verified ? '✓ verificado' : 'pendiente'}</span></p>
              <p className="text-[13px] text-ink/65">{o.name} · {o.email}{o.phone ? ` · ${o.phone}` : ''} · {o.spotSlug} · {o.boatName} {o.boatType} ({o.capacity} plazas)</p>
              <p className="text-[12px] text-ink/55 mt-1">Licencia: <strong>{o.licenseRef}</strong> · Seguro: <strong>{o.insuranceRef}</strong></p>
              {o.bio && <p className="text-[12px] text-ink/50 mt-1">{o.bio}</p>}
            </div>
            <div className="flex gap-2">
              {!o.verified
                ? <button onClick={() => act(o.id, true)} disabled={busy === o.id} className="bg-accent text-paper px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-ink disabled:opacity-60">Verificar</button>
                : <button onClick={() => act(o.id, false)} disabled={busy === o.id} className="bg-paper text-red-700 border border-red-700/40 px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-red-700 hover:text-paper disabled:opacity-60">Revocar</button>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
