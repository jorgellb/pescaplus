import type { JSX } from 'react'

/**
 * Line-icon set for every charter parameter (boat specs, electronics, safety,
 * gear, techniques, species, policies…). One 24×24 stroked grid, `currentColor`,
 * so icons inherit text colour and size cleanly.
 *
 * Related options deliberately share a family icon (all tuna species use the
 * tuna mark, every trolling variant the trolling mark): at 16-20px a distinct
 * silhouette per item would be noise, not information.
 */
const P: Record<string, JSX.Element> = {
  // — resumen / generales —
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  users: <><path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" /><circle cx="9" cy="7" r="3" /><path d="M22 19v-1a4 4 0 0 0-3-3.87" /><path d="M16 4.13a4 4 0 0 1 0 5.74" /></>,
  lock: <><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  language: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" /></>,
  location: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  euro: <><circle cx="12" cy="12" r="9" /><path d="M16 8.5a4.5 4.5 0 1 0 0 7M7 11h6M7 13.5h6" /></>,
  check: <path d="m5 13 4 4L19 7" />,
  cross: <path d="M6 6l12 12M18 6L6 18" />,
  share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.3M8.2 13.2l7.6 4.3" /></>,

  // — barco: características —
  boat: <><path d="M3 17h18l-2 4H5l-2-4z" /><path d="M5 17V9l7-5 7 5v8" /><path d="M12 4v13" /></>,
  ruler: <><path d="M3 8h18v8H3z" /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" /></>,
  beam: <><path d="M3 12h18" /><path d="m6 9-3 3 3 3M18 9l3 3-3 3" /></>,
  engine: <><rect x="3" y="9" width="13" height="8" rx="2" /><path d="M16 12h3l2-3v8l-2-3h-3M7 9V6h4v3" /></>,
  speed: <><path d="M12 21a9 9 0 1 1 9-9" /><path d="m12 12 5-3" /><circle cx="12" cy="12" r="1.5" /></>,
  crew: <><circle cx="12" cy="7" r="3" /><path d="M6 21v-2a6 6 0 0 1 12 0v2" /></>,
  anchor: <><circle cx="12" cy="5" r="2.5" /><path d="M12 7.5V21M5 13a7 7 0 0 0 14 0M8 11H5M19 11h-3" /></>,

  // — electrónica y navegación —
  gps: <><circle cx="12" cy="11" r="3" /><path d="M12 21s7-6.2 7-10a7 7 0 1 0-14 0c0 3.8 7 10 7 10z" /></>,
  sonar: <><path d="M3 5h18" /><path d="M12 5v6" /><path d="M8.5 13a4 4 0 0 0 7 0" /><path d="M6 17a8 8 0 0 0 12 0" /><path d="M4 21h16" /></>,
  fishfinder: <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M7 13c2-3 4 3 6 0s3 1 4-1" /><path d="M9 21h6" /></>,
  radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12 18 6" /></>,
  radio: <><rect x="3" y="10" width="18" height="10" rx="2" /><path d="m8 10 8-6" /><circle cx="8" cy="15" r="2" /><path d="M14 14h4M14 17h4" /></>,
  autopilot: <><circle cx="12" cy="12" r="8" /><path d="M12 4v4M12 16v4M4 12h4M16 12h4" /><circle cx="12" cy="12" r="2" /></>,
  computer: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  relief: <><path d="M3 18h18" /><path d="M4 15c3-6 5 2 8-3s5 4 8 1" /><path d="M4 11c3-5 5 1 8-3" /></>,

  // — seguridad —
  lifebuoy: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="m5.7 5.7 3.8 3.8M14.5 14.5l3.8 3.8M18.3 5.7l-3.8 3.8M9.5 14.5l-3.8 3.8" /></>,
  lifejacket: <><path d="M8 3h8l2 6v12H6V9l2-6z" /><path d="M10 3v18M14 3v18M6 12h12" /></>,
  raft: <><path d="M3 14h18a9 5 0 0 1-18 0z" /><path d="M6 14V9a6 6 0 0 1 12 0v5" /></>,
  beacon: <><path d="M12 21V10" /><circle cx="12" cy="7" r="3" /><path d="M6 21h12M7 6 4 3M17 6l3-3" /></>,
  flare: <><path d="M12 21v-7" /><path d="M9 14h6l-3-11-3 11z" /><path d="M6 21h12" /></>,
  extinguisher: <><rect x="8" y="8" width="8" height="13" rx="2" /><path d="M10 8V6h4v2M14 6h3l1-2" /></>,
  firstaid: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M12 10v6M9 13h6" /></>,
  heart: <path d="M20.8 6.6a5 5 0 0 0-7.1 0L12 8.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.2l8.8-7.5a5 5 0 0 0 0-7.1z" />,
  lights: <><path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3" /><circle cx="12" cy="12" r="3.5" /></>,
  ladder: <><path d="M7 3v18M17 3v18" /><path d="M7 7h10M7 12h10M7 17h10" /></>,

  // — comodidades —
  cabin: <><path d="M4 20V10l8-6 8 6v10" /><rect x="9" y="13" width="6" height="7" /></>,
  wc: <><path d="M6 4v6a4 4 0 0 0 8 0V4" /><path d="M10 14v6M6 20h8" /><circle cx="18" cy="5" r="2" /><path d="M18 9v5M16 20l2-6 2 6" /></>,
  awning: <><path d="M3 11h18l-3-5H6l-3 5z" /><path d="M3 11c0 2 3 2 4.5 0S12 9 12 11s3 2 4.5 0S21 9 21 11" /><path d="M12 13v8" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  ice: <><path d="M12 3v18M3.6 7.5l16.8 9M20.4 7.5l-16.8 9" /><path d="M12 6.5 9.5 4M12 6.5 14.5 4M12 17.5 9.5 20M12 17.5l2.5 2.5" /></>,
  livewell: <><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M4 12c3 2 5-2 8 0s5 2 8 0" /><path d="M8 7V4h8v3" /></>,
  rodholder: <><path d="M6 21 18 4" /><path d="M4 21h6" /><circle cx="18.5" cy="3.5" r="1.5" /><path d="m8 16 3 2" /></>,
  multimedia: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /><path d="M12 3v6M12 15v6" /></>,
  mate: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2" /><path d="M17 11h5M19.5 8.5v5" /></>,
  shower: <><path d="M4 21V8a4 4 0 0 1 8 0" /><path d="M8 8h12" /><path d="M14 12v1M17 12v1M20 12v1M15.5 16v1M18.5 16v1" /></>,

  // — aparejos y técnicas —
  rod: <><path d="M4 20 20 4" /><path d="M17 7c-2 2-1 5 1 6" /><path d="M4 20h4" /></>,
  reel: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 5V3M19 12h2" /></>,
  hook: <><path d="M14 3v9a5 5 0 0 1-10 0" /><path d="M14 3h3" /><path d="M4 12l-2 2M4 12l2 2" /></>,
  lure: <><path d="M4 12c4-5 10-5 14 0-4 5-10 5-14 0z" /><circle cx="8" cy="12" r="1" /><path d="M18 12h3M19 9v6" /></>,
  jig: <><path d="M12 3v10" /><path d="M9 13h6l-3 8-3-8z" /><path d="M12 3l3 2M12 3 9 5" /></>,
  splash: <><path d="M3 17c3 0 3-3 6-3s3 3 6 3 3-3 6-3" /><path d="M8 9V5M12 8V3M16 9V5" /></>,
  trolling: <><path d="M3 6h5l3 6-3 6H3" /><path d="M11 12h10" /><path d="M18 9l3 3-3 3" /></>,
  weight: <><path d="M9 6h6l3 15H6L9 6z" /><path d="M10 6V4a2 2 0 0 1 4 0v2" /></>,
  livebait: <><path d="M3 12c4-4 9-4 12 0-3 4-8 4-12 0z" /><circle cx="7" cy="12" r=".8" /><path d="M15 12c2-2 4-2 6 0-2 2-4 2-6 0z" /></>,
  chum: <><circle cx="7" cy="8" r="1.5" /><circle cx="13" cy="6" r="1.2" /><circle cx="17" cy="10" r="1.5" /><circle cx="10" cy="13" r="1.2" /><circle cx="15" cy="16" r="1.5" /><circle cx="7" cy="18" r="1.2" /></>,
  drift: <><path d="M3 9h12a3 3 0 1 0-3-3" /><path d="M3 14h15a3 3 0 1 1-3 3" /><path d="M3 19h8" /></>,
  harness: <><path d="M8 3v6a4 4 0 0 0 8 0V3" /><rect x="6" y="9" width="12" height="6" rx="2" /><path d="M9 15v6M15 15v6" /></>,
  belt: <><rect x="2" y="9" width="20" height="6" rx="2" /><rect x="9" y="8" width="6" height="8" rx="1" /><path d="M12 10v4" /></>,
  fly: <><path d="M12 4v16" /><path d="M12 8c-4-4-8-2-8 1s4 3 8 0" /><path d="M12 8c4-4 8-2 8 1s-4 3-8 0" /></>,

  // — especies —
  fish: <><path d="M3 12c4-6 12-6 16 0-4 6-12 6-16 0z" /><circle cx="8" cy="11" r=".9" /><path d="M19 12c1.5-2 3-2 3 0s-1.5 2-3 0z" /></>,
  tuna: <><path d="M2 13c5-7 14-7 19 0-5 7-14 7-19 0z" /><circle cx="7" cy="12" r="1" /><path d="M12 6v3M12 17v3M16 8l2-3M16 18l2 3" /></>,
  swordfish: <><path d="M2 13h6" /><path d="M8 13c3-5 9-5 13 0-4 5-10 5-13 0z" /><circle cx="12" cy="12" r=".9" /></>,
  squid: <><path d="M8 3c-2 3-2 6 0 8h8c2-2 2-5 0-8" /><path d="M9 11c0 4-1 7-2 10M12 11v10M15 11c0 4 1 7 2 10" /></>,
  eel: <><path d="M3 8c4-4 6 4 10 0s6-2 8 2" /><path d="M3 16c4-4 6 4 10 0s6-2 8 2" /></>,
  ray: <><path d="M12 4c6 2 9 8 9 12-3-2-6-2-9-2s-6 0-9 2c0-4 3-10 9-12z" /><path d="M12 16v5" /></>,
  captain: <><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0" /><path d="M7 5h10l-1-2H8L7 5z" /></>,

  // — zonas —
  coast: <><path d="M3 18h18" /><path d="M3 18c2-6 6-9 9-9s7 3 9 9" /><path d="M12 9V4" /></>,
  offshore: <><path d="M2 17c2 0 3-1.5 5-1.5s3 1.5 5 1.5 3-1.5 5-1.5 3 1.5 5 1.5" /><path d="M2 21c2 0 3-1.5 5-1.5s3 1.5 5 1.5 3-1.5 5-1.5 3 1.5 5 1.5" /><path d="M8 12h8l-1-6H9l-1 6z" /></>,
  reef: <><path d="M3 20h18" /><path d="M6 20V9l3 4 3-8 3 8 3-4v11" /></>,
  estuary: <><path d="M3 6c4 4 8-2 12 2s5 2 6 1" /><path d="M3 13c4 4 8-2 12 2s5 2 6 1" /><path d="M3 20h18" /></>,

  // — políticas / extras —
  child: <><circle cx="12" cy="6" r="3" /><path d="M12 9v6M8 12h8M9 21l3-6 3 6" /></>,
  drink: <><path d="M6 4h12l-2 7H8L6 4z" /><path d="M12 11v7M9 21h6" /></>,
  smoking: <><rect x="3" y="14" width="14" height="4" rx="1" /><path d="M19 14v4M21 14v4" /><path d="M15 10c2-1 2-3 0-4" /></>,
  nosmoking: <><rect x="3" y="14" width="14" height="4" rx="1" /><path d="M4 20 20 4" /></>,
  release: <><path d="M3 12c4-5 10-5 14 0-4 5-10 5-14 0z" /><path d="M18 5l3 3-3 3" /><path d="M21 8h-6" /></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="m9 12 2 2 4-4" /></>,
  pet: <><circle cx="8" cy="7" r="2" /><circle cx="16" cy="7" r="2" /><circle cx="5" cy="13" r="2" /><circle cx="19" cy="13" r="2" /><path d="M12 12c-3 0-5 3-5 5s2 3 5 3 5-1 5-3-2-5-5-5z" /></>,
  fuel: <><rect x="4" y="4" width="10" height="17" rx="2" /><path d="M4 10h10" /><path d="M14 9h3l2 2v7a1.5 1.5 0 0 1-3 0v-4h-2" /></>,
  license: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M14 10h4M14 13h4M6 16h7" /></>,
  snack: <><path d="M5 8h14l-1.5 12h-11L5 8z" /><path d="M9 8V5a3 3 0 0 1 6 0v3" /></>,
  meal: <><path d="M4 3v8a2 2 0 0 0 4 0V3M6 11v10" /><path d="M17 3c-2 2-2 6 0 8v10" /></>,
  camera: <><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13" r="3.5" /><path d="M9 7l1.5-3h3L15 7" /></>,
  car: <><path d="M5 17h14M4 17v-4l2-5h12l2 5v4" /><circle cx="8" cy="18" r="1.8" /><circle cx="16" cy="18" r="1.8" /></>,
  pill: <><rect x="3" y="9" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)" /><path d="m9 9 6 6" /></>,
}

export default function CharterIcon({ name, className = 'w-5 h-5', strokeWidth = 1.7 }: {
  name: string; className?: string; strokeWidth?: number
}) {
  const shape = P[name] ?? P.check
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {shape}
    </svg>
  )
}
