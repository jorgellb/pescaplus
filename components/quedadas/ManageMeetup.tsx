'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/icons/Icon'

/** Host-only panel, shown when the private management token is in the URL.
 * Lets the host copy the manage link and cancel the meetup. */
export default function ManageMeetup({ id, manageToken, justCreated }: { id: string; manageToken: string; justCreated: boolean }) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'working' | 'error'>('idle')
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState('')

  const manageUrl = typeof window !== 'undefined' ? `${window.location.origin}/quedadas/${id}?t=${encodeURIComponent(manageToken)}` : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(manageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked */
    }
  }

  const cancel = async () => {
    if (!confirm('¿Seguro que quieres cancelar esta quedada? Los apuntados dejarán de verla.')) return
    setState('working')
    try {
      const res = await fetch(`/api/quedadas/${id}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manageToken }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setState('error')
        setMsg(data.error || 'No se pudo cancelar.')
        return
      }
      router.refresh()
    } catch {
      setState('error')
      setMsg('Fallo de red.')
    }
  }

  return (
    <div className="border border-ink/12 rounded-2xl bg-ink/[0.03] p-4 space-y-3">
      <p className="font-display uppercase text-lg leading-none inline-flex items-center gap-2"><Icon name="key" className="w-4 h-4" strokeWidth={1.8} />Eres el anfitrión</p>
      {justCreated && (
        <p className="text-sm text-ink/80">
          ¡Quedada publicada! <strong>Guarda este enlace privado</strong> para gestionarla o cancelarla — es la única forma de volver a entrar como anfitrión.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={copy} className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2 text-sm font-semibold rounded-full hover:bg-accent transition-colors">
          {copied
            ? <><Icon name="checkCircle" className="w-4 h-4" strokeWidth={1.8} />Copiado</>
            : <><Icon name="clipboard" className="w-4 h-4" strokeWidth={1.8} />Copiar enlace de gestión</>}
        </button>
        <button onClick={cancel} disabled={state === 'working'} className="inline-flex items-center gap-2 bg-paper text-red-700 border border-red-700/40 px-4 py-2 text-sm font-semibold rounded-full hover:bg-red-700 hover:text-paper disabled:opacity-60 transition-colors">
          {state === 'working' ? 'Cancelando…' : 'Cancelar quedada'}
        </button>
      </div>
      {state === 'error' && <p className="text-sm text-red-700">{msg}</p>}
    </div>
  )
}
