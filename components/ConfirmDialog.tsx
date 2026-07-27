'use client'

import { useEffect, useRef } from 'react'
import Icon from '@/components/icons/Icon'

/**
 * Confirmación de una acción que no se puede deshacer.
 *
 * `window.confirm()` rompe el sistema de diseño —tipografía del sistema
 * operativo, sin marca, distinto en cada navegador— y en móvil se ve como un
 * aviso de spam. Esto es la misma pregunta con la misma tipografía y los mismos
 * colores que el resto del sitio.
 *
 * Se cierra con Escape, pulsando fuera o con el botón de cancelar: las tres
 * vías tienen que llevar a "no, no borres nada", nunca a "sí" por accidente.
 */
export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Borrar', onConfirm, onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    const alEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', alEscape)
    return () => document.removeEventListener('keydown', alEscape)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-[2px] px-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
        className="w-full max-w-sm bg-paper rounded-2xl shadow-hard-lg border border-ink/[0.07] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-9 h-9 rounded-full bg-red-600/10 text-red-700 flex items-center justify-center">
            <Icon name="warning" className="w-5 h-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p id="confirm-title" className="font-display text-[17px] text-ink leading-tight">{title}</p>
            <p className="text-[13.5px] text-ink/70 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-[13.5px] font-semibold text-ink/70 hover:text-ink rounded-full">
            Cancelar
          </button>
          <button ref={confirmRef} type="button" onClick={onConfirm}
            className="px-4 py-2 text-[13.5px] font-semibold bg-red-700 text-paper rounded-full hover:bg-red-800 transition-colors">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
