'use client'

/**
 * Las lecturas del punto que se pincha en la carta: sonda, relieve, fondo, mar
 * y marea.
 *
 * Viven aparte de NauticalChart porque son funciones puras de sus props: no
 * tocan el mapa, no tienen estado y no dependen de ningún efecto. Sacarlas quita
 * doscientas líneas del componente grande sin mover una coma de la lógica, que
 * es la parte que sí sería arriesgado tocar.
 */
import type { Sounding } from '@/lib/soundings'
import type { Seabed } from '@/lib/seabed'

export interface PointConditions {
  available: boolean
  hasMarine?: boolean
  ahora?: {
    windKmh: number | null; gustKmh: number | null; windDirLabel: string | null
    waveM: number | null; wavePeriod: number | null; seaTempC: number | null
    score: number; activity: number
  }
  ventana?: { start: number; end: number; avg: number } | null
  marea?: {
    coeficiente: number
    coeficienteTexto: string
    lunaFase: string
    disponible: boolean
    rangoPequeno: boolean
    estacion: string | null
    subiendo: boolean | null
    proximas: { t: number; altura: number; tipo: 'alta' | 'baja' }[]
    nota: string | null
  }
  gridKm?: number | null
}

export const nf = (v: number | null | undefined, dec = 0) =>
  v == null ? '—' : v.toLocaleString('es-ES', { maximumFractionDigits: dec })

/** "hoy 19:00 – 05:00" / "mañana 06:00 – 11:00", en hora de aquí. */
export function ventanaTexto(v: { start: number; end: number }): string {
  const hora = (t: number) => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })
  const dia = (t: number) => {
    const hoy = new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })
    const manana = new Date(Date.now() + 86400000).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })
    const d = new Date(t).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })
    if (d === hoy) return 'hoy'
    if (d === manana) return 'mañana'
    return new Date(t).toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'Europe/Madrid' })
  }
  return `${dia(v.start)} ${hora(v.start)} – ${hora(v.end)}`
}

/**
 * La marea.
 *
 * El COEFICIENTE va primero y siempre: sale de la fase lunar, se calcula en
 * local y es lo que decide si hay corriente. Vivas o muertas cambia la jornada
 * más que medio nudo de viento.
 *
 * Las alturas y la próxima pleamar solo salen si hay servicio contratado. Si no
 * lo hay, no se enseña un hueco ni se rellena con nada: se calla esa parte.
 */
export function Marea({ m }: { m: NonNullable<PointConditions['marea']> }) {
  const hora = (t: number) => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })
  return (
    <div className="mt-2 pt-2 border-t border-ink/[0.07]">
      <p className="text-[13px] text-ink">
        <span className="text-ink/60">Marea:</span>{' '}
        <span className="font-semibold">{m.coeficienteTexto}</span>
        <span className="text-ink/60"> · coef. {m.coeficiente} · {m.lunaFase}</span>
      </p>
      {m.disponible && (
        <>
          {m.subiendo != null && (
            <p className="text-[12px] text-ink/70">
              Ahora {m.subiendo ? 'subiendo ↑' : 'bajando ↓'}
              {m.proximas[0] && ` · ${m.proximas[0].tipo === 'alta' ? 'pleamar' : 'bajamar'} a las ${hora(m.proximas[0].t)}`}
            </p>
          )}
          {/* En el Mediterráneo el rango es de centímetros: planificar una
              salida alrededor de esa marea no tiene sentido, y hay que decirlo. */}
          {m.rangoPequeno && (
            <p className="text-[11.5px] text-ink/60">Rango pequeño: aquí la marea apenas mueve el agua.</p>
          )}
          {m.estacion && <p className="text-[11px] text-ink/50">Estación: {m.estacion}</p>}
        </>
      )}
    </div>
  )
}

/**
 * El mar que hay en el punto. Se enseñan cuatro cifras y una ventana: es lo que
 * de verdad decide si sales o te quedas en el muelle. El parte completo, hora a
 * hora, ya vive en la ficha de cada zona.
 */
export function PointWeather({ c }: { c: PointConditions | null }) {
  if (!c) return <p className="text-[13px] text-ink/60">Consultando el parte…</p>
  if (!c.available || !c.ahora) return <p className="text-[13px] text-ink/60">Sin parte para este punto</p>
  const a = c.ahora
  return (
    <>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
        <div>
          <dt className="text-ink/60 text-[11px]">Viento</dt>
          <dd className="text-ink font-semibold">
            {nf(a.windKmh)} km/h{a.windDirLabel ? ` ${a.windDirLabel}` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-ink/60 text-[11px]">Rachas</dt>
          <dd className="text-ink font-semibold">{nf(a.gustKmh)} km/h</dd>
        </div>
        {c.hasMarine && (
          <>
            <div>
              <dt className="text-ink/60 text-[11px]">Ola</dt>
              <dd className="text-ink font-semibold">
                {nf(a.waveM, 1)} m{a.wavePeriod != null ? ` · ${nf(a.wavePeriod, 0)} s` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-ink/60 text-[11px]">Agua</dt>
              <dd className="text-ink font-semibold">{nf(a.seaTempC, 1)} °C</dd>
            </div>
          </>
        )}
      </dl>
      {c.ventana && (
        <p className="text-[12px] text-ink/70 mt-2">
          <span className="font-semibold text-accent">Mejor ventana:</span> {ventanaTexto(c.ventana)}
        </p>
      )}
      {c.marea && <Marea m={c.marea} />}
    </>
  )
}

/**
 * Lo que se sabe del fondo en un punto.
 *
 * Se enseña en dos alturas a propósito. Arriba, lo que sale de una fuente
 * medida —el relieve, que viene del reparto de sondas dentro de la celda—.
 * Debajo, lo que sale de un modelo —el sustrato y el hábitat—, con su confianza
 * declarada. No es lo mismo y no debe parecerlo.
 */
export function SeabedReading({ s, relief }: { s: Seabed | null; relief: Sounding['relief'] | null }) {
  const hayAlgo = s?.substrate || (relief && relief.kind !== 'desconocido') || s?.slope
  if (!hayAlgo) return null
  return (
    <div className="space-y-1">
      {relief && relief.kind !== 'desconocido' && (
        <p className="text-[13px] text-ink">
          <span className="text-ink/60">Relieve:</span> <span className="font-semibold">{relief.label}</span>
          {relief.hint && <span className="block text-[11.5px] text-ink/60">{relief.hint}</span>}
        </p>
      )}
      {s?.slope && (
        <p className="text-[13px] text-ink">
          <span className="text-ink/60">Pendiente:</span> <span className="font-semibold">{s.slope.label}</span>
          {s.slope.hint && <span className="block text-[11.5px] text-ink/60">{s.slope.hint}</span>}
        </p>
      )}
      {s?.substrate && (
        <p className="text-[13px] text-ink">
          <span className="text-ink/60">Fondo:</span> <span className="font-semibold">{s.label}</span>
          {/* La confianza va pegada al dato que califica, no en una nota aparte
              que nadie lee. */}
          {s.confidence && <span className="text-[11.5px] text-ink/60"> · fiabilidad {s.confidence}</span>}
        </p>
      )}
      {s?.habitat && <p className="text-[11.5px] text-ink/60">{s.habitat}{s.biozone ? ` · ${s.biozone}` : ''}</p>}
    </div>
  )
}

/**
 * La lectura del fondo. Cada caso se cuenta como es: una medida de un
 * levantamiento no vale lo mismo que una interpolación del modelo global, y
 * decir "0 m" en tierra sería sencillamente falso.
 */
export function SoundingReading({ s, onRetry }: { s: Sounding | null; onRetry?: () => void }) {
  if (!s) return <p className="text-[13px] text-ink/60">Midiendo el fondo…</p>
  if (s.kind === 'desconocida' || s.kind === 'tierra') {
    return (
      <p className="text-[13px] text-ink/70">
        {s.label}
        {s.elevationM != null && ` · ${nf(s.elevationM, 1)} m de altitud`}
        {/* Que no se haya podido medir no significa que no haya fondo, así que
            se puede reintentar sin volver a buscar el punto en la carta. */}
        {s.kind === 'desconocida' && onRetry && (
          <>
            {' '}
            <button type="button" onClick={onRetry} className="font-semibold text-accent hover:underline">
              Reintentar
            </button>
          </>
        )}
      </p>
    )
  }
  return (
    <>
      <p className="font-display text-[26px] leading-none text-ink">{s.label}</p>
      {s.minM != null && s.maxM != null && s.maxM - s.minM >= 1 && (
        <p className="text-[12px] text-ink/60 mt-1">Entre {nf(s.minM, 1)} y {nf(s.maxM, 1)} m alrededor del punto</p>
      )}
      {s.kind === 'aproximada' && (
        <p className="text-[12px] text-amber-900 mt-1">Sale del modelo global: tómalo solo como orientación.</p>
      )}
      {s.source && (
        <p className="text-[11px] text-ink/60 mt-1">
          Fuente: {s.sourceUrl
            ? <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">{s.source}</a>
            : s.source}
        </p>
      )}
    </>
  )
}
