'use client'

import { useState } from 'react'
import { SEA_SPECIES } from '@/lib/fishing-species'

/** Email alert signup for a zone: "avísame cuando haya ventana buena". */
export default function AlertSignup({ spotSlug, spotName, isSea }: { spotSlug: string; spotName: string; isSea: boolean }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status === 'sending') return
    const data = Object.fromEntries(new FormData(e.currentTarget).entries())
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/alertas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, spotSlug, threshold: 75 }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'No se pudo guardar.')
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    }
  }

  if (status === 'done') {
    return (
      <div className="border border-accent/40 bg-accent/[0.06] rounded-2xl p-5 text-center space-y-1">
        <p className="text-2xl" aria-hidden>🔔</p>
        <p className="font-bold text-ink">¡Alerta activada!</p>
        <p className="text-[13px] text-ink/60">Te avisaremos por email cuando {spotName} tenga una ventana de pesca excelente.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="border border-ink/15 rounded-2xl bg-paper p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>🔔</span>
        <p className="font-display uppercase text-lg text-ink leading-none">Avísame cuando esté bueno</p>
      </div>
      <p className="text-[13px] text-ink/60 leading-relaxed">
        Te mandamos un email cuando {spotName} tenga una ventana de pesca excelente (75+) en los próximos días. Sin spam; baja en un clic.
      </p>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          name="email"
          required
          maxLength={160}
          placeholder="tucorreo@ejemplo.com"
          aria-label="Tu email para las alertas"
          className="flex-1 px-4 py-2.5 bg-paper border border-ink/15 rounded-xl text-ink placeholder-ink/40 focus:outline-none focus:border-accent text-sm"
        />
        {isSea && (
          <select name="especie" aria-label="Especie (opcional)" className="px-3 py-2.5 bg-paper border border-ink/15 rounded-xl text-sm text-ink/80 focus:outline-none focus:border-accent">
            <option value="">Cualquier especie</option>
            {SEA_SPECIES.map((sp) => (
              <option key={sp.id} value={sp.id}>{sp.name}</option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={status === 'sending'}
          className="bg-ink text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-accent transition-colors disabled:opacity-50"
        >
          {status === 'sending' ? 'Guardando…' : 'Activar alerta'}
        </button>
      </div>
      {status === 'error' && <p className="text-sm text-red-700" role="alert">{error}</p>}
    </form>
  )
}
