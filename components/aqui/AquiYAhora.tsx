'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/icons/Icon'

/**
 * «Aquí y ahora»: qué hay bajo tus pies, en este momento.
 *
 * Pensado para usarse DE PIE EN UNA ROCA O EN UN BARCO, no sentado en casa. De
 * ahí las decisiones raras para una web:
 *
 * - Un solo botón grande. Con guantes, sol de frente y el barco moviéndose, un
 *   formulario no se rellena.
 * - Una sola petición al servidor (`/api/aqui`), que fusiona sonda, fondo,
 *   espacios protegidos y solunar. Cuatro viajes por 3G son cuatro ocasiones de
 *   que se caiga uno y la pantalla quede a medias.
 * - Lo que puede meterte en un lío —estar dentro de un espacio protegido— va
 *   ARRIBA y en rojo, antes que la sonda. Es lo único de esta pantalla con
 *   consecuencias legales.
 * - Pantalla encendida mientras se usa (Wake Lock), porque si se apaga cada
 *   treinta segundos no sirve de nada en el agua.
 *
 * La última lectura se guarda: si vuelves sin cobertura, ves lo último que
 * sabías en lugar de una pantalla vacía.
 */

const CACHE_KEY = 'pescaplus-aqui'

interface Respuesta {
  success: boolean
  sonda: { label: string; depthM: number | null; relief?: { label: string } | null; source?: string } | null
  fondo: { label: string; habitat?: string; slope?: { label: string } | null; confidence?: string } | null
  protegido: { coverage: string; areas: { id: string; name: string; authority: string; rulesUrl?: string }[] } | null
  solunar:
    | { estado: 'dentro'; kind: string; restanMin: number; rating: number }
    | { estado: 'fuera'; kind: string; faltanMin: number; rating: number }
    | { estado: 'sin-datos'; rating: number }
  spot: { slug: string; name: string; region: string; km: number }
  especies: { id: string; name: string; minSizeNote: string }[]
}

type Estado = 'inicio' | 'localizando' | 'consultando' | 'listo' | 'error'

function minutosLargos(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export default function AquiYAhora() {
  const [estado, setEstado] = useState<Estado>('inicio')
  const [error, setError] = useState('')
  const [datos, setDatos] = useState<Respuesta | null>(null)
  const [precision, setPrecision] = useState<number | null>(null)
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null)
  const [guardado, setGuardado] = useState<'no' | 'guardando' | 'ok' | 'sin-sesion' | 'error'>('no')
  const [cacheado, setCacheado] = useState(false)
  const [pantallaOn, setPantallaOn] = useState(false)
  const wakeRef = useRef<WakeLockSentinel | null>(null)

  // Última lectura, para no enseñar una pantalla vacía sin cobertura. Se hace
  // igual que en NearMeDay: la restauración va en una función con nombre, no
  // suelta en el cuerpo del efecto, que es lo que el lint del proyecto prohíbe.
  useEffect(() => {
    const restaurar = () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return
        setDatos(JSON.parse(raw))
        setCacheado(true)
        setEstado('listo')
      } catch { /* almacenamiento lleno o bloqueado: da igual */ }
    }
    restaurar()
  }, [])

  const soltarPantalla = useCallback(() => {
    wakeRef.current?.release().catch(() => {})
    wakeRef.current = null
    setPantallaOn(false)
  }, [])

  const alternarPantalla = useCallback(async () => {
    if (wakeRef.current) return soltarPantalla()
    try {
      wakeRef.current = await navigator.wakeLock.request('screen')
      wakeRef.current.addEventListener('release', () => setPantallaOn(false))
      setPantallaOn(true)
    } catch {
      setPantallaOn(false)
    }
  }, [soltarPantalla])

  useEffect(() => () => { wakeRef.current?.release().catch(() => {}) }, [])

  const consultar = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setEstado('error')
      setError('Este navegador no puede darme tu posición.')
      return
    }
    setEstado('localizando')
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setPrecision(Math.round(pos.coords.accuracy))
        setPos({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setGuardado('no')
        setEstado('consultando')
        try {
          const res = await fetch(`/api/aqui?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
          const json: Respuesta = await res.json()
          if (!json.success) throw new Error('respuesta no válida')
          setDatos(json)
          setCacheado(false)
          setEstado('listo')
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(json)) } catch { /* lleno */ }
        } catch {
          setEstado(datos ? 'listo' : 'error')
          setError('No he podido consultar. Si estás sin cobertura, esto es lo último que sabía.')
        }
      },
      (err) => {
        setEstado('error')
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Necesito tu ubicación para saber qué hay debajo. Actívala y vuelve a intentarlo.'
            : 'No he podido situarte. Prueba a salir a cielo abierto.',
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    )
  }, [datos])

  /**
   * Guarda el punto como marca, con la sonda y el fondo YA RELLENOS.
   *
   * Es la diferencia entre una marca útil y un par de coordenadas: dentro de
   * seis meses, «Punto 36,5 m» con «Roca o fondo duro · levantamiento nº 291711»
   * en las notas dice algo; un par de números, no. Todo eso ya lo acabamos de
   * consultar, así que pedírselo al pescador otra vez sería absurdo.
   */
  const guardarPunto = useCallback(async () => {
    if (!pos || !datos) return
    setGuardado('guardando')
    const prof = datos.sonda?.depthM ?? null
    const notas = [
      datos.fondo?.label,
      datos.sonda?.relief?.label,
      datos.sonda?.source,
      datos.protegido?.coverage === 'inside' && datos.protegido.areas[0]
        ? `Dentro de ${datos.protegido.areas[0].name} (${datos.protegido.areas[0].authority})`
        : null,
    ].filter(Boolean).join(' · ').slice(0, 500)

    try {
      const res = await fetch('/api/waypoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Punto ${prof != null ? `${prof.toLocaleString('es-ES', { maximumFractionDigits: 1 })} m` : datos.spot.name}`.slice(0, 80),
          type: 'caladero',
          lat: pos.lat,
          lon: pos.lon,
          depthM: prof,
          notes: notas,
        }),
      })
      if (res.status === 401) return setGuardado('sin-sesion')
      setGuardado(res.ok ? 'ok' : 'error')
    } catch {
      setGuardado('error')
    }
  }, [pos, datos])

  const cargando = estado === 'localizando' || estado === 'consultando'

  return (
    <div className="space-y-6">
      {/* — El botón — */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={consultar}
          disabled={cargando}
          className="inline-flex items-center gap-2.5 bg-ink text-paper px-7 py-4 text-base font-semibold rounded-full shadow-hard hover-shift hover:bg-accent disabled:opacity-60"
        >
          <Icon name="crosshair" className="w-5 h-5" strokeWidth={2} />
          {estado === 'localizando' ? 'Situándote…'
            : estado === 'consultando' ? 'Consultando el fondo…'
            : datos ? 'Actualizar' : '¿Qué hay bajo mis pies?'}
        </button>

        {datos && (
          <button
            onClick={alternarPantalla}
            aria-pressed={pantallaOn}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-full border transition-colors ${
              pantallaOn ? 'bg-accent text-paper border-accent' : 'border-ink/15 text-ink/70 hover:border-accent hover:text-accent'
            }`}
          >
            <Icon name="sunny" className="w-4 h-4" strokeWidth={2} />
            {pantallaOn ? 'Pantalla encendida' : 'Mantener pantalla'}
          </button>
        )}
      </div>

      {datos && pos && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={guardarPunto}
            disabled={guardado === 'guardando' || guardado === 'ok'}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-full border border-ink/15 text-ink/80 hover:border-accent hover:text-accent disabled:opacity-60"
          >
            <Icon name="pin" className="w-4 h-4" strokeWidth={2} />
            {guardado === 'guardando' ? 'Guardando…' : guardado === 'ok' ? 'Punto guardado' : 'Guardar este punto'}
          </button>
          {guardado === 'ok' && (
            <Link href="/carta" className="text-[13px] font-bold uppercase tracking-wide text-accent hover:underline">
              Ver en la carta →
            </Link>
          )}
          {guardado === 'sin-sesion' && (
            <span className="text-[13px] text-ink/70">
              <Link href="/entrar" className="text-accent font-semibold underline">Inicia sesión</Link> para guardar tus marcas.
            </span>
          )}
          {guardado === 'error' && <span className="text-[13px] text-ink/70">No se pudo guardar. Inténtalo otra vez.</span>}
        </div>
      )}

      {error && (
        <p className="text-[14px] text-ink/70 border border-ink/[0.07] rounded-xl bg-ink/[0.02] p-3">{error}</p>
      )}

      {datos && (
        <div className="space-y-4">
          {cacheado && (
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Última lectura guardada · pulsa Actualizar cuando tengas cobertura
            </p>
          )}

          {/* — LO PRIMERO: si estás dentro de un espacio protegido — */}
          {datos.protegido?.coverage === 'inside' && datos.protegido.areas.length > 0 && (
            <div className="border-2 border-red-700/40 rounded-2xl bg-red-700/[0.07] p-5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-900 inline-flex items-center gap-1.5">
                <Icon name="warning" className="w-4 h-4" strokeWidth={2.2} /> Estás dentro de un espacio protegido
              </p>
              {datos.protegido.areas.map((a) => (
                <p key={a.id} className="text-[15px] font-bold text-red-900 mt-1.5">
                  {a.name} <span className="font-normal text-red-900/70">· {a.authority}</span>
                </p>
              ))}
              <p className="text-[13px] text-red-900/80 mt-2">
                Puede haber restricciones de pesca, de fondeo o de navegación. Compruébalo antes de tirar.
              </p>
            </div>
          )}

          {/* — Sonda y fondo — */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-ink/[0.07] rounded-2xl bg-paper p-5 shadow-hard">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">Bajo tus pies</p>
              <p className="font-display text-5xl text-ink leading-none mt-2">
                {datos.sonda?.depthM != null
                  ? `${datos.sonda.depthM.toLocaleString('es-ES', { maximumFractionDigits: 1 })} m`
                  : '—'}
              </p>
              <p className="text-[13px] text-ink/65 mt-2">
                {datos.sonda?.depthM == null ? datos.sonda?.label ?? 'Sin sonda en este punto' : datos.sonda.relief?.label ?? ''}
              </p>
              {datos.sonda?.source && (
                <p className="text-[11px] text-ink/45 mt-1">{datos.sonda.source}</p>
              )}
            </div>

            <div className="border border-ink/[0.07] rounded-2xl bg-paper p-5 shadow-hard">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">Tipo de fondo</p>
              <p className="font-display text-2xl text-ink leading-tight mt-2">
                {datos.fondo?.label ?? 'Sin datos aquí'}
              </p>
              {datos.fondo?.slope?.label && (
                <p className="text-[13px] text-ink/65 mt-2">Pendiente {datos.fondo.slope.label.toLowerCase()}</p>
              )}
            </div>
          </div>

          {/* — El momento — */}
          <div className="border border-ink/[0.07] rounded-2xl bg-paper p-5 shadow-hard">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">El momento</p>
            {datos.solunar.estado === 'dentro' ? (
              <>
                <p className="font-display text-3xl text-ink leading-none mt-2">
                  Estás en periodo {datos.solunar.kind}
                </p>
                <p className="text-[14px] text-ink/70 mt-1.5">
                  Quedan <strong className="text-ink">{minutosLargos(datos.solunar.restanMin)}</strong>
                </p>
              </>
            ) : datos.solunar.estado === 'fuera' ? (
              <>
                <p className="font-display text-3xl text-ink leading-none mt-2">
                  Siguiente periodo {datos.solunar.kind}
                </p>
                <p className="text-[14px] text-ink/70 mt-1.5">
                  En <strong className="text-ink">{minutosLargos(datos.solunar.faltanMin)}</strong>
                </p>
              </>
            ) : (
              <p className="text-[14px] text-ink/70 mt-2">Sin periodos por delante hoy.</p>
            )}
            <Link
              href={`/mejores-horas/${datos.spot.slug}`}
              className="inline-block text-[12px] font-bold uppercase tracking-wide text-accent hover:underline mt-3"
            >
              Previsión completa de {datos.spot.name} →
            </Link>
          </div>

          {/* — Qué entra aquí este mes — */}
          {datos.especies.length > 0 && (
            <div className="border border-ink/[0.07] rounded-2xl bg-paper p-5 shadow-hard">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
                En temporada por aquí
              </p>
              {/* La nota de talla NO es un "23 cm": son frases enteras
                  ("El atún rojo exige autorización específica y cupos…"). Puesta
                  en línea a la derecha se salía de la tarjeta por el lado, y en
                  un móvil desbordaba la página. Va debajo y ajustando. */}
              <ul className="mt-3 space-y-2.5">
                {datos.especies.map((e) => (
                  <li key={e.id} className="border-b border-ink/[0.05] pb-2 last:border-0">
                    <Link href={`/especies/${e.id}`} className="text-[14px] font-semibold text-ink hover:text-accent">
                      {e.name}
                    </Link>
                    {e.minSizeNote && (
                      <p className="text-[12px] text-ink/55 leading-snug mt-0.5">{e.minSizeNote}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-ink/45">
            Zona de referencia: {datos.spot.name} ({datos.spot.region}), a {datos.spot.km} km
            {precision != null && ` · posición con ${precision} m de precisión`}.
          </p>
        </div>
      )}
    </div>
  )
}
