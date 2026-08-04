import type { CharterWindow } from '@/lib/charter-window'

/**
 * El día de una salida, en un arco: de medianoche a medianoche, con la franja de
 * luz, los periodos de actividad, el sol y la fase de la luna.
 *
 * Es la ilustración principal de la sección de chárters, y a propósito NO es un
 * dibujo decorativo de un barco: es el dato real del día pintado. Un barco de
 * stock lo tiene cualquiera; esto no lo puede copiar nadie sin calcular lo
 * mismo, y además enseña de un vistazo lo que vendemos — que sabemos cuándo
 * pica.
 *
 * Geometría generada con trigonometría de verdad y no a ojo: los arcos salen
 * exactos a cualquier tamaño. Todo es cálculo local (ver lib/charter-window.ts),
 * así que pintarlo no cuesta ni una llamada de red.
 */

const CX = 200
const CY = 198
const R = 148
const GROSOR = 16

/** Fracción del día [0..1] → punto del arco. 0 y 1 caen en la base, 0,5 arriba. */
function punto(f: number, radio = R): [number, number] {
  const ang = Math.PI * (1 - f) // 0 → π (izquierda), 1 → 0 (derecha)
  return [CX + radio * Math.cos(ang), CY - radio * Math.sin(ang)]
}

function arco(desde: number, hasta: number, radio = R): string {
  const [x1, y1] = punto(desde, radio)
  const [x2, y2] = punto(hasta, radio)
  // large-arc SIEMPRE 0: el carril es media circunferencia, así que dos puntos
  // suyos nunca abarcan más de 180°. Ponerlo a 1 hace que el arco se vaya por el
  // lado largo y se salga del dibujo — pasó, y se ve a la primera.
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${radio} ${radio} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

/** Parte en dos los tramos que cruzan la medianoche. */
function tramos(p: { from: number; to: number }): { from: number; to: number }[] {
  return p.from <= p.to ? [p] : [{ from: p.from, to: 1 }, { from: 0, to: p.to }]
}

export default function DayDial({
  window: w,
  className = '',
}: {
  window: CharterWindow
  className?: string
}) {
  const mediodia = w.daylight ? (w.daylight.from + w.daylight.to) / 2 : 0.5
  const [sx, sy] = punto(mediodia)

  // La luna: un disco iluminado y encima otro del color del papel que hace de
  // sombra. Cuanto MÁS iluminada, más se aparta la sombra — concéntrica tapa
  // todo (luna nueva) y a dos radios no tapa nada (llena). Al revés se ve una
  // luna llena un día de luna nueva, que es lo que pasaba.
  const desplazamiento = w.moonIllumination * 2 * 11

  return (
    <svg
      viewBox="0 0 400 240"
      fill="none"
      className={className}
      role="img"
      aria-label={`Actividad prevista: ${w.label.toLowerCase()}${w.best ? `, mejor tramo de ${w.best.replace('–', ' a ')}` : ''}. ${w.moonPhaseName}.`}
    >
      {/* Carril del día */}
      <path d={arco(0, 1)} className="stroke-ink/[0.07]" strokeWidth={GROSOR} strokeLinecap="round" />

      {/* Franja de luz */}
      {w.daylight && (
        <path
          d={arco(w.daylight.from, w.daylight.to)}
          className="stroke-ink/[0.13]"
          strokeWidth={GROSOR}
        />
      )}

      {/* Periodos de actividad: los mayores sólidos, los menores translúcidos.
          Son cosas distintas y pintarlas igual vendería como bueno algo que no lo es. */}
      {w.periods.flatMap((p, i) =>
        tramos(p).map((t, j) => (
          <path
            key={`${i}-${j}`}
            d={arco(t.from, t.to)}
            className={p.kind === 'mayor' ? 'stroke-accent' : 'stroke-accent/30'}
            strokeWidth={GROSOR}
            strokeLinecap="round"
          />
        )),
      )}

      {/* Sol en su punto más alto */}
      <circle cx={sx} cy={sy} r="13" className="fill-paper" />
      <circle cx={sx} cy={sy} r="9" className="fill-accent/15 stroke-accent" strokeWidth="2" />
      <path
        d={`M${sx} ${sy - 16}v-5M${sx} ${sy + 16}v5M${sx - 16} ${sy}h-5M${sx + 16} ${sy}h5`}
        className="stroke-accent/50"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Luna, arriba a la izquierda */}
      <g transform="translate(58 62)">
        <circle r="11" className="fill-accent/30" />
        <circle cx={desplazamiento} r="11" className="fill-paper" />
        <circle r="11" className="stroke-ink/25" strokeWidth="1.4" />
      </g>

      {/* Línea del horizonte, cerrando el arco */}
      <path d={`M${CX - R - 8} ${CY}H${CX + R + 8}`} className="stroke-ink/15" strokeWidth="1.5" />

      {/* Marcas de 06, 12 y 18 h */}
      {[0.25, 0.5, 0.75].map((f) => {
        const [ax, ay] = punto(f, R - GROSOR / 2 - 6)
        const [bx, by] = punto(f, R - GROSOR / 2 - 12)
        return (
          <path
            key={f}
            d={`M${ax.toFixed(2)} ${ay.toFixed(2)}L${bx.toFixed(2)} ${by.toFixed(2)}`}
            className="stroke-ink/20"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}
