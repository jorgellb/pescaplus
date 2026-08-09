/**
 * Los pasos de cada nudo, dibujados.
 *
 * Un nudo no se aprende leyendo: el texto puede decir «pasa el bucle por encima
 * del anzuelo» con toda la precisión del mundo y quien no lo ha hecho nunca no
 * sabrá por dónde.
 *
 * LO QUE HACE QUE PAREZCA HILO Y NO UNA RAYA. Dos cosas, y las dos importan:
 *
 *  1. **Volumen.** Cada hebra se dibuja TRES veces sobre el mismo trazado: un
 *     borde oscuro y ancho, encima el cuerpo más claro y algo más estrecho, y
 *     encima un filo de luz muy fino desplazado hacia arriba. El ojo lee eso
 *     como un cilindro. Con un solo trazo plano se ve un esquema; con los tres
 *     se ve un hilo.
 *  2. **Cruces.** En un nudo lo único que hay que entender es qué hebra pasa por
 *     delante y cuál por detrás. Se resuelve dibujando la de abajo entera y
 *     luego la de arriba CON su borde: el borde tapa la de abajo y aparece la
 *     profundidad, igual que en un manual de marinería.
 *
 * Y el nudo manda sobre el anzuelo. En la primera versión el anzuelo ocupaba
 * media viñeta y el nudo quedaba diminuto, que es justo al revés de lo que hay
 * que mirar.
 */

/** Grosores de la «cuerda». Cambiar aquí afecta a todos los dibujos por igual. */
const BORDE = 11
const CUERPO = 7.5
const LUZ = 2

/**
 * Una hebra con volumen.
 *
 * `tono` decide si es la línea de trabajo —la que hay que seguir de un paso al
 * siguiente, en color de acento— o el resto del hilo, en tinta.
 */
function Hebra({ d, trabajo = false, escala = 1 }: { d: string; trabajo?: boolean; escala?: number }) {
  const borde = trabajo ? 'stroke-accent' : 'stroke-ink/80'
  const cuerpo = trabajo ? 'stroke-accent/55' : 'stroke-ink/40'
  const luz = trabajo ? 'stroke-accent/25' : 'stroke-ink/15'
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} className={borde} strokeWidth={BORDE * escala} />
      <path d={d} className={cuerpo} strokeWidth={CUERPO * escala} />
      <path d={d} className={luz} strokeWidth={LUZ * escala} transform="translate(0 -1.6)" />
    </g>
  )
}

/**
 * Anzuelo de acero. Va en gris frío y con brillo propio para que se distinga del
 * hilo de un vistazo: son dos materiales distintos y el dibujo tiene que decirlo.
 */
function Anzuelo({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" strokeLinecap="round">
      <circle cx="0" cy="0" r="11" className="stroke-ink/70" strokeWidth="6" />
      <circle cx="0" cy="0" r="11" className="stroke-ink/25" strokeWidth="3" />
      <path d="M0 11 L0 76 Q0 104 26 104 Q50 104 50 78 L50 56" className="stroke-ink/70" strokeWidth="7" />
      <path d="M0 11 L0 76 Q0 104 26 104 Q50 104 50 78 L50 56" className="stroke-ink/25" strokeWidth="3.4" />
      <path d="M50 56 L41 68 M50 56 L60 67" className="stroke-ink/70" strokeWidth="5.5" />
    </g>
  )
}

function Pie({ texto }: { texto: string }) {
  return (
    <text x="150" y="238" textAnchor="middle" className="fill-ink/60 font-mono" style={{ fontSize: 13 }}>
      {texto}
    </text>
  )
}

/** Flecha de movimiento: dice hacia dónde va la mano en ese paso. */
function Flecha({ d }: { d: string }) {
  return (
    <path d={d} className="stroke-accent fill-none" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
          markerEnd="url(#punta)" />
  )
}

/* ── Palomar ─────────────────────────────────────────────────────────────── */

const PALOMAR = [
  /* 1 · El bucle doblado atraviesa el ojal. */
  <g key="1">
    <Anzuelo x={186} y={92} s={0.85} />
    <Hebra d="M14 84 Q90 76 150 88" />
    <Hebra d="M14 124 Q90 132 150 120" />
    <Hebra d="M150 88 Q196 92 214 96 Q230 100 214 106 Q196 112 150 120" trabajo />
    <Flecha d="M120 168 L182 128" />
    <Pie texto="El bucle entra por el ojal" />
  </g>,

  /* 2 · Nudo simple con las dos hebras juntas, sin apretar. */
  <g key="2">
    <Anzuelo x={196} y={98} s={0.85} />
    <Hebra d="M14 74 Q78 68 128 82" />
    <Hebra d="M14 132 Q78 140 128 126" />
    {/* La lazada: baja, cruza por detrás y vuelve a subir */}
    <Hebra d="M128 82 Q86 96 96 132 Q106 164 146 152 Q178 142 170 112" trabajo />
    <Hebra d="M170 112 Q162 88 128 126" trabajo />
    <Hebra d="M170 112 Q198 104 224 108" trabajo />
    <Pie texto="Nudo simple, SIN apretar" />
  </g>,

  /* 3 · El bucle pasa por encima del anzuelo entero. El paso decisivo. */
  <g key="3">
    <Anzuelo x={150} y={86} s={0.85} />
    <Hebra d="M14 74 Q64 68 106 80" />
    <Hebra d="M14 118 Q64 124 106 112" />
    <Hebra d="M106 80 Q88 96 106 112" trabajo />
    {/* El bucle abraza el anzuelo por fuera y sale por debajo */}
    <Hebra d="M106 112 Q92 168 140 196 Q192 224 224 176 Q248 138 226 100 Q210 74 160 74 Q126 74 106 80" trabajo />
    <Flecha d="M78 196 L128 186" />
    <Pie texto="Por encima de TODO el anzuelo" />
  </g>,

  /* 4 · Mojar y cerrar tirando de los dos cabos a la vez. */
  <g key="4">
    <Anzuelo x={214} y={96} s={0.85} />
    <Hebra d="M14 94 Q98 88 168 100" />
    <Hebra d="M14 116 Q98 122 168 106" />
    {/* Las vueltas ya recogidas sobre el ojal */}
    <Hebra d="M168 100 Q192 84 210 94" trabajo />
    <Hebra d="M168 106 Q192 122 210 110" trabajo />
    <Hebra d="M210 94 Q226 102 210 110" trabajo />
    <Flecha d="M96 168 L26 168" />
    <Pie texto="Moja y tira de los dos a la vez" />
  </g>,

  /* 5 · Terminado y recortado. */
  <g key="5">
    <Anzuelo x={214} y={104} s={0.85} />
    <Hebra d="M14 104 Q110 100 176 104" />
    {/* El nudo cerrado: vueltas apretadas contra el ojal */}
    <Hebra d="M176 100 Q196 88 206 100" trabajo />
    <Hebra d="M176 108 Q196 120 206 108" trabajo />
    <Hebra d="M186 94 L186 116" trabajo escala={0.8} />
    <Hebra d="M196 92 L196 118" trabajo escala={0.8} />
    {/* La punta cortada al ras */}
    <Hebra d="M206 104 L228 104" trabajo escala={0.7} />
    <path d="M222 92 L238 116 M238 92 L222 116" className="stroke-ink/50" strokeWidth="3" strokeLinecap="round" />
    <Pie texto="Apretado y cortado a 2 mm" />
  </g>,
]

/* ── Clinch mejorado ─────────────────────────────────────────────────────── */

/**
 * Las vueltas en espiral alrededor de la línea madre.
 *
 * Se dibujan como arcos sueltos y NO como una hélice de un solo trazo: cada
 * vuelta tiene que verse pasando por delante de la madre y desapareciendo por
 * detrás, y eso solo sale dibujándolas una a una con su borde, que tapa lo que
 * hay debajo. Una hélice continua se lee como un muelle plano.
 */
function Vueltas({ x, y, n, paso = 22 }: { x: number; y: number; n: number; paso?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <Hebra key={i} d={`M${x + i * paso} ${y - 15} Q${x + i * paso + 13} ${y} ${x + i * paso} ${y + 15}`} trabajo escala={0.85} />
      ))}
    </>
  )
}

const CLINCH = [
  /* 1 · Pasar por el ojal y dar las vueltas. */
  <g key="1">
    <Anzuelo x={246} y={104} s={0.8} />
    <Hebra d="M14 104 Q120 100 236 104" />
    <Hebra d="M236 104 Q252 118 236 130 Q170 138 96 132" trabajo />
    <Vueltas x={110} y={132} n={5} />
    <Pie texto="Pasa por el ojal y da 5-6 vueltas" />
  </g>,

  /* 2 · La punta vuelve al hueco de encima del ojal. */
  <g key="2">
    <Anzuelo x={246} y={100} s={0.8} />
    <Hebra d="M14 100 Q120 96 236 100" />
    <Hebra d="M236 100 Q252 114 236 126 Q170 134 100 128" trabajo />
    <Vueltas x={114} y={128} n={5} />
    {/* La punta sube y entra por el primer hueco, junto al ojal */}
    <Hebra d="M100 128 Q88 168 150 176 Q206 182 222 122" trabajo />
    <Flecha d="M204 154 L222 126" />
    <Pie texto="La punta, al hueco de junto al ojal" />
  </g>,

  /* 3 · Y también por el bucle grande: esto es la «mejora». */
  <g key="3">
    <Anzuelo x={246} y={96} s={0.8} />
    <Hebra d="M14 96 Q120 92 236 96" />
    <Hebra d="M236 96 Q252 110 236 122 Q170 130 104 124" trabajo />
    <Vueltas x={118} y={124} n={5} />
    <Hebra d="M104 124 Q92 164 150 172 Q200 178 218 126" trabajo />
    {/* El bucle grande que acaba de formarse, y la punta pasando por él */}
    <Hebra d="M218 126 Q210 152 176 152 Q150 152 152 176" trabajo />
    <Flecha d="M120 200 L170 166" />
    <Pie texto="Y por el bucle grande: la MEJORA" />
  </g>,

  /* 4 · Cerrar mojado. */
  <g key="4">
    <Anzuelo x={252} y={104} s={0.8} />
    <Hebra d="M14 104 Q128 100 196 104" />
    <Vueltas x={200} y={104} n={4} paso={14} />
    <Hebra d="M196 104 Q220 104 250 104" trabajo escala={0.9} />
    <Flecha d="M110 168 L30 168" />
    <Pie texto="Moja y tira: la espiral se aprieta" />
  </g>,

  /* 5 · Terminado: espiral ordenada y punta al ras. */
  <g key="5">
    <Anzuelo x={254} y={108} s={0.8} />
    <Hebra d="M14 108 Q128 104 202 108" />
    <Vueltas x={206} y={108} n={5} paso={11} />
    <Hebra d="M260 108 L282 108" trabajo escala={0.7} />
    <path d="M276 96 L292 120 M292 96 L276 120" className="stroke-ink/50" strokeWidth="3" strokeLinecap="round" />
    <Pie texto="Espiral limpia, sin vueltas montadas" />
  </g>,
]

const POR_NUDO: Record<string, React.JSX.Element[]> = {
  'nudo-palomar': PALOMAR,
  'nudo-clinch-mejorado': CLINCH,
}

export default function PasoSVG({ id, paso }: { id: string; paso: number }) {
  const dibujo = POR_NUDO[id]?.[paso]
  if (!dibujo) return null
  return (
    <div className="border border-ink/[0.07] rounded-lg bg-paper mt-3 p-2 max-w-[330px]">
      <svg viewBox="0 0 300 250" className="w-full h-auto" role="img" aria-hidden>
        <defs>
          <marker id="punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0 1 L9 5 L0 9 z" className="fill-accent" />
          </marker>
        </defs>
        {dibujo}
      </svg>
    </div>
  )
}

/** Para saber qué nudos ya tienen sus dibujos y cuáles faltan. */
export function tienePasos(id: string): boolean {
  return Boolean(POR_NUDO[id])
}
