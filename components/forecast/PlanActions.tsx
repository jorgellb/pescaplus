'use client'

import { useState } from 'react'

/** Print / copy-link actions for the fishing plan (WhatsApp is a plain link). */
export default function PlanActions({ waText }: { waText: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-accent text-paper px-4 py-2.5 text-xs font-bold uppercase tracking-wide border border-accent rounded-xl shadow-hard hover-shift hover:bg-ink hover:border-ink transition-colors"
      >
        💬 Compartir por WhatsApp
      </a>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 text-xs font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift hover:bg-accent hover:border-accent transition-colors"
      >
        🖨️ Imprimir
      </button>
      <button
        onClick={copy}
        className="inline-flex items-center gap-2 bg-paper text-ink px-4 py-2.5 text-xs font-bold uppercase tracking-wide border border-ink/15 rounded-xl hover:bg-ink hover:text-paper transition-colors"
      >
        {copied ? '✓ Copiado' : '🔗 Copiar enlace'}
      </button>
    </div>
  )
}
