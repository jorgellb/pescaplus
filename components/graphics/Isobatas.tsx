import Boya from '@/components/brand/Boya'
import { MARCA } from '@/lib/marca'

/**
 * Isóbatas de carta náutica: las líneas que unen los puntos de igual
 * profundidad, rotuladas en metros, como en las cartas del IHM y en la
 * batimetría de EMODnet que usa la propia web (/carta).
 *
 * Con `bajo`, añade a la derecha un bajo (las isóbatas cerradas de una piedra
 * que sube del fondo) y una boya encima: el caladero, que es donde pica. Las líneas se dibujan una vez al
 * cargar y luego derivan muy despacio; la boya cabecea con sus ondas.
 *
 * Todo se calcula al renderizar en el servidor, una vez: es SVG estático con
 * animación CSS, sin JavaScript en el navegador. Con «reducir movimiento»
 * aparece ya dibujado y quieto.
 */

const ANCHO = 1440
const ALTO = 720

type Punto = readonly [number, number]

/** Curva suave que pasa por todos los puntos (Catmull-Rom → Bézier cúbica). */
function curva(puntos: Punto[], cerrada = false): string {
  const p = cerrada ? [puntos[puntos.length - 1], ...puntos, puntos[0], puntos[1]] : [puntos[0], ...puntos, puntos[puntos.length - 1]]
  const r = (n: number) => Math.round(n * 10) / 10
  let d = `M${r(p[1][0])} ${r(p[1][1])}`
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${r(p2[0])} ${r(p2[1])}`
  }
  return cerrada ? `${d}Z` : d
}

/*
 * Las isóbatas de la plataforma, de la costa (arriba) hacia mar abierto: más
 * juntas cerca de tierra, como en la costa real, donde el fondo cae rápido.
 */
const PLATAFORMA = [
  { prof: 5, y: 70, amp: 16 },
  { prof: 10, y: 140, amp: 20 },
  { prof: 20, y: 225, amp: 24 },
  { prof: 30, y: 320, amp: 28 },
  { prof: 50, y: 430, amp: 30 },
  { prof: 100, y: 560, amp: 34 },
  { prof: 200, y: 700, amp: 38 },
]

function alturaEn(i: number, x: number): number {
  const { y, amp } = PLATAFORMA[i]
  const t = (x + 80) / 160
  return y + amp * Math.sin(t * 0.9 + i * 1.7) + amp * 0.45 * Math.sin(t * 0.37 + i)
}

const LINEAS = PLATAFORMA.map((linea, i) => {
  const puntos: Punto[] = []
  for (let x = -80; x <= ANCHO + 240; x += 80) puntos.push([x, alturaEn(i, x)])
  // El rótulo va en el hueco entre el texto de la portada y el bajo (x 700-790
  // del viewBox), escalonado para que no formen una columna: detrás del texto
  // estorbaba la lectura.
  const xRotulo = 700 + ((i * 37) % 90)
  return { ...linea, d: curva(puntos), rotulo: [xRotulo, alturaEn(i, xRotulo)] as Punto }
})

/* El bajo: isóbatas cerradas que suben hacia la piedra, de fuera adentro. */
const CENTRO: Punto = [1090, 420]
/* La boya mide 120 px (2,5 × su viewBox de 48): sus ondas quedan 21 px bajo el centro. */
const BASE_BOYA = CENTRO[1] + 21
const BAJO = [
  // `angulo`: dónde va el rótulo en su anillo, cada uno en el suyo para que no se amontonen.
  { prof: 40, radio: 230, angulo: -0.32 },
  { prof: 30, radio: 168, angulo: -0.72 },
  { prof: 20, radio: 112, angulo: -1.12 },
  { prof: 12, radio: 62, angulo: -0.55 },
].map(({ prof, radio, angulo }, k) => {
  const enAngulo = (a: number): Punto => {
    const f = 1 + 0.13 * Math.sin(3 * a + k * 0.8) + 0.07 * Math.sin(5 * a + k * 1.9)
    return [CENTRO[0] + Math.cos(a) * radio * f * 1.18, CENTRO[1] + Math.sin(a) * radio * f * 0.82]
  }
  const puntos: Punto[] = []
  for (let n = 0; n < 16; n++) puntos.push(enAngulo((n / 16) * Math.PI * 2))
  // El rótulo, sobre la propia línea, arriba a la derecha: lejos de la boya.
  return { prof, d: curva(puntos, true), rotulo: enAngulo(angulo) }
})

function Rotulo({ punto, texto }: { punto: Punto; texto: string }) {
  return (
    <text
      x={punto[0]}
      y={punto[1] + 4}
      textAnchor="middle"
      className="font-mono anim-aparece"
      fontSize="13"
      fill={MARCA.espuma}
      fillOpacity="0.62"
      stroke={MARCA.fondo}
      strokeWidth="7"
      paintOrder="stroke"
    >
      {texto}
    </text>
  )
}

export default function Isobatas({
  className = '',
  bajo = false,
  rotulos = true,
}: {
  className?: string
  bajo?: boolean
  /** Las profundidades escritas. En el pie no: se cruzarían con los enlaces. */
  rotulos?: boolean
}) {
  // Un id por variante: la portada lleva dos (cabecera y pie), y con ids
  // repetidos el segundo usaría la máscara del primero.
  const velo = `isobatas-velo-${bajo ? 'bajo' : 'llano'}`
  const mascara = `isobatas-mascara-${bajo ? 'bajo' : 'llano'}`
  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Las líneas se apagan hacia la derecha para dejar solo al bajo. */}
        <linearGradient id={velo} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity={bajo ? 0.12 : 0.6} />
        </linearGradient>
        <mask id={mascara}>
          <rect width={ANCHO} height={ALTO} fill={`url(#${velo})`} />
        </mask>
      </defs>

      <g mask={`url(#${mascara})`}>
        <g className="anim-deriva">
          {LINEAS.map((l, i) => (
            <path
              key={l.prof}
              d={l.d}
              pathLength={1}
              className="anim-trazo"
              style={{ ['--retraso' as string]: `${i * 0.12}s` }}
              fill="none"
              stroke={MARCA.espuma}
              strokeOpacity={0.16 + i * 0.025}
              strokeWidth={l.prof >= 100 ? 1.6 : 1.2}
            />
          ))}
          {/* En el móvil el texto ocupa todo el ancho: ahí los rótulos solo estorbarían. */}
          <g className={rotulos ? 'hidden md:inline' : 'hidden'}>
            {LINEAS.map((l) => (
              <Rotulo key={`r${l.prof}`} punto={l.rotulo} texto={String(l.prof)} />
            ))}
          </g>
        </g>
      </g>

      {bajo && (
        <g className="hidden lg:inline">
          {BAJO.map((b, k) => (
            <path
              key={b.prof}
              d={b.d}
              pathLength={1}
              className="anim-trazo"
              style={{ ['--retraso' as string]: `${0.5 + k * 0.18}s` }}
              fill={MARCA.mareaClara}
              fillOpacity={0.025 + k * 0.02}
              stroke={MARCA.mareaClara}
              strokeOpacity={0.3 + k * 0.12}
              strokeWidth="1.4"
            />
          ))}
          {BAJO.map((b) => (
            <Rotulo key={`b${b.prof}`} punto={b.rotulo} texto={String(b.prof)} />
          ))}

          {/* La boya sobre la piedra, con dos ondas que se abren a destiempo. */}
          {[0, 1.9].map((retraso) => (
            <ellipse
              key={retraso}
              className="anim-onda"
              style={{ animationDelay: `${retraso}s` }}
              cx={CENTRO[0]}
              cy={BASE_BOYA}
              rx="86"
              ry="24"
              fill="none"
              stroke={MARCA.mareaClara}
              strokeWidth="2"
            />
          ))}
          <svg x={CENTRO[0] - 60} y={CENTRO[1] - 70} width="120" height="120" viewBox="0 0 48 48" overflow="visible">
            <Boya variante="oscuro" claseBoya="anim-boya" />
          </svg>
        </g>
      )}
    </svg>
  )
}
