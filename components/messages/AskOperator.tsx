'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/** "Message the patrón" entry point on a charter page. Opens (or reuses) the
 * thread for this charter and takes the pescador to the conversation. */
export default function AskOperator({ charterId, loggedIn, isOwner }: { charterId: string; loggedIn: boolean; isOwner: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (isOwner) return null

  if (!loggedIn) {
    return (
      <Link href="/entrar" className="inline-flex items-center gap-1.5 border border-ink/20 text-ink px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-ink hover:text-paper transition-colors">
        💬 Inicia sesión para escribir al patrón
      </Link>
    )
  }

  const open = async () => {
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/mensajes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ charterId }) })
      const data = await res.json()
      if (!res.ok || !data.success) { setErr(data.error || 'No se pudo abrir la conversación.'); setBusy(false); return }
      router.push(`/cuenta/mensajes/${data.threadId}`)
    } catch { setErr('Fallo de red.'); setBusy(false) }
  }

  return (
    <div>
      <button onClick={open} disabled={busy} className="inline-flex items-center gap-1.5 border border-accent/40 text-accent px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-accent hover:text-paper disabled:opacity-60 transition-colors">
        💬 {busy ? 'Abriendo…' : 'Preguntar al patrón'}
      </button>
      {err && <p className="text-sm text-red-700 mt-1">{err}</p>}
    </div>
  )
}
