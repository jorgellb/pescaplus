'use client'

import { useEffect } from 'react'

/**
 * La app nativa (Capacitor) carga esta misma web en vivo dentro de un WebView
 * — no hay build aparte que actualizar, así que la integración con lo nativo
 * vive aquí, en el propio código de la web, y se activa sola cuando detecta
 * que corre dentro del WebView (`Capacitor.isNativePlatform()`); en el
 * navegador normal no hace nada.
 *
 * Solo el botón "atrás" de Android: sin esto, cada pulsación cierra la app en
 * vez de navegar hacia atrás dentro de ella, que es lo que espera cualquiera
 * que use un WebView como este.
 */
export default function CapacitorBridge() {
  useEffect(() => {
    let cleanup: (() => void) | undefined

    ;(async () => {
      // Import dinámico: en el navegador normal (sin Capacitor instalado en
      // tiempo de ejecución) esto simplemente no encuentra nada que hacer.
      const { Capacitor } = await import('@capacitor/core')
      if (!Capacitor.isNativePlatform()) return

      const { App: CapApp } = await import('@capacitor/app')
      const listener = await CapApp.addListener('backButton', () => {
        if (window.history.length > 1) window.history.back()
        else CapApp.exitApp()
      })
      cleanup = () => listener.remove()
    })().catch(() => {
      /* no estamos en un WebView de Capacitor, o el plugin no está disponible — no pasa nada */
    })

    return () => cleanup?.()
  }, [])

  return null
}
