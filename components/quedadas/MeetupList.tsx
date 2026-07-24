'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

export interface MeetupCard {
  id: string
  spotSlug: string
  spotName: string
  region: string
  lat: number
  lon: number
  modality: 'tierra' | 'kayak' | 'barco'
  kind: 'quedada' | 'llamada'
  dayLabel: string
  timeStart: string
  speciesName: string | null
  level: string
  costLabel: string
  status: string
  placesTaken: number
  maxPlaces: number
}

const MOD = [
  { id: 'todas', label: 'Todas' },
  { id: 'tierra', label: '🏖️ Orilla' },
  { id: 'kayak', label: '🛶 Kayak' },
  { id: 'barco', label: '🚤 Barco' },
]
const LOC_KEY = 'pescaplus-last-loc'

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const r = Math.PI / 180
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

export default function MeetupList({ meetups }: { meetups: MeetupCard[] }) {
  const [modality, setModality] = useState('todas')
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null)
  const [locating, setLocating] = useState(false)

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
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lon: p.coords.longitude }
        setPos(next)
        setLocating(false)
        try {
          localStorage.setItem(LOC_KEY, JSON.stringify(next))
        } catch {
          /* ignore */
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }

  const shown = useMemo(() => {
    let list = meetups.filter((m) => modality === 'todas' || m.modality === modality)
    if (pos) {
      list = list
        .map((m) => ({ ...m, km: haversineKm(pos, m) }))
        .sort((a, b) => a.km - b.km)
    }
    return list as (MeetupCard & { km?: number })[]
  }, [meetups, modality, pos])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {MOD.map((m) => (
          <button
            key={m.id}
            onClick={() => setModality(m.id)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold uppercase tracking-wide transition-colors ${
              modality === m.id ? 'bg-accent text-paper border-accent' : 'bg-paper text-ink/70 border-ink/15 hover:border-accent hover:text-accent'
            }`}
          >
            {m.label}
          </button>
        ))}
        <button
          onClick={locate}
          disabled={locating}
          className="px-3.5 py-2 rounded-xl border text-xs font-bold uppercase tracking-wide bg-paper text-ink/70 border-ink/15 hover:border-accent hover:text-accent disabled:opacity-60 transition-colors"
        >
          📍 {locating ? 'Localizando…' : pos ? 'Cerca de mí ✓' : 'Cerca de mí'}
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-ink/60 border border-ink/12 rounded-2xl p-5 bg-paper">No hay quedadas con este filtro.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shown.map((m) => {
            const full = m.placesTaken >= m.maxPlaces
            return (
              <li key={m.id}>
                <Link href={`/quedadas/${m.id}`} className="block border border-ink/12 rounded-2xl bg-paper p-4 hover:border-accent transition-colors h-full">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
                      {MOD.find((x) => x.id === m.modality)?.label ?? m.modality} · <span className="capitalize">{m.dayLabel}</span> · {m.timeStart}
                    </span>
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${m.status === 'confirmed' ? 'text-accent' : 'text-ink/40'}`}>
                      {m.kind === 'llamada'
                        ? m.status === 'confirmed'
                          ? '¡Grupo formado!'
                          : `${m.placesTaken} interesados`
                        : m.status === 'confirmed'
                          ? 'Confirmada'
                          : `${m.placesTaken}/${m.maxPlaces}`}
                    </span>
                  </div>
                  <p className="font-display uppercase text-xl text-ink leading-none mt-2">{m.spotName}</p>
                  <p className="text-[13px] text-ink/65 mt-1">
                    {m.speciesName ? `A por ${m.speciesName.toLowerCase()} · ` : ''}
                    nivel {m.level}
                    {m.kind === 'llamada'
                      ? m.status !== 'confirmed'
                        ? ` · faltan ${Math.max(0, m.maxPlaces - m.placesTaken)}`
                        : ''
                      : ` · ${m.costLabel}${full ? ' · completa' : ` · faltan ${m.maxPlaces - m.placesTaken}`}`}
                    {m.km != null ? ` · a ${Math.round(m.km)} km` : ''}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
