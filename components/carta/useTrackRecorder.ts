'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { rejectReason, trackDistance, trackDuration, type TrackPoint } from '@/lib/track-types'

/**
 * Grabación de la derrota con el GPS del aparato.
 *
 * Esto se usa en un barco, con el móvil en el bolsillo o en un soporte, a veces
 * horas. Todo lo de aquí sale de esa realidad:
 *
 *  - SE GUARDA EN EL PROPIO APARATO A CADA PASO. Si el navegador recarga la
 *    pestaña por falta de memoria —cosa que hacen todos cuando llevas rato con
 *    la pantalla apagada— la jornada entera no se puede perder. Al volver se
 *    ofrece continuar.
 *  - SE PIDE UN BLOQUEO DE PANTALLA. Con la pantalla apagada el navegador
 *    suspende el temporizador y la derrota se queda a trozos. El bloqueo lo
 *    evita mientras la página esté visible; no es magia, y se dice en la
 *    interfaz en vez de prometer lo que no se puede cumplir.
 *  - SE FILTRAN LOS PUNTOS MALOS. Un GPS de móvil da posiciones con cientos de
 *    metros de error y saltos imposibles. Meterlos no completa la derrota: la
 *    ensucia y además infla la distancia recorrida, que es justo el número que
 *    la gente mira.
 */
const ALMACEN = 'pescaplus:ruta-en-curso'
/** Guardar 10.000 puntos en cada posición nueva quema batería para nada. */
const GUARDAR_CADA_MS = 5000

export interface RecorderState {
  /** 'parado' | 'grabando' | 'pausa' */
  status: 'parado' | 'grabando' | 'pausa'
  points: TrackPoint[]
  distanceM: number
  durationS: number
  /** Última velocidad conocida, en nudos. */
  knots: number | null
  /** Precisión del último arreglo, en metros. */
  accuracyM: number | null
  /** Por qué no avanza la ruta ahora mismo, si es que no avanza. */
  waiting: string | null
  error: string | null
  /** Hay una grabación anterior sin cerrar, esperando a que se decida. */
  recovered: boolean
}

interface Guardado {
  points: TrackPoint[]
  savedAt: number
}

function leerGuardado(): Guardado | null {
  if (typeof window === 'undefined') return null
  try {
    const crudo = window.localStorage.getItem(ALMACEN)
    if (!crudo) return null
    const d = JSON.parse(crudo) as Guardado
    if (!Array.isArray(d?.points) || d.points.length < 2) return null
    return d
  } catch {
    return null
  }
}

/**
 * @param sondaActual  De dónde sacar la profundidad de cada punto. Se pasa como
 *   función y no como valor para leerla EN EL MOMENTO en que llega la posición:
 *   con un valor, el grabador se quedaría con la sonda del render anterior y
 *   cada punto llevaría la profundidad del punto de antes.
 */
export function useTrackRecorder(sondaActual?: () => number | null) {
  const sonda = useRef(sondaActual)
  sonda.current = sondaActual

  // Se lee al crear el estado, no en un efecto: es un hecho del aparato, y así
  // no hay un primer render que diga "no hay nada" antes de encontrarlo.
  const [recovered, setRecovered] = useState(() => leerGuardado() !== null)
  const [status, setStatus] = useState<RecorderState['status']>('parado')
  const [points, setPoints] = useState<TrackPoint[]>([])
  const [knots, setKnots] = useState<number | null>(null)
  const [accuracyM, setAccuracyM] = useState<number | null>(null)
  const [waiting, setWaiting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const watchId = useRef<number | null>(null)
  const wakeLock = useRef<{ release(): Promise<void> } | null>(null)
  const ultimoGuardado = useRef(0)
  const ultimoPunto = useRef<TrackPoint | null>(null)

  const persistir = useCallback((pts: TrackPoint[], forzar = false) => {
    const ahora = Date.now()
    if (!forzar && ahora - ultimoGuardado.current < GUARDAR_CADA_MS) return
    ultimoGuardado.current = ahora
    try {
      window.localStorage.setItem(ALMACEN, JSON.stringify({ points: pts, savedAt: ahora } satisfies Guardado))
    } catch {
      // Cuota llena o modo privado: la grabación sigue en memoria. No se avisa
      // por cada punto; se avisaría en bucle.
    }
  }, [])

  const pedirWakeLock = useCallback(async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }
      if (!nav.wakeLock) return
      wakeLock.current = await nav.wakeLock.request('screen')
    } catch {
      // Lo deniegan la batería baja y algunos navegadores. No es motivo para
      // impedir la grabación, solo para que dure menos si se apaga la pantalla.
    }
  }, [])

  const soltarWakeLock = useCallback(() => {
    wakeLock.current?.release().catch(() => {})
    wakeLock.current = null
  }, [])

  const parar = useCallback(() => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    watchId.current = null
    soltarWakeLock()
  }, [soltarWakeLock])

  const arrancarWatch = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Este navegador no da acceso al GPS.')
      return false
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setError(null)
        const p: TrackPoint = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          t: pos.timestamp,
          ...(pos.coords.accuracy != null ? { acc: Math.round(pos.coords.accuracy) } : {}),
          ...(pos.coords.speed != null && Number.isFinite(pos.coords.speed) ? { spd: pos.coords.speed } : {}),
        }
        const prof = sonda.current?.()
        if (prof != null && Number.isFinite(prof) && prof > 0) p.depthM = Math.round(prof * 100) / 100
        setAccuracyM(p.acc ?? null)
        setKnots(pos.coords.speed != null && Number.isFinite(pos.coords.speed) ? pos.coords.speed * 1.94384 : null)

        const motivo = rejectReason(ultimoPunto.current, p)
        if (motivo) { setWaiting(motivo); return }
        setWaiting(null)
        ultimoPunto.current = p
        setPoints((prev) => {
          const siguiente = [...prev, p]
          persistir(siguiente)
          return siguiente
        })
      },
      (err) => {
        // Cada código pide una explicación distinta: "algo falló" no ayuda a
        // nadie que esté a dos millas de la costa intentando grabar su salida.
        if (err.code === err.PERMISSION_DENIED) {
          setError('Has denegado el acceso a tu posición. Actívalo en los permisos del navegador para esta página.')
          parar()
          setStatus('parado')
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setWaiting('sin cobertura de satélites')
        } else {
          setWaiting('esperando al GPS')
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    )
    return true
  }, [parar, persistir])

  const empezar = useCallback(() => {
    setPoints([])
    ultimoPunto.current = null
    setError(null)
    setWaiting('esperando al GPS')
    setRecovered(false)
    try { window.localStorage.removeItem(ALMACEN) } catch { /* da igual */ }
    if (arrancarWatch()) { setStatus('grabando'); void pedirWakeLock() }
  }, [arrancarWatch, pedirWakeLock])

  /** Retomar la grabación que quedó a medias tras una recarga. */
  const retomar = useCallback(() => {
    const guardado = leerGuardado()
    if (!guardado) { setRecovered(false); return }
    setPoints(guardado.points)
    ultimoPunto.current = guardado.points[guardado.points.length - 1] ?? null
    setRecovered(false)
    setError(null)
    if (arrancarWatch()) { setStatus('grabando'); void pedirWakeLock() }
  }, [arrancarWatch, pedirWakeLock])

  const descartarRecuperada = useCallback(() => {
    try { window.localStorage.removeItem(ALMACEN) } catch { /* da igual */ }
    setRecovered(false)
  }, [])

  const pausar = useCallback(() => {
    parar()
    setStatus('pausa')
    setWaiting(null)
    setPoints((p) => { persistir(p, true); return p })
  }, [parar, persistir])

  const continuar = useCallback(() => {
    // Tras una pausa el barco puede haberse movido: no se une el tramo nuevo con
    // el viejo a ciegas, se deja que el filtro decida como con cualquier punto.
    if (arrancarWatch()) { setStatus('grabando'); void pedirWakeLock() }
  }, [arrancarWatch, pedirWakeLock])

  /** Cierra la grabación y devuelve los puntos para guardarlos. */
  const terminar = useCallback((): TrackPoint[] => {
    parar()
    setStatus('parado')
    setWaiting(null)
    return points
  }, [parar, points])

  /** Se llama cuando la ruta ya está guardada en el servidor. */
  const limpiar = useCallback(() => {
    setPoints([])
    ultimoPunto.current = null
    try { window.localStorage.removeItem(ALMACEN) } catch { /* da igual */ }
  }, [])

  // El bloqueo de pantalla se pierde al minimizar; hay que volver a pedirlo.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible' && status === 'grabando' && !wakeLock.current) void pedirWakeLock()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [status, pedirWakeLock])

  useEffect(() => () => parar(), [parar])

  const state: RecorderState = {
    status,
    points,
    distanceM: trackDistance(points),
    durationS: trackDuration(points),
    knots,
    accuracyM,
    waiting,
    error,
    recovered,
  }

  return { state, empezar, pausar, continuar, terminar, limpiar, retomar, descartarRecuperada }
}
