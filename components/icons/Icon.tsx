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

  // — segundo lote: charters, quedadas, cuenta, reseñas, admin —
  star: <path d="M12 3.5 14.8 9.3 21.2 10.2 16.6 14.7 17.7 21 12 17.9 6.3 21 7.4 14.7 2.8 10.2 9.2 9.3 12 3.5Z" fill="currentColor" strokeWidth="0" />,
  sparkles: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m8 8-1.5-1.5M17.5 17.5 16 16M8 16l-1.5 1.5M17.5 6.5 16 8" /><circle cx="12" cy="12" r="2.3" /></>,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.5 2.5 5.5-6" /></>,
  message: <><path d="M4 5h16v11H9l-4 4V16H4V5Z" /><path d="M8 9h8M8 12h5" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.5-4.5" /></>,
  cart: <><circle cx="9.5" cy="20" r="1.3" /><circle cx="17.5" cy="20" r="1.3" /><path d="M2.5 3h2.5l2.3 12.2a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 7H6" /></>,
  card: <><rect x="2.5" y="5.5" width="19" height="13" rx="2" /><path d="M2.5 10h19M6 15h4" /></>,
  package: <><path d="m3.5 7.5 8.5-4 8.5 4-8.5 4-8.5-4Z" /><path d="M3.5 7.5v9l8.5 4 8.5-4v-9" /><path d="M12 11.5v9" /></>,
  ban: <><circle cx="12" cy="12" r="9" /><path d="m5.5 5.5 13 13" /></>,
  link: <><path d="M9.5 14.5 14.5 9.5" /><path d="M11 6.5 13 4.5a3.5 3.5 0 0 1 5 5l-2 2" /><path d="M13 17.5 11 19.5a3.5 3.5 0 0 1-5-5l2-2" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><rect x="8.5" y="2.5" width="7" height="3.5" rx="1" /><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" /></>,
  hook: <><path d="M12 2v11" /><path d="M12 13a4 4 0 1 0 4 4c0-2-1.5-3-2.5-4.5" /><circle cx="12" cy="2.6" r="0" /></>,
  thermometer: <><path d="M12 14.5V5a2 2 0 0 0-4 0v9.5a4 4 0 1 0 4 0Z" /><circle cx="10" cy="17" r="1" fill="currentColor" stroke="none" /></>,
  wind: <><path d="M2 8h11a2.5 2.5 0 1 0-2.3-3.5" /><path d="M2 13h15a2.5 2.5 0 1 1-2.3 3.5" /><path d="M2 18h8a2 2 0 1 1-1.8 2.8" /></>,
  umbrella: <><path d="M3 12a9 7.5 0 0 1 18 0Z" /><path d="M12 12v7.3a2 2 0 0 1-3.6 1.2" /><path d="M12 4v2" /></>,
  kayak: <><path d="M2 16c4-3.5 16-3.5 20 0-4 2-16 2-20 0Z" /><path d="M6 7.5h12" /><path d="M6 7.5v-2.3M18 7.5v-2.3" /></>,
  robot: <><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 8V4" /><circle cx="12" cy="3" r="1.3" /><circle cx="9" cy="14" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="14" r="1.3" fill="currentColor" stroke="none" /><path d="M9 18h6" /></>,
  camera: <><rect x="2.5" y="7" width="19" height="13" rx="2.5" /><circle cx="12" cy="13.5" r="3.8" /><path d="M8.5 7 10 4.3h4L15.5 7" /></>,
  plug: <><path d="M9 3v6M15 3v6" /><path d="M6.5 9h11v3a5.5 5.5 0 0 1-11 0V9Z" /><path d="M12 17.5V21" /></>,
  edit: <><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M14 8l3 3" /></>,
  recycle: <><path d="M12 3.5 9 8.7h3M12 3.5l3 5.2h-3" /><path d="m18.8 13.5 2.3 4-2.3 4h-4" /><path d="m5.2 13.5-2.3 4 2.3 4h4" /><path d="M9.5 8.7 6.2 14.3M14.5 8.7l3.3 5.6" /></>,
  starOutline: <path d="M12 3.5 14.8 9.3 21.2 10.2 16.6 14.7 17.7 21 12 17.9 6.3 21 7.4 14.7 2.8 10.2 9.2 9.3 12 3.5Z" />,  // trazo sin rellenar: rating vacío
  arrowRight: <path d="M4 12h15M13 6l6 6-6 6" />,
  refresh: <><path d="M4 12a8 8 0 0 1 14-5.3L20 9" /><path d="M20 4v5h-5" /><path d="M20 12a8 8 0 0 1-14 5.3L4 15" /><path d="M4 20v-5h5" /></>,

  // — tercer lote: quedadas —
  key: <><circle cx="8" cy="15" r="4.3" /><path d="M11 12 20 3" /><path d="M16.5 6.5 17.5 7.5" /><path d="M18 5 19 6" /></>,
  person: <><circle cx="12" cy="8" r="3.3" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>,

  // — cuarto lote: previsión (cielo, sol) —
  sunny: <><circle cx="12" cy="12" r="4.5" /><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M5.6 18.4l1.5-1.5M16.9 7.1l1.5-1.5" /></>,
  partlyCloudyDay: <><path d="M8 8.5V7M5 10l-1-1M11 10l1-1" /><circle cx="8" cy="10.5" r="2.6" /><path d="M6.5 20a3.7 3.7 0 0 1-.4-7.37A5 5 0 0 1 16 11a3.7 3.7 0 0 1 .7 7H6.5Z" /></>,
  cloudy: <path d="M6.5 19a4 4 0 0 1-.4-7.96 5.5 5.5 0 0 1 10.6-1.8A4 4 0 0 1 16.5 19H6.5Z" />,
  fog: <><path d="M7 10.5a3 3 0 0 1-.3-6A4.3 4.3 0 0 1 15 3.2 3 3 0 0 1 15.3 9H7Z" /><path d="M3 14h18M5 17.5h14M7 21h10" /></>,
  rain: <><path d="M6.5 15.5a3.8 3.8 0 0 1-.4-7.56A5.3 5.3 0 0 1 16.3 5.8 3.8 3.8 0 0 1 16.8 13H6.5Z" /><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" /></>,
  snow: <><path d="M6.5 15.5a3.8 3.8 0 0 1-.4-7.56A5.3 5.3 0 0 1 16.3 5.8 3.8 3.8 0 0 1 16.8 13H6.5Z" /><circle cx="8" cy="19" r="0.6" fill="currentColor" stroke="none" /><circle cx="12" cy="20.5" r="0.6" fill="currentColor" stroke="none" /><circle cx="16" cy="19" r="0.6" fill="currentColor" stroke="none" /></>,
  drizzle: <><path d="M8 8.5V7M5 10l-1-1M11 10l1-1" /><circle cx="8" cy="10.5" r="2.2" /><path d="M6.5 18a3.6 3.6 0 0 1-.4-7.16A4.8 4.8 0 0 1 15.5 9.2 3.6 3.6 0 0 1 16 16H6.5Z" /><path d="M9 20.5l-1 2M14 20.5l-1 2" /></>,
  storm: <><path d="M6.5 14a3.8 3.8 0 0 1-.4-7.56A5.3 5.3 0 0 1 16.3 4.3 3.8 3.8 0 0 1 16.8 11.5H6.5Z" /><path d="M12.5 13l-3 5h3l-1.5 4 4-6h-3l1-3Z" fill="currentColor" stroke="none" /></>,
  sunrise: <><path d="M3 18h18" /><path d="M6.5 18a5.5 5.5 0 0 1 11 0" /><path d="M12 4v3M6 8l1.8 1.8M18 8l-1.8 1.8" /><path d="M9 21l3-3 3 3" /></>,
  sunset: <><path d="M3 18h18" /><path d="M6.5 18a5.5 5.5 0 0 1 11 0" /><path d="M12 4v3M6 8l1.8 1.8M18 8l-1.8 1.8" /><path d="M9 21l3 3 3-3" /></>,
  building: <path d="M4 21h16M5 21V10M19 21V10M3 10l9-6 9 6M8 10v7M12 10v7M16 10v7" />,
  printer: <><rect x="4" y="8" width="16" height="9" rx="1.5" /><path d="M7 8V4h10v4" /><path d="M7 17v3h10v-3" /><circle cx="16.5" cy="11.5" r="0.6" fill="currentColor" stroke="none" /></>,
  lifejacket: <><path d="M8 3h8l2 6v12H6V9l2-6z" /><path d="M10 3v18M14 3v18M6 12h12" /></>,

  // — fases lunares (calendario solunar) —
  moonNew: <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />,
  moonWaxingCrescent: <path d="M12,3 A9,9 0 0,1 12,21 A5,9 0 0,1 12,3 Z" fill="currentColor" stroke="none" />,
  moonFirstQuarter: <path d="M12,3 A9,9 0 0,1 12,21 Z" fill="currentColor" stroke="none" />,
  moonWaxingGibbous: <path d="M12,3 A9,9 0 0,1 12,21 A5,9 0 0,0 12,3 Z" fill="currentColor" stroke="none" />,
  moonFull: <circle cx="12" cy="12" r="9" />,
  moonWaningGibbous: <path d="M12,3 A9,9 0 0,0 12,21 A5,9 0 0,1 12,3 Z" fill="currentColor" stroke="none" />,
  moonLastQuarter: <path d="M12,3 A9,9 0 0,0 12,21 Z" fill="currentColor" stroke="none" />,
  moonWaningCrescent: <path d="M12,3 A9,9 0 0,0 12,21 A5,9 0 0,0 12,3 Z" fill="currentColor" stroke="none" />,

  // — quinto lote: panel de administración —
  gear: <><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="6.5" /><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" /></>,
  folder: <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v8.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5V6.5Z" />,
  notepad: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  euro: <><circle cx="12" cy="12" r="9" /><path d="M16 8.5a4.5 4.5 0 1 0 0 7M7 11h6M7 13.5h6" /></>,
  cursor: <path d="M5 3 19 9l-6 2-2 6-6-14Z" strokeLinejoin="round" />,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M3 16l5-5 4 4 3-3 6 6" /></>,
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
