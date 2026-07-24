'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Person {
  id: string
  name: string
  contact: string
  places: number
}

/** Attendees + waiting list. The host (holding the management token) sees each
 * person's contact and can remove them; removing frees a spot and auto-promotes
 * the first on the waitlist. */
export default function Roster({
  meetupId,
  attendees,
  waitlist,
  placesTaken,
  isHost,
  manageToken,
}: {
  meetupId: string
  attendees: Person[]
  waitlist: Person[]
  placesTaken: number
  isHost: boolean
  manageToken?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  const remove = async (rsvpId: string) => {
    if (!manageToken) return
    if (!confirm('¿Quitar a esta persona? Si hay lista de espera, subirá el siguiente.')) return
    setBusy(rsvpId)
    try {
      const res = await fetch(`/api/quedadas/${meetupId}/quitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manageToken, rsvpId }),
      })
      if (res.ok) router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const chip = (p: Person, waiting: boolean, i?: number) => (
    <span key={p.id} className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-sm ${waiting ? 'border-amber-700/30 text-ink/70 bg-amber-700/[0.04]' : 'border-ink/12 text-ink'}`}>
      {waiting && i != null && <span className="font-mono text-[10px] text-ink/40">{i + 1}º</span>}
      {p.name}{p.places > 1 ? ` +${p.places - 1}` : ''}
      {isHost && p.contact && <span className="font-mono text-[10px] text-accent">{p.contact}</span>}
      {isHost && (
        <button onClick={() => remove(p.id)} disabled={busy === p.id} aria-label="Quitar" className="text-ink/30 hover:text-red-700 disabled:opacity-50 ml-0.5">✕</button>
      )}
    </span>
  )

  if (attendees.length === 0 && waitlist.length === 0) return null

  return (
    <div className="space-y-3">
      {attendees.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Quién va ({placesTaken})</p>
          <div className="flex flex-wrap gap-2">{attendees.map((p) => chip(p, false))}</div>
        </div>
      )}
      {waitlist.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-amber-700/80">⏳ Lista de espera ({waitlist.length})</p>
          <div className="flex flex-wrap gap-2">{waitlist.map((p, i) => chip(p, true, i))}</div>
        </div>
      )}
    </div>
  )
}
