'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { scoreHex, scoreLabel } from '@/lib/forecast-format'
import type { SpotDayScore } from '@/lib/day-scores'

/**
 * "Best zones near me" for the selected day. Geolocation runs client-side
 * (Permissions-Policy allows self); the scores arrive precomputed as props so
 * ranking by distance needs no further requests. The last position is kept in
 * localStorage, so returning visitors see their local ranking instantly.
 */
const LOC_KEY = 'pescaplus-last-loc'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(a))
}

export default function NearMeDay({ spots, showNav }: { spots: SpotDayScore[]; showNav: boolean }) {
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    const load = () => {
      try {
        const saved = localStorage.getItem(LOC_KEY)
        if (saved) setPos(JSON.parse(saved))
      } catch {
        /* ignore */
      }
    }
    load()
  }, [])

  const locate = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setState('error')
      return
    }
    setState('loading')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lon: p.coords.longitude }
        setPos(next)
        setState('idle')
        try {
          localStorage.setItem(LOC_KEY, JSON.stringify(next))
        } catch {
          /* ignore */
        }
      },
      () => setState('error'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }

  const nearby = pos
    ? spots
        .map((s) => ({ ...s, km: haversineKm(pos.lat, pos.lon, s.lat, s.lon) }))
        .filter((s) => s.km <= 200)
        .sort((a, b) => b.score - a.score || a.km - b.km || (a.windMax ?? 99) - (b.windMax ?? 99))
    : []
  const rankedMar = nearby.filter((s) => s.type === 'mar').slice(0, 10)
  const rankedInterior = nearby.filter((s) => s.type === 'interior').slice(0, 4)

  return (
    <div className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display uppercase text-xl sm:text-2xl leading-none">📍 Las mejores cerca de ti</h2>
        <button
          onClick={locate}
          disabled={state === 'loading'}
          className="inline-flex items-center gap-2 bg-accent text-paper px-4 py-2 text-xs font-bold uppercase tracking-wide border border-accent rounded-xl shadow-hard hover-shift hover:bg-ink hover:border-ink disabled:opacity-60 transition-colors"
        >
          {state === 'loading' ? 'Localizando…' : pos ? 'Actualizar ubicación' : 'Usar mi ubicación'}
        </button>
      </div>

      {state === 'error' && (
        <p className="text-xs text-red-700">No pudimos obtener tu ubicación. Revisa los permisos del navegador.</p>
      )}

      {!pos && state !== 'error' && (
        <p className="text-sm text-ink/60">
          Pulsa el botón y ordenamos las zonas a menos de 200 km de ti por puntuación del día elegido.
        </p>
      )}

      {pos && rankedMar.length === 0 && rankedInterior.length === 0 && (
        <p className="text-sm text-ink/60">No hay zonas a menos de 200 km de tu posición.</p>
      )}

      {rankedMar.length > 0 && (
        <div className="space-y-2">
          {rankedInterior.length > 0 && <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">🌊 Costa</p>}
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rankedMar.map((s, i) => (
              <NearRow key={s.slug} s={s} i={i} showNav={showNav} />
            ))}
          </ol>
        </div>
      )}

      {rankedInterior.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">🎣 Embalses y ríos</p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rankedInterior.map((s, i) => (
              <NearRow key={s.slug} s={s} i={i} showNav={showNav} />
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function NearRow({ s, i, showNav }: { s: SpotDayScore & { km: number }; i: number; showNav: boolean }) {
  const note = s.waveUnknown
    ? '· sin dato de oleaje'
    : showNav && s.navegabilidad === 'no'
      ? '· no navegable'
      : showNav && s.navegabilidad === 'unknown'
        ? '· navegación sin confirmar'
        : ''
  return (
    <li>
      <Link
        href={`/mejores-horas/${s.slug}`}
        className="flex items-center gap-3 border border-ink/12 rounded-xl px-3 py-2.5 bg-paper hover:border-accent transition-colors"
      >
        <span className="font-mono text-[11px] font-bold text-ink/40 w-5 text-right shrink-0">{i + 1}</span>
        <span
          className="font-mono text-sm font-bold text-paper rounded-lg px-2 py-1 shrink-0"
          style={{ backgroundColor: s.waveUnknown ? '#9c9484' : scoreHex(s.score) }}
        >
          {s.score}
        </span>
        <span className="min-w-0">
          <span className="block font-bold text-ink text-sm truncate">{s.name}</span>
          <span className="block font-mono text-[10px] uppercase tracking-widest text-ink/45 truncate">
            a {Math.round(s.km)} km · {scoreLabel(s.score)} {note}
          </span>
        </span>
      </Link>
    </li>
  )
}
