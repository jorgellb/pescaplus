'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import Icon from '@/components/icons/Icon'

/**
 * Reemplazo propio de `window.confirm()` / `window.alert()` para el panel de
 * admin: los diálogos nativos no se pueden estilar, bloquean el hilo (feo con
 * animaciones en curso) y en algunos navegadores móviles ni siquiera muestran
 * el texto largo completo. Un único provider en `AdminChrome` basta para que
 * cualquier página del admin use `useConfirm()` / `useToast()`.
 */

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' pinta el botón de confirmar en rojo — para borrados. */
  tone?: 'default' | 'danger'
}

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error'
}

interface FeedbackContextValue {
  confirm: (opts: ConfirmOptions | string) => Promise<boolean>
  toast: (message: string, type?: 'success' | 'error') => void
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export function useConfirm() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de AdminFeedbackProvider')
  return ctx.confirm
}

export function useToast() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de AdminFeedbackProvider')
  return ctx.toast
}

export default function AdminFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const confirm = useCallback((opts: ConfirmOptions | string) => {
    const normalized = typeof opts === 'string' ? { message: opts } : opts
    setPending(normalized)
    return new Promise<boolean>((resolve) => { resolver.current = resolve })
  }, [])

  const settle = (value: boolean) => {
    setPending(null)
    resolver.current?.(value)
    resolver.current = null
  }

  const toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200)
  }, [])

  return (
    <FeedbackContext.Provider value={{ confirm, toast }}>
      {children}

      {pending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={() => settle(false)}>
          <div className="w-full max-w-sm bg-white border border-ink/10 rounded-xl shadow-hard-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <Icon
                name={pending.tone === 'danger' ? 'warning' : 'checkCircle'}
                className={`w-5 h-5 mt-0.5 shrink-0 ${pending.tone === 'danger' ? 'text-red-600' : 'text-accent'}`}
                strokeWidth={2}
              />
              <div className="space-y-1">
                {pending.title && <p className="font-display uppercase text-base text-ink leading-tight">{pending.title}</p>}
                <p className="text-sm text-ink/75 whitespace-pre-wrap">{pending.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => settle(false)} className="text-sm font-semibold text-ink/60 hover:text-ink px-4 py-2">
                {pending.cancelLabel || 'Cancelar'}
              </button>
              <button
                onClick={() => settle(true)}
                className={`text-sm font-bold px-5 py-2 rounded-xl transition-colors ${
                  pending.tone === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-ink text-paper hover:bg-accent'
                }`}
              >
                {pending.confirmLabel || (pending.tone === 'danger' ? 'Eliminar' : 'Confirmar')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-full max-w-xs pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-semibold shadow-hard-lg flex items-start gap-2 ${
              t.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-white border-accent/30 text-ink'
            }`}
          >
            <Icon name={t.type === 'error' ? 'ban' : 'checkCircle'} className={`w-4 h-4 mt-0.5 shrink-0 ${t.type === 'error' ? 'text-red-600' : 'text-accent'}`} strokeWidth={2} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  )
}
