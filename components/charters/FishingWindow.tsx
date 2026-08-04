import type { CharterWindow } from '@/lib/charter-window'

/**
 * La franja de 24 h de una salida: cuándo hay luz y cuándo se espera actividad.
 *
 * Es la pieza que distingue a PescaPlus de cualquier otro sitio de chárters. En
 * los demás, una salida es una foto, una hora y un precio; aquí se ve de un
 * vistazo si ese día y a esa hora se espera que pique.
 *
 * Decisiones de dibujo:
 *
 * - Los periodos MAYORES se pintan sólidos y los MENORES translúcidos. Son cosas
 *   distintas y mezclarlas en un solo tono vendería como igual de bueno algo que
 *   no lo es.
 * - Un periodo puede cruzar la medianoche y llegar con `from > to` (p. ej. de
 *   96 % a 4 %). Se parte en dos tramos; si no, saldría una barra invertida o
 *   directamente nada.
 * - Sin texto dentro del SVG: las horas van en HTML al lado, que escala con la
 *   tipografía del usuario y lo lee un lector de pantalla.
 */
export default function FishingWindow({
  window: w,
  className = '',
}: {
  window: CharterWindow
  className?: string
}) {
  /** Parte los tramos que cruzan medianoche para que siempre vayan de menor a mayor. */
  const tramos = w.periods.flatMap((p) =>
    p.from <= p.to ? [{ ...p }] : [
      { kind: p.kind, from: p.from, to: 1 },
      { kind: p.kind, from: 0, to: p.to },
    ],
  )

  const noche = w.daylight
  const horas = [0, 0.25, 0.5, 0.75]

  return (
    <svg
      viewBox="0 0 100 12"
      preserveAspectRatio="none"
      className={`w-full h-3 ${className}`}
      role="img"
      aria-label={`Actividad del día: ${w.label.toLowerCase()}${w.best ? `, mejor tramo de ${w.best.replace('–', ' a ')}` : ''}`}
    >
      {/* Noche de fondo */}
      <rect x="0" y="0" width="100" height="12" rx="2" className="fill-ink/[0.09]" />

      {/* Franja de luz diurna */}
      {noche && (
        <rect
          x={noche.from * 100}
          y="0"
          width={Math.max(0, (noche.to - noche.from) * 100)}
          height="12"
          className="fill-ink/[0.05]"
        />
      )}

      {/* Periodos de actividad */}
      {tramos.map((p, i) => (
        <rect
          key={i}
          x={p.from * 100}
          y="0"
          width={Math.max(0.6, (p.to - p.from) * 100)}
          height="12"
          className={p.kind === 'mayor' ? 'fill-accent' : 'fill-accent/35'}
        />
      ))}

      {/* Marcas de 00 / 06 / 12 / 18 h, discretas */}
      {horas.map((h) => (
        <line key={h} x1={h * 100} y1="0" x2={h * 100} y2="12" className="stroke-paper/70" strokeWidth="0.4" />
      ))}
    </svg>
  )
}

/**
 * Resumen en una línea para la tarjeta: valoración del día y mejor tramo.
 * Los puntos son un indicador de 1 a 5, no una nota de estrellas: aquí no se
 * está puntuando al patrón, se está describiendo el mar.
 */
export function FishingWindowSummary({ window: w }: { window: CharterWindow }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12px]">
      <span className="inline-flex gap-[3px]" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`w-1.5 h-1.5 rounded-full ${n <= w.rating ? 'bg-accent' : 'bg-ink/15'}`}
          />
        ))}
      </span>
      <span className="font-semibold text-ink/80">{w.label}</span>
      {w.best && <span className="text-ink/60">· mejor {w.best}</span>}
    </span>
  )
}
