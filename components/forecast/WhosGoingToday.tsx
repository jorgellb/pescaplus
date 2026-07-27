'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/icons/Icon'

/** Lightweight "I'm going today" signal for a zone — opt-in, separate from
 * creating a full quedada. The count is public; only marking yourself as
 * going requires an account. */
export default function WhosGoingToday({ spotSlug, loggedIn }: { spotSlug: string; loggedIn: boolean }) {
  const [count, setCount] = useState(0)
  const [going, setGoing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const load = () => {
      fetch(`/api/quien-va?zona=${encodeURIComponent(spotSlug)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.success) { setCount(d.count); setGoing(d.going) } })
        .catch(() => {})
        .finally(() => setLoaded(true))
    }
    load()
  }, [spotSlug])

  const toggle = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/quien-va', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotSlug }),
      })
      const data = await res.json()
      if (res.ok && data.success) { setCount(data.count); setGoing(data.going) }
    } catch {
      /* fallo de red: no es crítico */
    } finally {
      setBusy(false)
    }
  }

  const othersCount = going ? count - 1 : count

  return (
    <div className="border border-ink/[0.07] rounded-2xl bg-paper p-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink/80 inline-flex items-center gap-2">
        <Icon name="users" className="w-4 h-4 text-ink/50" strokeWidth={1.8} />
        {!loaded ? (
          <span className="text-ink/40">Cargando…</span>
        ) : going ? (
          othersCount > 0 ? <>Vas tú y <strong className="text-ink">{othersCount}</strong> {othersCount === 1 ? 'pescador más' : 'pescadores más'} hoy a esta zona.</> : <>Vas tú hoy a esta zona.</>
        ) : count > 0 ? (
          <><strong className="text-ink">{count}</strong> {count === 1 ? 'pescador va' : 'pescadores van'} hoy a esta zona.</>
        ) : (
          <>Aún nadie ha marcado que va hoy. ¿Eres el primero?</>
        )}
      </p>
      {loggedIn ? (
        <button
          onClick={toggle}
          disabled={busy || !loaded}
          className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors disabled:opacity-60 ${
            going ? 'bg-paper text-ink/70 border border-ink/10 hover:text-ink' : 'bg-accent text-paper hover:bg-ink'
          }`}
        >
          {going ? 'Ya no voy' : 'Yo también voy'}
        </button>
      ) : (
        <Link href="/entrar" className="text-sm font-semibold text-accent hover:underline whitespace-nowrap">
          Inicia sesión para marcar que vas
        </Link>
      )}
    </div>
  )
}
