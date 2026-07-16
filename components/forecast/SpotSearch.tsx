'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FISHING_SPOTS } from '@/lib/fishing-spots'

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export default function SpotSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const nq = normalize(q.trim())
    if (nq.length < 2) return []
    const starts = FISHING_SPOTS.filter((s) => normalize(s.name).startsWith(nq))
    const contains = FISHING_SPOTS.filter(
      (s) => !starts.includes(s) && (normalize(s.name).includes(nq) || normalize(s.region).includes(nq)),
    )
    return [...starts, ...contains].slice(0, 8)
  }, [q])

  const go = (slug: string) => {
    setOpen(false)
    setQ('')
    router.push(`/mejores-horas/${slug}`)
  }

  return (
    <div className="relative max-w-xl">
      <input
        ref={inputRef}
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) {
            e.preventDefault()
            go(results[0].slug)
          }
          if (e.key === 'Escape') {
            setOpen(false)
            inputRef.current?.blur()
          }
        }}
        placeholder="Busca tu localidad: Tarifa, Sanxenxo, La Manga…"
        aria-label="Buscar localidad de pesca"
        className="w-full pl-10 pr-4 py-3.5 bg-paper border border-ink/15 rounded-xl text-ink placeholder-ink/40 focus:outline-none focus:border-accent text-[15px] shadow-hard transition-colors"
      />
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/50 pointer-events-none" aria-hidden>🔍</span>

      {open && results.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-2 bg-paper border border-ink/15 rounded-xl shadow-hard-md overflow-hidden">
          {results.map((s, i) => (
            <li key={s.slug}>
              <Link
                href={`/mejores-horas/${s.slug}`}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-ink hover:text-paper transition-colors ${i === 0 ? 'bg-ink/[0.04]' : ''}`}
              >
                <span className="font-bold text-sm">{s.type === 'mar' ? '🌊' : '🎣'} {s.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">{s.region}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {open && q.trim().length >= 2 && results.length === 0 && (
        <p className="absolute z-30 left-0 right-0 mt-2 bg-paper border border-ink/15 rounded-xl px-4 py-3 text-sm text-ink/60">
          Sin resultados. Prueba con la localidad costera más cercana o usa el mapa.
        </p>
      )}
    </div>
  )
}
