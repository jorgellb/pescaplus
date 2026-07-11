'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ProductImageProps {
  src: string
  alt: string
  /** object-fit / transition classes applied to the image. */
  className?: string
  /** Load eagerly for above-the-fold hero images. Defaults to lazy. */
  priority?: boolean
  /** Responsive sizes hint for next/image. */
  sizes?: string
}

// Hosts we can safely route through the Next image optimizer (see next.config.ts).
const OPTIMIZABLE = /(^|\.)(aliexpress-media\.com|alicdn\.com|unsplash\.com)$/i

function canOptimize(src: string): boolean {
  try {
    return OPTIMIZABLE.test(new URL(src).hostname)
  } catch {
    return false
  }
}

/**
 * Resilient product image. Known CDNs are served through next/image (AVIF/WebP,
 * responsive srcset); arbitrary admin-provided URLs fall back to a plain <img>.
 * Any load error shows a branded placeholder instead of a broken image icon.
 */
export default function ProductImage({
  src,
  alt,
  className,
  priority,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
}: ProductImageProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-5xl select-none"
      >
        <span className="opacity-30">🎣</span>
      </div>
    )
  }

  if (canOptimize(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onError={() => setFailed(true)}
        className={className}
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin host, not optimizable
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
    />
  )
}
