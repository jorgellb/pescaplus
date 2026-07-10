import type { FishingTypeId } from '@/lib/fishing'

/**
 * Elegant line-art icon set, one per fishing category. All icons share a 24×24
 * grid, `currentColor` stroke and rounded joins so they read as a single family.
 */
const ICONS: Record<FishingTypeId, React.ReactNode> = {
  anzuelos: (
    <>
      <circle cx="15" cy="4.5" r="1.6" />
      <path d="M15 6.1V13a4.2 4.2 0 1 1-6-3.8" />
      <path d="M8.9 9.2l.2 2.4M8.9 9.2l2.3.5" />
    </>
  ),
  lineas: (
    <>
      <ellipse cx="12" cy="5" rx="6" ry="1.9" />
      <ellipse cx="12" cy="19" rx="6" ry="1.9" />
      <path d="M6 5v14M18 5v14" />
      <path d="M7.5 9.5h9M7.5 12h9M7.5 14.5h9" />
    </>
  ),
  senuelos: (
    <>
      <path d="M4.5 12c2-3.2 7-3.2 10 0-3 3.2-8 3.2-10 0Z" />
      <path d="M14.5 12l3.5-2M14.5 12l3.5 2" />
      <circle cx="7.5" cy="11.2" r="0.9" />
      <path d="M6 15.5l-2 1.5a1.6 1.6 0 1 0 2.2 1" />
    </>
  ),
  canas: (
    <>
      <path d="M4 20 19 5" />
      <path d="M4 20l3.4-3.4" strokeWidth="2.6" />
      <circle cx="11" cy="13" r="1" />
      <circle cx="15" cy="9" r="0.9" />
      <path d="M19 5c1.4 2.8 1.4 5.6 0 8" />
    </>
  ),
  carretes: (
    <>
      <circle cx="11" cy="13" r="5" />
      <circle cx="11" cy="13" r="1.3" />
      <path d="M11 8V5h4.5" />
      <path d="M16 13h2.6M18.6 13v2.2" />
      <circle cx="18.6" cy="16.4" r="1.1" />
    </>
  ),
  electronica: (
    <>
      <rect x="4" y="4" width="16" height="13" rx="2" />
      <path d="M9 17.5v2.5h6v-2.5" />
      <path d="M7.5 9a3.2 3.2 0 0 1 4.5 0" />
      <circle cx="14.5" cy="11.5" r="1" />
    </>
  ),
  embarcaciones: (
    <>
      <path d="M4 14.5h16l-2.2 4.5H6.2Z" />
      <path d="M11 14.5V9.5h3.2l2 5" />
      <path d="M2.5 21.5c1.6-1.3 3.2-1.3 4.8 0s3.2 1.3 4.8 0 3.2-1.3 4.8 0" />
    </>
  ),
  minuteria: (
    <>
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="12" r="2.6" />
      <rect x="9.4" y="10.2" width="5.2" height="3.6" rx="1.8" />
    </>
  ),
  plomos: (
    <>
      <circle cx="12" cy="4.5" r="1.5" />
      <path d="M12 6C7.5 9 8.2 15.5 12 19c3.8-3.5 4.5-10 0-13Z" />
    </>
  ),
  herramientas: (
    <>
      <circle cx="12" cy="12" r="1.3" />
      <path d="M11 11 9.7 4M13 11l1.3-7" />
      <path d="M11.2 13.1 8 21M12.8 13.1 16 21" />
    </>
  ),
  equipo: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="1.6" />
      <path d="M4 13h16" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2" />
      <path d="M11 12.2h2" />
    </>
  ),
}

interface CategoryIconProps {
  id: FishingTypeId | string
  className?: string
  strokeWidth?: number
}

export default function CategoryIcon({ id, className = 'w-6 h-6', strokeWidth = 1.5 }: CategoryIconProps) {
  const glyph = ICONS[id as FishingTypeId]
  if (!glyph) return null
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {glyph}
    </svg>
  )
}
