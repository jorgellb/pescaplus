'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/** Rate the other party after a trip: the pescador rates the patrón
 * ('toOperator', the default) or the patrón rates a pescador ('toAngler'). */
export default function ReviewForm({ charterId, initialRating = 0, initialText = '', done: alreadyDone = false, direction = 'toOperator', subjectUserId, label, pending: initialPending = false }: {
  charterId: string; initialRating?: number; initialText?: string; done?: boolean
  direction?: 'toOperator' | 'toAngler'; subjectUserId?: string; label?: string; pending?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(initialRating)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState(initialText)
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(alreadyDone)
  const [pending, setPending] = useState(initialPending)

  const submit = async () => {
    if (rating < 1) { setMsg('Elige de 1 a 5 estrellas.'); setState('error'); return }
    setState('saving'); setMsg('')
    try {
      const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ charterId, rating, text, direction, subjectUserId }) })
      const data = await res.json()
      if (!res.ok || !data.success) { setState('error'); setMsg(data.error || 'No se pudo guardar.'); return }
      setDone(true); setPending(!!data.review?.pending); setOpen(false); router.refresh()
    } catch { setState('error'); setMsg('Fallo de red.') }
  }

  if (done && !open) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <button onClick={() => setOpen(true)} className="text-[12px] font-bold uppercase tracking-wide text-ink/60 hover:text-accent">✓ Valorado · editar</button>
        {pending && <span className="font-mono text-[10px] uppercase tracking-wide text-amber-700" title={`Se publicará cuando ${direction === 'toAngler' ? 'el pescador' : 'el patrón'} te valore, o a los 14 días`}>🔒 pendiente de publicarse</span>}
      </span>
    )
  }
  if (!open) {
    return <button onClick={() => setOpen(true)} className="text-[12px] font-bold uppercase tracking-wide text-accent hover:underline">★ {label ?? (direction === 'toAngler' ? 'Valorar al pescador' : 'Valorar al patrón')}</button>
  }
  return (
    <div className="mt-2 border-t border-ink/10 pt-3 space-y-2">
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}
            className={`text-2xl leading-none ${(hover || rating) >= n ? 'text-amber-500' : 'text-ink/20'}`} aria-label={`${n} estrellas`}>★</button>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={800} rows={2} placeholder={direction === 'toAngler' ? '¿Qué tal a bordo? Puntualidad, trato… (opcional)' : '¿Qué tal la salida? (opcional)'} className="w-full border border-ink/12 rounded-xl bg-paper px-3 py-2 text-sm" />
      <p className="text-[11px] text-ink/60 leading-snug">
        🔒 Valoración a ciegas: no se publicará hasta que {direction === 'toAngler' ? 'el pescador' : 'el patrón'} también valore la salida, o hasta que pasen 14 días. Así nadie responde condicionado por lo que le hayan puesto.
      </p>
      {state === 'error' && <p className="text-sm text-red-700">{msg}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={state === 'saving'} className="bg-accent text-paper px-4 py-2 text-sm font-semibold rounded-full hover:bg-ink disabled:opacity-60">{state === 'saving' ? 'Guardando…' : 'Enviar valoración'}</button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-semibold text-ink/60 hover:text-ink">Cancelar</button>
      </div>
    </div>
  )
}
