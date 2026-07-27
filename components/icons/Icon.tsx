import type { JSX } from 'react'

/**
 * Icono de línea compartido para navegación, carta náutica, diario y avisos.
 *
 * Sigue la misma gramática que ya usan CharterIcon y CategoryIcon —rejilla
 * 24×24, trazo `currentColor`, extremos y uniones redondeados— para que toda la
 * interfaz lea como una sola familia visual. No sustituye a esos dos: cubren
 * dominios ya cerrados (parámetros de chárter, categorías de tienda) con sus
 * propios consumidores probados. Este cubre lo que faltaba: navegación
 * principal, carta y las piezas nuevas del diario.
 *
 * El emoji no es solo "menos elegante": en algunas fuentes de Windows y Linux
 * se ve en blanco y negro, con otro estilo, o directamente como un cuadrado.
 * Un SVG propio se ve igual en cualquier sitio y hereda el color del texto.
 */
const P: Record<string, JSX.Element> = {
  // — navegación —
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  scale: <><path d="M12 3v18M6 21h12" /><path d="M5 7h14" /><path d="M5 7 2 13a3 3 0 0 0 6 0L5 7ZM19 7l-3 6a3 3 0 0 0 6 0l-3-6Z" /></>,
  pin: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15 9-4.5 1.5L9 15l4.5-1.5L15 9Z" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  fish: <><path d="M3 12c3.5-5 12-6.5 18-2-3 6-14.5 7-18 2Z" /><path d="M15 9.5 18 6M15 14.5 18 18" /><circle cx="7.5" cy="11.5" r="0.8" /></>,
  anchor: <><circle cx="12" cy="5" r="2.5" /><path d="M12 7.5V21M5 13a7 7 0 0 0 14 0M8 11H5M19 11h-3" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" /><path d="M20 19H6.5A2.5 2.5 0 0 0 4 21.5" /><path d="M8 8h8M8 11h6" /></>,
  boat: <><path d="M3 17h18l-2 4H5l-2-4z" /><path d="M5 17V9l7-5 7 5v8" /><path d="M12 4v13" /></>,
  users: <><path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" /><circle cx="9" cy="7" r="3" /><path d="M22 19v-1a4 4 0 0 0-3-3.87" /><path d="M16 4.13a4 4 0 0 1 0 5.74" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  books: <><path d="M5 3.5A1.5 1.5 0 0 1 6.5 2H9v20H6.5A1.5 1.5 0 0 1 5 20.5V3.5Z" /><path d="M11 2h4v20h-4z" /><path d="m17 3 3.5 1-3.7 19-3.5-.7" /></>,
  trophy: <><path d="M7 4h10v6a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /><path d="M12 15v3M8 21h8M9 21c0-2 1.3-3 3-3s3 1 3 3" /></>,
  rod: <><path d="M3 21 18 4" /><path d="M13 5c3 0 6 1 8-1" /><path d="M18 4c1 2 1 4-1 6" /><circle cx="4.5" cy="19.5" r="1.2" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 6.5 8 6.5 8-6.5" /></>,
  heart: <path d="M12 20S3 14.5 3 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 2.5C21 14.5 12 20 12 20Z" />,

  // — carta náutica —
  close: <path d="M6 6l12 12M18 6 6 18" />,
  radio: <><rect x="3" y="10" width="18" height="10" rx="2" /><path d="m8 10 8-6" /><circle cx="8" cy="15" r="2" /><path d="M14 14h4M14 17h4" /></>,
  record: <circle cx="12" cy="12" r="7" />,
  rock: <><path d="M3 17c0-3 2-4 3.5-6S9 6 12 6s5 3 7 6 2 3 2 5H3Z" /><path d="M8 17c.5-2 2-3 4-3s3.5 1 4 3" /></>,
  ruler: <><rect x="3" y="8" width="18" height="8" rx="1.5" transform="rotate(-8 12 12)" /><path d="m6.5 9.5.7 2M10 9 10.7 11M13.5 8.5l.7 2M17 8l.7 2" /></>,
  wave: <><path d="M2 16c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7.5 0" /><path d="M2 20c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7.5 0" /></>,
  lock: <><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  warning: <><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4" /><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5M3 17.5 12 22l9-4.5" /></>,
  crosshair: <><circle cx="12" cy="12" r="8" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></>,

  // — diario y avisos —
  bell: <><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  microscope: <><path d="M5 20h11" /><path d="M10.5 20v-3.2a3 3 0 0 1 1.8-2.7l1.4-.6" /><path d="M8.5 14.3h5.5" /><path d="M11 14.3 14.5 4.5" /><path d="M13.3 4.5h2.4" /><circle cx="16.5" cy="12.3" r="1.6" /></>,
  check: <path d="m5 13 4 4L19 7" />,
  chartUp: <><path d="M3 20h18" /><path d="m4 16 5-5 4 3 7-8" /><path d="M15 6h5v5" /></>,
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />,
  chartBar: <><path d="M3 20h18" /><rect x="5" y="12" width="3.5" height="8" /><rect x="10.3" y="7" width="3.5" height="13" /><rect x="15.5" y="15" width="3.5" height="5" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10.5 5 4.5 5-4.5" /><path d="M4 19.5h16" /></>,
}

export type IconName = keyof typeof P

export default function Icon({ name, className = 'w-5 h-5', strokeWidth = 1.7 }: {
  name: IconName; className?: string; strokeWidth?: number
}) {
  const shape = P[name]
  if (!shape) return null
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {shape}
    </svg>
  )
}
