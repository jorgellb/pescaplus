/**
 * Los glifos de los cuatro servicios de la portada. Quietos hasta que el
 * puntero pasa por la tarjeta (o se llega a ella con el teclado): entonces el
 * señuelo se balancea, la marea corre por su curva, el marcador cae sobre el
 * caladero y el barco cabecea. Las clases `glifo-*` están en globals.css y
 * solo se mueven dentro de un `.group`.
 */

export type TipoGlifo = 'tienda' | 'cuando' | 'donde' | 'salir'

/* Los puntos de @keyframes marea (globals.css) están sacados de esta curva. */
const MAREA = 'M4 30C9.5 30 10.5 18 16 18S22.5 34 28 34S38.5 22 44 22'

export default function Glifo({ tipo, className = '' }: { tipo: TipoGlifo; className?: string }) {
  const trazo = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      {tipo === 'tienda' && (
        // Un jig colgando del sedal, con su emerillón y su anzuelo triple.
        <g className="glifo-balanceo">
          <path d="M24 4v8" {...trazo} />
          <circle cx="24" cy="14" r="2" {...trazo} />
          <path d="M24 16c4.6 1.8 6.2 7.6 5 13.4-.9 4.4-3 7.6-5 8.6-2-1-4.1-4.2-5-8.6-1.2-5.8.4-11.6 5-13.4Z" {...trazo} />
          <circle cx="24" cy="22.5" r="1.3" fill="var(--color-signal)" stroke="none" />
          <path d="M24 38v4M24 42c0 2-2.8 2.6-3.6.6M24 42c0 2 2.8 2.6 3.6.6" {...trazo} />
        </g>
      )}

      {tipo === 'cuando' && (
        // La curva de la marea del día, y la hora buena recorriéndola.
        <>
          <path d="M4 40h40" {...trazo} strokeOpacity="0.35" />
          <path d={MAREA} {...trazo} />
          {/* Recorre la curva con translate (ver @keyframes marea en globals.css), no con offset-path. */}
          <circle className="glifo-marea" r="3" fill="var(--color-signal)" />
          <path d="M37 6.5v3M37 13.5v3M31.5 11.5h3M39.5 11.5h3" {...trazo} strokeWidth={1.6} />
        </>
      )}

      {tipo === 'donde' && (
        // Un marcador que cae sobre las isóbatas del caladero y abre una onda.
        <>
          <path d="M6 38c6-3 12 1 18-2s12 1 18-2" {...trazo} strokeOpacity="0.4" />
          <path d="M8 31c5-2 10 1 16-1.5S34 31 40 29" {...trazo} strokeOpacity="0.25" />
          <ellipse className="glifo-onda" cx="24" cy="37" rx="10" ry="3" {...trazo} />
          <g className="glifo-caida">
            <path d="M24 35s-9-8.4-9-15a9 9 0 0 1 18 0c0 6.6-9 15-9 15Z" {...trazo} />
            <circle cx="24" cy="20" r="3.2" fill="var(--color-signal)" stroke="none" />
          </g>
        </>
      )}

      {tipo === 'salir' && (
        // Un barco de pesca con su caña, cabeceando sobre la ola.
        <>
          <g className="glifo-boya">
            <path d="M8 30h32l-4.5 7.5h-23Z" {...trazo} />
            <path d="M18 30v-9h9l4 9" {...trazo} />
            <path d="M28 21l9-12" {...trazo} strokeWidth={1.5} />
            <path d="M37 9v10" stroke="var(--color-signal)" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
          </g>
          <path d="M4 42c4 0 4-2.4 8-2.4s4 2.4 8 2.4 4-2.4 8-2.4 4 2.4 8 2.4 4-2.4 8-2.4" {...trazo} />
        </>
      )}
    </svg>
  )
}
