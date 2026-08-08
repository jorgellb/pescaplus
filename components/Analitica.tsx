'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Medición en el navegador. Sin librerías y sin cookies.
 *
 * Manda cuatro cosas que hasta ahora no se sabían de ninguna visita:
 *
 *  - **pageview**, con la procedencia real. En una aplicación de App Router el
 *    `document.referrer` solo existe en la PRIMERA carga; al navegar entre rutas
 *    se pierde. Por eso se guarda el referrer de entrada y se reenvía en cada
 *    página: sin esto todo lo que no sea la página de aterrizaje aparece como
 *    «directo» y la procedencia queda inservible.
 *  - **Web Vitals de usuarios reales** (LCP, CLS, INP). Lo que mide una
 *    herramienta de laboratorio es un móvil simulado con red simulada; esto es
 *    el teléfono de verdad de alguien mirando la carta en el puerto.
 *  - **salida**: segundos en la página y hasta dónde bajó. Distingue lo que se
 *    lee de lo que se abre y se cierra, que en un sitio de contenido es la
 *    diferencia entre una guía buena y una que no sirve.
 *  - **eventos propios** vía `window.pp?.(…)`, para herramientas y clics.
 *
 * Todo sale por `sendBeacon`, que sigue enviando aunque la pestaña se cierre —
 * con `fetch` normal, el evento de salida se pierde justo cuando importa.
 */

declare global {
  interface Window {
    pp?: (tipo: string, nombre?: string, valor?: number, meta?: unknown) => void
  }
}

const SESION_MS = 30 * 60 * 1000

function sesion(): string {
  try {
    const bruto = sessionStorage.getItem('pp_s')
    const ahora = Date.now()
    if (bruto) {
      const [id, ts] = bruto.split('|')
      if (id && Number(ts) > ahora - SESION_MS) {
        sessionStorage.setItem('pp_s', `${id}|${ahora}`)
        return id
      }
    }
    const id = Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4)
    sessionStorage.setItem('pp_s', `${id}|${ahora}`)
    return id
  } catch {
    return ''
  }
}

/** El referrer de ENTRADA, que es el único que dice de dónde vino la visita. */
function referrerDeEntrada(): string {
  try {
    const guardado = sessionStorage.getItem('pp_ref')
    if (guardado !== null) return guardado
    const ref = document.referrer || ''
    sessionStorage.setItem('pp_ref', ref)
    return ref
  } catch {
    return document.referrer || ''
  }
}

function enviar(cuerpo: Record<string, unknown>) {
  try {
    const datos = JSON.stringify({
      ...cuerpo,
      url: location.pathname + location.search,
      ref: referrerDeEntrada(),
      session: sesion(),
    })
    const blob = new Blob([datos], { type: 'application/json' })
    if (!navigator.sendBeacon?.('/api/e', blob)) {
      fetch('/api/e', { method: 'POST', body: datos, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {})
    }
  } catch {
    /* nunca molestar al visitante */
  }
}

export default function Analitica() {
  const pathname = usePathname()
  const search = useSearchParams()
  const entrada = useRef<number>(0)
  const scrollMax = useRef<number>(0)

  // Eventos propios: window.pp('herramienta', 'aqui')
  useEffect(() => {
    window.pp = (tipo, nombre, valor, meta) => enviar({ type: tipo, name: nombre, value: valor, meta })
    return () => {
      delete window.pp
    }
  }, [])

  // Una vista por ruta, y el evento de salida de la anterior.
  useEffect(() => {
    entrada.current = Date.now()
    scrollMax.current = 0
    enviar({ type: 'pageview' })

    const alScroll = () => {
      const alto = document.documentElement.scrollHeight - window.innerHeight
      if (alto <= 0) return
      const pct = Math.min(100, Math.round(((window.scrollY || 0) / alto) * 100))
      if (pct > scrollMax.current) scrollMax.current = pct
    }
    window.addEventListener('scroll', alScroll, { passive: true })

    const rutaSalida = pathname
    return () => {
      window.removeEventListener('scroll', alScroll)
      const segundos = Math.round((Date.now() - entrada.current) / 1000)
      // Menos de un segundo es un rebote instantáneo o un remontaje de React:
      // contarlo hundiría la media de permanencia sin significar nada.
      if (segundos >= 1) {
        enviar({ type: 'salida', name: rutaSalida, value: segundos, meta: { scroll: scrollMax.current } })
      }
    }
  }, [pathname, search])

  // Web Vitals reales. PerformanceObserver está en todos los navegadores que nos
  // importan; si falta alguna métrica, simplemente no se manda esa.
  useEffect(() => {
    const observadores: PerformanceObserver[] = []
    const vigilar = (tipo: string, alObservar: (lista: PerformanceObserverEntryList) => void, extra?: PerformanceObserverInit) => {
      try {
        const o = new PerformanceObserver(alObservar)
        o.observe({ type: tipo, buffered: true, ...extra })
        observadores.push(o)
      } catch {
        /* métrica no soportada aquí */
      }
    }

    let lcp = 0
    vigilar('largest-contentful-paint', (l) => {
      const e = l.getEntries().at(-1) as PerformanceEntry | undefined
      if (e) lcp = e.startTime
    })

    let cls = 0
    vigilar('layout-shift', (l) => {
      for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!e.hadRecentInput) cls += e.value
      }
    })

    let inp = 0
    vigilar('event', (l) => {
      for (const e of l.getEntries() as unknown as { duration: number }[]) {
        if (e.duration > inp) inp = e.duration
      }
    }, { durationThreshold: 40 } as PerformanceObserverInit)

    /*
     * Se manda al ocultarse la pestaña, no al descargarla: en móvil el evento de
     * descarga muchas veces no llega —el sistema mata la pestaña sin avisar— y
     * ahí se pierde justo la medición de los teléfonos, que son los que peor
     * rinden y los que más interesa vigilar.
     */
    let enviado = false
    const alOcultar = () => {
      if (enviado || document.visibilityState !== 'hidden') return
      enviado = true
      if (lcp) enviar({ type: 'vital', name: 'LCP', value: Math.round(lcp) })
      if (cls) enviar({ type: 'vital', name: 'CLS', value: Math.round(cls * 1000) / 1000 })
      if (inp) enviar({ type: 'vital', name: 'INP', value: Math.round(inp) })
    }
    document.addEventListener('visibilitychange', alOcultar)
    return () => {
      document.removeEventListener('visibilitychange', alOcultar)
      observadores.forEach((o) => o.disconnect())
    }
  }, [])

  return null
}
