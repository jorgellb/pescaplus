'use client'

import Link from 'next/link'
import { openAsesor } from '@/lib/asesor-bus'

/**
 * A CTA that opens the floating chat widget in place. When `ask` is given, that
 * question is auto-sent in the widget. Falls back to navigating to the full
 * /advice page (with `?ask=` preserved) when the widget isn't mounted.
 */
export default function AsesorButton({
  className,
  children,
  ask,
}: {
  className?: string
  children: React.ReactNode
  ask?: string
}) {
  const href = ask ? `/advice?ask=${encodeURIComponent(ask)}` : '/advice'
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (openAsesor(ask)) e.preventDefault()
      }}
      className={className}
    >
      {children}
    </Link>
  )
}
