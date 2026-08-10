import { tideHeightAt, type TideExtreme } from '@/lib/tides'

/**
 * La curva de marea del día, hora a hora.
 *
 * NO pide ni un dato nuevo. El proveedor solo da los extremos —pleamares y
 * bajamares—, y `tideHeightAt()` interpola cualquier instante entre ellos, que
 * es exactamente como funciona la marea: una sinusoide entre dos extremos. Así
 * que la curva es cálculo local y gratis, sin tocar la cuota de nadie.
 *
 * Decisiones de la gráfica, y por qué:
 *
 *  - **Una sola serie y sin leyenda.** El título ya dice qué es; una caja de
 *    leyenda para una única línea es ruido.
 *  - **Un solo eje.** La tentación sería meter el coeficiente o el viento
 *    encima; dos escalas distintas en un mismo dibujo es la forma más rápida de
 *    que alguien lea mal los dos.
 *  - **Etiquetas directas solo en los extremos.** Marcar las 24 horas llenaría
 *    el gráfico de números que nadie lee. Lo que se busca aquí es «¿a qué hora
 *    hay pleamar y cuánto sube?», y eso son dos o cuatro puntos.
 *  - **La hora actual, marcada.** Es la pregunta real del que mira esto desde el
 *    coche: no «cómo es la marea hoy» sino «qué está haciendo AHORA».
 */

const ANCHO = 720
const ALTO = 200
const PAD_X = 34
const PAD_Y = 26

export default function CurvaMarea({
  extremes,
  ahora,
  smallRange = false,
}: {
  extremes: TideExtreme[]
  /* Obligatorio y no `Date.now()` por defecto: un componente que lee el reloj
   * por su cuenta es impuro —React lo marca— y además daría una hora distinta
   * en el servidor y en el navegador, que es como aparecen los desajustes de
   * hidratación. La página ya tiene su «ahora» y manda ése. */
  ahora: number
  smallRange?: boolean
}) {
  // La ventana es el día natural en Madrid, no «24 h desde ahora»: la gente
  // planifica por jornadas, y una curva que empieza a las 15:40 no se lee.
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', dateStyle: 'short' })
  const hoy = f.format(new Date(ahora))
  const inicio = new Date(`${hoy}T00:00:00`).getTime()
  const fin = inicio + 24 * 3600_000

  // Un punto cada 15 min: suficiente para que la curva se vea lisa y poco
  // suficiente para que el SVG siga pesando nada.
  const paso = 15 * 60_000
  const puntos: { t: number; h: number }[] = []
  for (let t = inicio; t <= fin; t += paso) {
    const h = tideHeightAt(extremes, t)
    if (h != null) puntos.push({ t, h })
  }
  if (puntos.length < 8) return null

  const alturas = puntos.map((p) => p.h)
  let min = Math.min(...alturas)
  let max = Math.max(...alturas)
  // Un margen mínimo evita que en el Mediterráneo —donde la carrera es de
  // centímetros— la curva salga como una montaña rusa que asusta sin motivo.
  const margen = Math.max(0.15, (max - min) * 0.15)
  min -= margen
  max += margen

  const x = (t: number) => PAD_X + ((t - inicio) / (fin - inicio)) * (ANCHO - PAD_X * 2)
  const y = (h: number) => ALTO - PAD_Y - ((h - min) / (max - min)) * (ALTO - PAD_Y * 2)

  const d = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)} ${y(p.h).toFixed(1)}`).join(' ')
  const area = `${d} L${x(fin).toFixed(1)} ${ALTO - PAD_Y} L${x(inicio).toFixed(1)} ${ALTO - PAD_Y} Z`

  const delDia = extremes.filter((e) => e.time >= inicio && e.time <= fin)
  const hAhora = tideHeightAt(extremes, ahora)
  const hora = (t: number) =>
    new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }).format(new Date(t))

  return (
    <figure className="border border-ink/[0.07] rounded-xl bg-paper p-4 overflow-hidden">
      <figcaption className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60 mb-3">
        Marea de hoy, hora a hora
      </figcaption>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full h-auto min-w-[420px]"
             role="img"
             aria-label={`Curva de marea del día. ${delDia.map((e) => `${e.type === 'alta' ? 'Pleamar' : 'Bajamar'} a las ${hora(e.time)} con ${e.height.toFixed(2)} metros`).join('. ')}`}>
          {/* Rejilla recesiva: cada 6 h, para orientarse sin competir con la curva */}
          {[0, 6, 12, 18, 24].map((h) => (
            <g key={h}>
              <line x1={x(inicio + h * 3600_000)} y1={PAD_Y - 6} x2={x(inicio + h * 3600_000)} y2={ALTO - PAD_Y}
                    className="stroke-ink/10" strokeWidth="1" />
              <text x={x(inicio + h * 3600_000)} y={ALTO - 8} textAnchor="middle"
                    className="fill-ink/50 font-mono" style={{ fontSize: 11 }}>
                {String(h).padStart(2, '0')}h
              </text>
            </g>
          ))}

          <path d={area} className="fill-accent/10" />
          <path d={d} className="stroke-accent fill-none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* Pleamares y bajamares, etiquetadas directamente */}
          {delDia.map((e) => {
            const ex = x(e.time)
            const ey = y(e.height)
            const alta = e.type === 'alta'
            return (
              <g key={e.time}>
                <circle cx={ex} cy={ey} r="4.5" className="fill-paper stroke-accent" strokeWidth="2" />
                <text x={ex} y={alta ? ey - 12 : ey + 20} textAnchor="middle"
                      className="fill-ink font-mono font-bold" style={{ fontSize: 11 }}>
                  {hora(e.time)}
                </text>
                <text x={ex} y={alta ? ey - 24 : ey + 32} textAnchor="middle"
                      className="fill-ink/60 font-mono" style={{ fontSize: 10 }}>
                  {e.height.toFixed(2)} m
                </text>
              </g>
            )
          })}

          {/* Ahora: la línea que responde a la pregunta de verdad */}
          {hAhora != null && ahora >= inicio && ahora <= fin && (
            <g>
              <line x1={x(ahora)} y1={PAD_Y - 6} x2={x(ahora)} y2={ALTO - PAD_Y}
                    className="stroke-ink/45" strokeWidth="1.5" strokeDasharray="4 3" />
              <circle cx={x(ahora)} cy={y(hAhora)} r="5" className="fill-ink stroke-paper" strokeWidth="2" />
              <text x={x(ahora)} y={PAD_Y - 12} textAnchor="middle"
                    className="fill-ink font-mono font-bold" style={{ fontSize: 11 }}>
                ahora · {hAhora.toFixed(2)} m
              </text>
            </g>
          )}
        </svg>
      </div>

      {/*
        * La lectura hora a hora, en números.
        *
        * La curva enseña la FORMA y esta tira da el DATO: a las 07:00 hay 2,14 m
        * y está subiendo. Son dos preguntas distintas —«cómo va el día» y «qué
        * altura hay a la hora a la que puedo ir»— y la segunda no se responde
        * mirando un trazo, hay que leerla.
        *
        * Se marca la hora actual y se separa el sentido con una flecha, porque
        * para pescar importa tanto la altura como si sube o baja.
        */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <caption className="sr-only">Altura de la marea hora a hora</caption>
          <tbody>
            {[0, 12].map((desde) => (
              <tr key={desde} className="align-top">
                {Array.from({ length: 12 }, (_, k) => {
                  const h = desde + k
                  const t = inicio + h * 3600_000
                  const alt = tideHeightAt(extremes, t)
                  const antes = tideHeightAt(extremes, t - 1800_000)
                  const sube = alt != null && antes != null ? alt > antes : null
                  const esAhora = ahora >= t && ahora < t + 3600_000
                  return (
                    <td
                      key={h}
                      className={`text-center py-1.5 px-0.5 border-t border-ink/[0.07] ${
                        esAhora ? 'bg-ink text-paper rounded' : ''
                      }`}
                    >
                      <div className={`font-mono text-[10px] ${esAhora ? 'text-paper/70' : 'text-ink/50'}`}>
                        {String(h).padStart(2, '0')}h
                      </div>
                      <div className={`font-mono text-[12px] font-bold ${esAhora ? 'text-paper' : 'text-ink'}`}>
                        {alt == null ? '—' : alt.toFixed(2)}
                      </div>
                      <div className={`font-mono text-[11px] ${esAhora ? 'text-paper/70' : 'text-accent'}`}>
                        {sube == null ? '' : sube ? '↑' : '↓'}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-ink/60 mt-3 leading-relaxed">
        Alturas sobre el cero del proveedor, interpoladas entre pleamares y bajamares.
        {smallRange && ' La carrera de marea aquí es pequeña: la forma de la curva importa más que los centímetros.'}
      </p>
    </figure>
  )
}
