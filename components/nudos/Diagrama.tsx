/**
 * Diagramas de los montajes.
 *
 * Un montaje se entiende viéndolo. El texto dice «plomo corredizo por encima del
 * emerillón» y quien no lo ha montado nunca no sabe en qué orden va nada; el
 * dibujo lo resuelve en un segundo.
 *
 * Van dibujados a mano en SVG y no como imagen por tres razones: pesan un par de
 * kilobytes en vez de doscientos, se leen igual de nítidos en cualquier pantalla,
 * y —la que de verdad importa— se adaptan al tema claro y oscuro usando
 * `currentColor`, así que no hay que mantener dos versiones de cada uno.
 *
 * Solo hay diagrama de los MONTAJES. Un nudo es una maraña tridimensional y un
 * esquema plano mal hecho confunde más que el texto; prefiero no ponerlo a poner
 * uno que engañe. Los nudos se explican paso a paso.
 */

const TRAZO = 'stroke-ink/70'
const RELLENO = 'fill-ink/70'
const ETIQ = 'fill-ink/60 font-mono text-[9px] uppercase tracking-wider'

type Anclaje = 'start' | 'middle' | 'end'

function Etiqueta({ x, y, children, anchor = 'middle' }: { x: number; y: number; children: string; anchor?: Anclaje }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={ETIQ} style={{ fontSize: 9 }}>
      {children}
    </text>
  )
}

/** Anzuelo esquemático, mirando a la derecha. Se reutiliza en los tres. */
function Anzuelo({ x, y, escala = 1 }: { x: number; y: number; escala?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
      {/* Ojal */}
      <circle cx="0" cy="0" r="3" className={`${TRAZO} fill-none`} strokeWidth="1.5" />
      {/* Caña del anzuelo y curva */}
      <path d="M0 3 L0 20 Q0 30 9 30 Q17 30 17 21 L17 14" className={`${TRAZO} fill-none`} strokeWidth="1.8" strokeLinecap="round" />
      {/* Punta */}
      <path d="M17 14 L14 18 M17 14 L20 18" className={TRAZO} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  )
}

function PlomoCorredizo() {
  return (
    <svg viewBox="0 0 460 130" role="img" aria-label="Esquema del montaje de plomo corredizo: la línea madre pasa por dentro del plomo, después una perla, el emerillón, el bajo largo de fluorocarbono y el anzuelo">
      <title>Montaje de plomo corredizo</title>
      {/* Línea madre */}
      <path d="M8 45 L150 45" className={TRAZO} strokeWidth="1.6" strokeLinecap="round" />
      <Etiqueta x={40} y={34}>Línea madre</Etiqueta>

      {/* Plomo: corre libre POR DENTRO de la línea */}
      <ellipse cx="95" cy="45" rx="26" ry="10" className={`${TRAZO} fill-ink/10`} strokeWidth="1.6" />
      <path d="M78 58 l6 6 M112 58 l-6 6" className="stroke-accent" strokeWidth="1.4" strokeLinecap="round" />
      <Etiqueta x={95} y={80}>Corre libre</Etiqueta>

      {/* Perla protectora */}
      <circle cx="137" cy="45" r="6" className={`${TRAZO} fill-ink/20`} strokeWidth="1.4" />
      <Etiqueta x={130} y={98}>Perla</Etiqueta>
      <path d="M136 52 L133 90" className="stroke-ink/30" strokeWidth="0.8" />

      {/* Emerillón */}
      <g>
        <circle cx="158" cy="45" r="4" className={`${TRAZO} fill-none`} strokeWidth="1.5" />
        <rect x="162" y="42" width="10" height="6" rx="3" className={`${TRAZO} ${RELLENO}`} strokeWidth="1" />
        <circle cx="176" cy="45" r="4" className={`${TRAZO} fill-none`} strokeWidth="1.5" />
      </g>
      <Etiqueta x={172} y={28}>Emerillón</Etiqueta>

      {/* Bajo largo */}
      <path d="M180 45 L392 45" className={TRAZO} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M186 66 L330 66" className="stroke-accent" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M186 62 L186 70 M330 62 L330 70" className="stroke-accent" strokeWidth="1.2" strokeLinecap="round" />
      <Etiqueta x={258} y={82}>Bajo de fluorocarbono · 1,5-2 m</Etiqueta>

      <Anzuelo x={394} y={45} />
      <Etiqueta x={420} y={28}>Anzuelo</Etiqueta>
    </svg>
  )
}

function AlPelo() {
  return (
    <svg viewBox="0 0 420 150" role="img" aria-label="Esquema del montaje al pelo: el anzuelo va libre y el cebo cuelga de un cabo corto sujeto por un tope, a dos milímetros de la curva del anzuelo">
      <title>Montaje al pelo</title>
      <path d="M8 40 L150 40" className={TRAZO} strokeWidth="1.6" strokeLinecap="round" />
      <Etiqueta x={60} y={29}>Bajo</Etiqueta>

      <Anzuelo x={152} y={40} escala={1.9} />
      <Etiqueta x={150} y={29}>Anzuelo</Etiqueta>

      {/* El pelo: sale por detrás del ojal y baja */}
      <path d="M152 46 Q150 78 196 84" className="stroke-accent" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Etiqueta x={120} y={112} anchor="start">El pelo · 1-2 cm</Etiqueta>

      {/* Boilie */}
      <circle cx="214" cy="85" r="17" className={`${TRAZO} fill-ink/15`} strokeWidth="1.6" />
      <Etiqueta x={214} y={122}>Boilie o maíz</Etiqueta>

      {/* Tope */}
      <path d="M231 85 l12 0" className="stroke-accent" strokeWidth="2.4" strokeLinecap="round" />
      <Etiqueta x={262} y={78} anchor="start">Tope</Etiqueta>

      {/* Aviso de la distancia crítica */}
      <path d="M186 62 L186 74" className="stroke-accent" strokeWidth="1" strokeDasharray="2 2" />
      <Etiqueta x={310} y={40} anchor="start">Punta SIEMPRE</Etiqueta>
      <Etiqueta x={310} y={52} anchor="start">libre y afilada</Etiqueta>
    </svg>
  )
}

function Texano() {
  return (
    <svg viewBox="0 0 420 125" role="img" aria-label="Esquema del montaje texano: plomo cónico con la punta hacia la caña, anzuelo offset y la punta del anzuelo escondida dentro del vinilo">
      <title>Montaje texano</title>
      <path d="M8 55 L92 55" className={TRAZO} strokeWidth="1.6" strokeLinecap="round" />

      {/* Plomo bala: la punta mira a la caña */}
      <path d="M92 55 L120 42 L120 68 Z" className={`${TRAZO} fill-ink/20`} strokeWidth="1.5" strokeLinejoin="round" />
      <Etiqueta x={104} y={32}>Plomo bala</Etiqueta>
      <Etiqueta x={104} y={86}>Punta a la caña</Etiqueta>

      {/* Vinilo */}
      <path d="M138 55 Q150 36 210 40 Q290 45 330 55 Q290 65 210 70 Q150 74 138 55 Z"
            className={`${TRAZO} fill-ink/10`} strokeWidth="1.6" />
      <Etiqueta x={262} y={95}>Vinilo</Etiqueta>

      {/* Anzuelo offset: el escalón queda dentro de la cabeza */}
      <path d="M124 55 L134 55 L136 48 L142 48" className={TRAZO} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M142 48 L142 66 Q142 78 156 78 Q170 78 170 64 L170 52"
            className={TRAZO} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <Etiqueta x={126} y={116}>Escalón dentro</Etiqueta>

      {/* La punta, APOYADA en el lomo sin salir */}
      <path d="M170 52 L167 47" className="stroke-accent" strokeWidth="2" strokeLinecap="round" />
      <circle cx="169" cy="49" r="9" className="stroke-accent fill-none" strokeWidth="1.2" strokeDasharray="3 2" />
      <Etiqueta x={250} y={24} anchor="start">Punta apoyada, sin salir</Etiqueta>
      <path d="M246 22 L182 44" className="stroke-accent" strokeWidth="1" strokeDasharray="3 2" />
    </svg>
  )
}

const DIAGRAMAS: Record<string, () => React.JSX.Element> = {
  'montaje-plomo-corredizo': PlomoCorredizo,
  'montaje-al-pelo': AlPelo,
  'montaje-texas': Texano,
}

export default function Diagrama({ id }: { id: string }) {
  const D = DIAGRAMAS[id]
  if (!D) return null
  return (
    <figure className="border border-ink/[0.07] rounded-xl bg-paper p-4">
      <div className="w-full [&>svg]:w-full [&>svg]:h-auto">
        <D />
      </div>
      <figcaption className="font-mono text-[10px] uppercase tracking-widest text-ink/60 mt-3 text-center">
        Esquema del montaje · no está a escala
      </figcaption>
    </figure>
  )
}
