'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Meetup } from '@/lib/meetups-store'
import { getSpot } from '@/lib/fishing-spots'
import MeetupEditor from '@/components/admin/MeetupEditor'
import Icon from '@/components/icons/Icon'

export type AdminMeetup = Meetup

const STATUS_LABEL: Record<AdminMeetup['status'], string> = { open: 'Abierta', confirmed: 'Confirmada', cancelled: 'Cancelada' }
const STATUS_CLASS: Record<AdminMeetup['status'], string> = {
  open: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-ink/10 text-ink/60',
}

export default function AdminMeetupsPage() {
  const [meetups, setMeetups] = useState<AdminMeetup[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminMeetup | null>(null)
  const [filter, setFilter] = useState<'todos' | AdminMeetup['status']>('todos')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/quedadas')
      const data = await res.json()
      if (data.success) setMeetups(data.meetups)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const cancel = async (m: AdminMeetup) => {
    const res = await fetch(`/api/admin/quedadas/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) })
    if (res.ok) load()
    else alert('No se pudo cancelar.')
  }

  const remove = async (m: AdminMeetup) => {
    if (!confirm(`¿Eliminar la quedada de ${m.hostName} (${m.dateISO})? Se borrarán también sus inscripciones.`)) return
    const res = await fetch(`/api/admin/quedadas/${m.id}`, { method: 'DELETE' })
    if (res.ok) setMeetups((prev) => prev.filter((x) => x.id !== m.id))
    else alert('No se pudo eliminar.')
  }

  const closeEditor = () => setEditing(null)
  const onSaved = () => { closeEditor(); load() }

  const visible = filter === 'todos' ? meetups : meetups.filter((m) => m.status === filter)

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-ink/[0.07] pb-4">
        <div>
          <h1 className="font-display uppercase text-3xl md:text-4xl text-ink leading-none">Quedadas</h1>
          <p className="text-ink/60 text-sm mt-1">Salidas gratuitas organizadas por la comunidad, de cualquier zona y estado.</p>
        </div>
        <div className="flex items-center gap-2">
          {(['todos', 'open', 'confirmed', 'cancelled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${filter === f ? 'bg-accent/10 text-accent border border-accent/40' : 'text-ink/60 border border-transparent hover:bg-ink/5'}`}
            >
              {f === 'todos' ? 'Todos' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-ink/60 text-sm">Cargando quedadas…</div>
      ) : visible.length === 0 ? (
        <div className="py-20 text-center text-ink/60 text-sm border border-ink/10 bg-white rounded-2xl">No hay quedadas que coincidan.</div>
      ) : (
        <div className="overflow-x-auto border border-ink/10 rounded-2xl bg-white">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-ink/60 border-b border-ink/10">
                <th className="px-4 py-3 font-bold">Fecha</th>
                <th className="px-4 py-3 font-bold">Zona</th>
                <th className="px-4 py-3 font-bold">Anfitrión</th>
                <th className="px-4 py-3 font-bold">Plazas</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => (
                <tr key={m.id} className="border-b border-ink/10 last:border-0 hover:bg-ink/[0.02]">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-semibold text-ink">{new Date(`${m.dateISO}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
                    <p className="text-[11px] text-ink/60">{m.timeStart}</p>
                  </td>
                  <td className="px-4 py-3 text-ink/70">{getSpot(m.spotSlug)?.name || m.spotSlug}</td>
                  <td className="px-4 py-3 text-ink/70 max-w-[160px] truncate">{m.hostName}</td>
                  <td className="px-4 py-3 text-ink/70">{m.placesTaken}/{m.maxPlaces}{m.waitlist.length > 0 ? ` (+${m.waitlist.length} espera)` : ''}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_CLASS[m.status]}`}>{STATUS_LABEL[m.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`/quedadas/${m.id}`} target="_blank" className="text-xs font-semibold text-ink/70 hover:text-accent px-3 py-1.5">Ver</a>
                      <button onClick={() => setEditing(m)} className="text-xs font-semibold text-ink/80 hover:text-accent bg-ink/5 border border-ink/10 px-3 py-1.5 rounded-lg">Editar</button>
                      {m.status !== 'cancelled' && (
                        <button onClick={() => cancel(m)} className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">Cancelar</button>
                      )}
                      <button onClick={() => remove(m)} className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && meetups.length > 0 && (
        <p className="text-[11px] text-ink/60 inline-flex items-center gap-1.5">
          <Icon name="users" className="w-3.5 h-3.5" strokeWidth={1.8} />{meetups.length} quedadas en total
        </p>
      )}

      {editing && <MeetupEditor meetup={editing} onClose={closeEditor} onSaved={onSaved} />}
    </div>
  )
}
