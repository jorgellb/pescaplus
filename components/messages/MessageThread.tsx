'use client'

import { useState, useEffect, useRef } from 'react'

interface Msg { id: string; sender: 'user' | 'operator'; body: string; createdAt: number }

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function MessageThread({ threadId, initial, myRole }: { threadId: string; initial: Msg[]; myRole: 'user' | 'operator' }) {
  const [messages, setMessages] = useState<Msg[]>(initial)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  // Marca el hilo como leído al abrirlo.
  useEffect(() => {
    fetch(`/api/mensajes/${threadId}/leido`, { method: 'POST' }).catch(() => {})
  }, [threadId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setSending(true); setErr('')
    try {
      const res = await fetch(`/api/mensajes/${threadId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text }) })
      const data = await res.json()
      if (!res.ok || !data.success) { setErr(data.error || 'No se pudo enviar.'); return }
      setMessages((m) => [...m, data.message])
      setBody('')
    } catch { setErr('Fallo de red.') } finally { setSending(false) }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2.5 max-h-[55vh] overflow-y-auto border border-ink/[0.07] rounded-2xl bg-paper p-4">
        {messages.length === 0 && <p className="text-sm text-ink/60 text-center py-6">Aún no hay mensajes. Escribe el primero 👇</p>}
        {messages.map((m) => {
          const mine = m.sender === myRole
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${mine ? 'bg-accent text-paper' : 'bg-ink/[0.06] text-ink'}`}>
                <p className="text-[14px] whitespace-pre-line break-words">{m.body}</p>
                <p className={`text-[10px] mt-0.5 ${mine ? 'text-paper/70' : 'text-ink/60'}`}>{fmtTime(m.createdAt)}</p>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={2} placeholder="Escribe un mensaje…"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e) }}
          className="flex-1 border border-ink/12 rounded-xl bg-paper px-3 py-2 text-sm resize-none" />
        <button type="submit" disabled={sending || !body.trim()} className="self-end bg-accent text-paper px-5 py-2.5 text-sm font-semibold rounded-full hover:bg-ink disabled:opacity-50 transition-colors">{sending ? '…' : 'Enviar'}</button>
      </form>
      {err && <p className="text-sm text-red-700">{err}</p>}
    </div>
  )
}
