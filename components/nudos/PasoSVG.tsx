/**
 * Los pasos de cada nudo, dibujados.
 *
 * Un nudo no se aprende leyendo. El texto puede decir «pasa el bucle por encima
 * del anzuelo» con toda la precisión del mundo y quien no lo ha hecho nunca no
 * sabrá por dónde. Estos dibujos son el paso a paso de verdad.
 *
 * LO QUE HACE QUE PAREZCAN REALES: los cruces. En un nudo lo único que importa
 * visualmente es qué hebra pasa por encima y cuál por debajo, y en un SVG plano
 * eso no se ve solo. El truco es `Cruce`: se dibuja la hebra de abajo entera,
 * encima un trazo del color del papel y algo más grueso justo donde se cruzan
 * —que borra la de abajo—, y por último la de arriba. El resultado es una hebra
 * que pasa por detrás de otra, igual que en un dibujo de manual.
 *
 * Los colores salen del sistema: la línea de trabajo va en acento para poder
 * seguirla de un paso al siguiente, y el resto en tinta.
 */

const HILO = 'stroke-ink/75'
const TRABAJO = 'stroke-accent'
const PAPEL = 'stroke-paper'

/**
 * Un trozo de hebra que pasa POR DELANTE, borrando lo que haya debajo.
 *
 * El halo del color del papel es lo que crea la sensación de profundidad. Sin
 * él las dos hebras se ven cortándose por el mismo punto y el dibujo deja de
 * explicar nada, que es justo lo que hay que explicar.
 */
function Cruce({ d, clase, ancho = 3 }: { d: string; clase: string; ancho?: number }) {
  return (
    <>
      <path d={d} className={PAPEL} strokeWidth={ancho + 4} fill="none" strokeLinecap="round" />
      <path d={d} className={clase} strokeWidth={ancho} fill="none" strokeLinecap="round" />
    </>
  )
}

/** Anzuelo de perfil, con el ojal arriba. Igual en los cinco pasos. */
function Anzuelo() {
  return (
    <g>
      <circle cx="100" cy="34" r="7" className={`${HILO} fill-none`} strokeWidth="3" />
      <path d="M100 41 L100 88 Q100 108 118 108 Q135 108 135 90 L135 74"
            className={`${HILO} fill-none`} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M135 74 L129 82 M135 74 L142 81" className={HILO} strokeWidth="2.6" strokeLinecap="round" />
    </g>
  )
}

function Mano({ x, y, texto }: { x: number; y: number; texto: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" className="fill-accent font-mono" style={{ fontSize: 10, letterSpacing: 0.5 }}>
      {texto}
    </text>
  )
}

/* ── Palomar ─────────────────────────────────────────────────────────────── */

const PALOMAR = [
  // 1. El bucle atraviesa el ojal
  <g key="1">
    <Anzuelo />
    <path d="M12 20 Q50 20 78 28" className={HILO} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M12 48 Q50 48 78 40" className={HILO} strokeWidth="3" fill="none" strokeLinecap="round" />
    <Cruce d="M78 28 Q95 34 112 30 Q125 26 128 34 Q131 44 118 44 Q100 44 78 40" clase={TRABAJO} />
    <Mano x={100} y={150} texto="bucle de 15 cm" />
  </g>,
  // 2. Nudo simple sin apretar
  <g key="2">
    <Anzuelo />
    <path d="M12 20 Q46 20 70 30" className={HILO} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M12 52 Q46 52 70 42" className={HILO} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M70 30 Q56 46 70 56 Q84 64 92 50" className={TRABAJO} strokeWidth="3" fill="none" strokeLinecap="round" />
    <Cruce d="M92 50 Q98 38 84 34 Q74 32 70 42" clase={TRABAJO} />
    <path d="M92 50 Q112 46 130 52" className={TRABAJO} strokeWidth="3" fill="none" strokeLinecap="round" />
    <Mano x={100} y={150} texto="sin apretar" />
  </g>,
  // 3. El bucle pasa POR ENCIMA de todo el anzuelo
  <g key="3">
    <Anzuelo />
    <path d="M12 24 Q46 24 72 34" className={HILO} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M12 50 Q46 50 72 42" className={HILO} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M72 34 Q60 44 72 50" className={TRABAJO} strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* El bucle abraza el anzuelo entero y baja por detrás */}
    <Cruce d="M72 50 Q66 88 92 116 Q118 138 140 112 Q156 92 148 66 Q142 46 118 42 Q92 38 72 42" clase={TRABAJO} ancho={3} />
    <path d="M96 124 L104 116 M96 124 L104 132" className="stroke-accent" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    <Mano x={100} y={150} texto="por encima del anzuelo" />
  </g>,
  // 4. Mojar y apretar tirando de los dos cabos
  <g key="4">
    <Anzuelo />
    <path d="M12 30 Q48 30 80 38" className={HILO} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M12 46 Q48 46 80 40" className={HILO} strokeWidth="3" fill="none" strokeLinecap="round" />
    <g className={TRABAJO}>
      <path d="M80 38 Q92 30 102 36" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M80 41 Q92 48 102 42" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M102 36 Q112 39 102 42" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
    {/* Flechas: se tira de los dos a la vez */}
    <path d="M46 60 L16 60 M16 60 L24 55 M16 60 L24 65" className="stroke-accent" strokeWidth="2" fill="none" strokeLinecap="round" />
    <Mano x={100} y={150} texto="moja y tira de los dos" />
  </g>,
  // 5. Terminado
  <g key="5">
    <Anzuelo />
    <path d="M12 34 Q52 34 86 38" className={HILO} strokeWidth="3" fill="none" strokeLinecap="round" />
    <g className={TRABAJO}>
      <path d="M86 36 Q94 30 100 34" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M86 40 Q94 46 100 41" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M90 33 L90 44 M95 32 L95 45" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </g>
    <path d="M100 38 L114 38" className={TRABAJO} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M110 30 L120 46 M120 30 L110 46" className="stroke-accent" strokeWidth="1.8" strokeLinecap="round" />
    <Mano x={100} y={150} texto="corta a 2 mm" />
  </g>,
]

const POR_NUDO: Record<string, React.JSX.Element[]> = {
  'nudo-palomar': PALOMAR,
}

export default function PasoSVG({ id, paso }: { id: string; paso: number }) {
  const pasos = POR_NUDO[id]
  const dibujo = pasos?.[paso]
  if (!dibujo) return null
  return (
    <div className="border border-ink/[0.07] rounded-lg bg-paper mt-2 p-1 max-w-[240px]">
      <svg viewBox="0 0 200 160" className="w-full h-auto" role="img" aria-hidden>
        {dibujo}
      </svg>
    </div>
  )
}

/** Para saber si un nudo ya tiene sus dibujos y avisar cuando no. */
export function tienePasos(id: string): boolean {
  return Boolean(POR_NUDO[id])
}
