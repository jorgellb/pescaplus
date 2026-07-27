'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/icons/Icon'

/** Private field notebook for a zone: "con marea baja el canal de la
 * izquierda va mejor" — visible only to its author, saved to the account
 * (not localStorage), so it follows the pescador across devices. */
export default function SpotNotes({ spotSlug, loggedIn }: { spotSlug: string; loggedIn: boolean }) {
  const [text, setText] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = () => {
      if (!loggedIn) {
        setLoaded(true)
        return
      }
      fetch(`/api/notas-zona?zona=${encodeURIComponent(spotSlug)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.success) setText(d.text) })
        .catch(() => {})
        .finally(() => setLoaded(true))
    }
    load()
  }, [spotSlug, loggedIn])

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/notas-zona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotSlug, text }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch {
      /* fallo de red: no es crítico, el usuario puede reintentar */
    } finally {
      setSaving(false)
    }
  }

  if (!loggedIn) {
    return (
      <div className="border border-ink/[0.07] rounded-2xl bg-paper p-5 space-y-2">
        <p className="font-display uppercase text-lg leading-none inline-flex items-center gap-2">
          <Icon name="notepad" className="w-4 h-4" strokeWidth={1.8} />Tus notas de esta zona
        </p>
        <p className="text-sm text-ink/60">
          Guarda tus propios apuntes de esta zona —qué funciona, con qué marea, qué evitar— visibles solo para ti.{' '}
          <Link href="/entrar" className="text-accent font-semibold hover:underline">Inicia sesión</Link> para empezar tu cuaderno.
        </p>
      </div>
    )
  }

  if (!loaded) {
    return <div className="border border-ink/[0.07] rounded-2xl bg-ink/[0.02] h-[168px] animate-pulse" aria-hidden />
  }

  return (
    <div className="border border-ink/[0.07] rounded-2xl bg-paper p-5 space-y-3">
      <p className="font-display uppercase text-lg leading-none inline-flex items-center gap-2">
        <Icon name="notepad" className="w-4 h-4" strokeWidth={1.8} />Tus notas de esta zona
      </p>
      <p className="text-[12.5px] text-ink/60">Privadas: solo tú las ves. Se guardan en tu cuenta, no en este navegador.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="Ej.: con marea baja el canal de la izquierda va mejor; evitar cuando hay levante fuerte…"
        className="w-full border border-ink/12 rounded-xl bg-paper px-3 py-2.5 text-sm resize-y focus:outline-none focus:border-accent"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-ink text-paper px-5 py-2 text-sm font-semibold rounded-full hover:bg-accent disabled:opacity-60 transition-colors"
        >
          {saving ? 'Guardando…' : 'Guardar nota'}
        </button>
        {saved && (
          <span className="text-sm text-accent inline-flex items-center gap-1">
            <Icon name="checkCircle" className="w-3.5 h-3.5" strokeWidth={2} />Guardado
          </span>
        )}
      </div>
    </div>
  )
}
