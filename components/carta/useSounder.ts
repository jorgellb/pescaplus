'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createNmeaReader, usableDepth, type NmeaState } from '@/lib/nmea'

/**
 * Conexión con la sonda de a bordo por cable, hablando NMEA 0183.
 *
 * POR QUÉ POR CABLE Y NO POR WIFI. Casi todos los barcos con electrónica moderna
 * llevan un gateway NMEA que emite por WiFi, y sería la vía cómoda. No se puede:
 * un navegador no abre sockets TCP ni UDP, y una página servida por HTTPS tiene
 * prohibido conectarse a un `ws://192.168.x.x` por contenido mixto. No es algo
 * que se arregle programando mejor; haría falta una aplicación nativa. Lo que sí
 * funciona es un adaptador USB-serie con Web Serial, que es esto.
 *
 * DÓNDE FUNCIONA: Chrome y Edge de escritorio, y Chrome en Android con un
 * adaptador OTG. En iPhone no hay Web Serial y no lo va a haber.
 *
 * EL CALADO DEL TRANSDUCTOR SE PREGUNTA. Casi todas las sondas dan la distancia
 * desde el transductor, no desde la superficie. Sin ese dato la profundidad
 * lleva un sesgo distinto en cada barco, así que aquí no se supone: si no se
 * sabe, no se da profundidad.
 */
export interface SounderState {
  soportado: boolean
  conectado: boolean
  /** Profundidad utilizable, ya con el calado sumado. */
  depthM: number | null
  waterTempC: number | null
  lat: number | null
  lon: number | null
  /** Frases leídas y descartadas: mide la salud del cable. */
  frases: { leidas: number; descartadas: number }
  error: string | null
}

const BAUDIOS = [4800, 38400, 9600, 115200]
const CALADO_GUARDADO = 'pescaplus:calado-transductor'

export function useSounder() {
  const [soportado] = useState(() => typeof navigator !== 'undefined' && 'serial' in navigator)
  const [conectado, setConectado] = useState(false)
  const [estado, setEstado] = useState<NmeaState>({ read: 0, discarded: 0 })
  const [error, setError] = useState<string | null>(null)
  // Se recuerda: el calado del barco no cambia entre salidas.
  const [caladoM, setCaladoM] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.5
    const v = Number(window.localStorage.getItem(CALADO_GUARDADO))
    return Number.isFinite(v) && v > 0 && v <= 10 ? v : 0.5
  })

  const port = useRef<{ close(): Promise<void>; readable: ReadableStream | null } | null>(null)
  const abort = useRef<AbortController | null>(null)

  const guardarCalado = useCallback((v: number) => {
    setCaladoM(v)
    try { window.localStorage.setItem(CALADO_GUARDADO, String(v)) } catch { /* modo privado */ }
  }, [])

  const desconectar = useCallback(async () => {
    abort.current?.abort()
    abort.current = null
    try { await port.current?.close() } catch { /* ya estaba cerrado */ }
    port.current = null
    setConectado(false)
  }, [])

  const conectar = useCallback(async () => {
    setError(null)
    const serial = (navigator as unknown as { serial?: {
      requestPort(): Promise<{ open(o: { baudRate: number }): Promise<void>; close(): Promise<void>; readable: ReadableStream | null }>
    } }).serial
    if (!serial) { setError('Este navegador no puede hablar con el puerto serie. Usa Chrome o Edge en un ordenador.'); return }

    try {
      const p = await serial.requestPort()
      // 4800 es lo normativo en NMEA 0183; los demás se prueban porque hay
      // aparatos y adaptadores configurados de fábrica a otra velocidad.
      let abierto = false
      for (const baudRate of BAUDIOS) {
        try { await p.open({ baudRate }); abierto = true; break } catch { /* siguiente */ }
      }
      if (!abierto) { setError('No se ha podido abrir el puerto. ¿Lo está usando otro programa?'); return }

      port.current = p
      setConectado(true)
      const lector = createNmeaReader()
      const ctrl = new AbortController()
      abort.current = ctrl

      const decodificador = new TextDecoderStream()
      const cerrado = p.readable!.pipeTo(decodificador.writable).catch(() => {})
      const reader = decodificador.readable.getReader()

      void (async () => {
        try {
          for (;;) {
            const { value, done } = await reader.read()
            if (done || ctrl.signal.aborted) break
            if (value) setEstado(lector.push(value))
          }
        } catch (e) {
          // Desenchufar el cable en marcha es lo normal, no un fallo.
          if (!ctrl.signal.aborted) setError('Se ha perdido la conexión con la sonda.')
        } finally {
          reader.releaseLock()
          await cerrado
          setConectado(false)
        }
      })()
    } catch (e) {
      // Cancelar el diálogo de elección de puerto no es un error que contar.
      const msg = e instanceof Error ? e.message : String(e)
      if (!/cancel|abort|no port selected/i.test(msg)) setError('No se ha podido conectar con la sonda.')
    }
  }, [])

  useEffect(() => () => { abort.current?.abort() }, [])

  const state: SounderState = {
    soportado,
    conectado,
    depthM: usableDepth(estado, caladoM),
    waterTempC: estado.waterTempC ?? null,
    lat: estado.lat ?? null,
    lon: estado.lon ?? null,
    frases: { leidas: estado.read, descartadas: estado.discarded },
    error,
  }

  return { state, caladoM, guardarCalado, conectar, desconectar }
}
