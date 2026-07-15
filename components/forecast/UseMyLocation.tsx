'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UseMyLocation({ className = '' }: { className?: string }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  const locate = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setState('error')
      setMsg('Tu navegador no permite geolocalización.')
      return
    }
    setState('loading')
    setMsg('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4)
        const lon = pos.coords.longitude.toFixed(4)
        router.push(`/mejores-horas/ubicacion?lat=${lat}&lon=${lon}`)
      },
      () => {
        setState('error')
        setMsg('No pudimos obtener tu ubicación. Revisa los permisos del navegador.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <div className={className}>
      <button
        onClick={locate}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-2 bg-accent text-paper px-4 py-2.5 text-xs font-bold uppercase tracking-wide border border-accent rounded-xl shadow-hard hover-shift hover:bg-ink hover:border-ink disabled:opacity-60 transition-colors"
      >
        📍 {state === 'loading' ? 'Localizando…' : 'Usar mi ubicación'}
      </button>
      {state === 'error' && <p className="text-xs text-red-700 mt-1.5">{msg}</p>}
    </div>
  )
}
