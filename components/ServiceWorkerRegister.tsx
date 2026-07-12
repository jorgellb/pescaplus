'use client'

import { useEffect } from 'react'

/** Registers the service worker in production so the app is installable and has an offline fallback. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration failed — the site still works, just without offline support */
      })
    }
    if (document.readyState === 'complete') register()
    else {
      window.addEventListener('load', register, { once: true })
      return () => window.removeEventListener('load', register)
    }
  }, [])
  return null
}
