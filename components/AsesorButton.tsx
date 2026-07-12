'use client'

import Link from 'next/link'
import { openAsesor } from '@/lib/asesor-bus'

/**
 * A CTA that opens the floating chat widget in place. Falls back to navigating
 * to the full /advice page when the widget isn't mounted (e.g. on /advice itself).
 */
export default function AsesorButton({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href="/advice"
      onClick={(e) => {
        if (openAsesor()) e.preventDefault()
      }}
      className={className}
    >
      {children}
    </Link>
  )
}
