'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/** Rate the other party after a trip: the pescador rates the patrón
 * ('toOperator', the default) or the patrón rates a pescador ('toAngler'). */
export default function ReviewForm({ charterId, initialRating = 0, initialText = '', done: alreadyDone = false, direction = 'toOperator', subjectUserId, label }: {
  charterId: string; initialRating?: number; initialText?: string; done?: boolean
  direction?: 'toOperator' | 'toAngler'; subjectUserId?: string; label?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(initialRating)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState(initialText)
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(alreadyDone)

  const submit = async () => {
    if (rating < 1) { setMsg('Elige de 1 a 5 estrellas.'); setState('error'); return }
    setState('saving'); setMsg('')
    try {
      const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ charterId, rating, text, direction, subjectUserId }) })
      const data = await res.json()
      if (!res.ok || !data.success) { setState('error'); setMsg(data.error || 'No se pudo guardar.'); return }
      setDone(true); setOpen(false); router.refresh()
    } catch { setState('error'); setMsg('Fallo de red.') }
  }

  if (done && !open) {
    return <button onClick={() => setOpen(true)} className="text-[12px] font-bold uppercase tracking-wide text-ink/50 hover:text-accent">✓ Valorado · editar</button>
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
      <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={800} rows={2} placeholder={direction === 'toAngler' ? '¿Qué tal a bordo? Puntualidad, trato… (opcional)' : '¿Qué tal la salida? (opcional)'} className="w-full border border-ink/20 rounded-xl bg-paper px-3 py-2 text-sm" />
      {state === 'error' && <p className="text-sm text-red-700">{msg}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={state === 'saving'} className="bg-accent text-paper px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-ink disabled:opacity-60">{state === 'saving' ? 'Guardando…' : 'Enviar valoración'}</button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink/50 hover:text-ink">Cancelar</button>
      </div>
    </div>
  )
}
