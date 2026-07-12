'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent">Se soltó la línea</p>
        <h1 className="font-display uppercase text-5xl sm:text-6xl leading-[0.95] text-ink">Algo ha fallado</h1>
        <p className="text-ink/60 text-sm">
          Ha ocurrido un error inesperado. Puedes reintentar o volver al inicio; si persiste, vuelve en unos minutos.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-ink text-paper px-6 py-3 text-sm font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover:bg-accent hover:border-accent transition-colors"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="bg-paper text-ink px-6 py-3 text-sm font-bold uppercase tracking-wide border border-ink/15 rounded-xl hover:bg-ink hover:text-paper transition-colors"
          >
            Inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
