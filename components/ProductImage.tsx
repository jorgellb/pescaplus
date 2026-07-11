'use client'

import { useState } from 'react'
import Image from 'next/image'
import { proxiedImage } from '@/lib/img-proxy'

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

/**
 * Resilient product image. Third-party CDN images are rewritten to our own
 * same-origin proxy path (hiding the origin host) and served through next/image
 * (AVIF/WebP, responsive srcset); arbitrary admin-provided URLs fall back to a
 * plain <img>. Any load error shows a branded placeholder.
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
        className="absolute inset-0 flex items-center justify-center bg-[#e6e2d6] text-5xl select-none"
      >
        <span className="opacity-25">🎣</span>
      </div>
    )
  }

  // CDN images become a same-origin path (/img/...) so the origin host is hidden
  // and next/image can still optimize them (local paths are optimized by default).
  const resolved = proxiedImage(src, alt)

  if (resolved.startsWith('/')) {
    return (
      <Image
        src={resolved}
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
      src={resolved}
      alt={alt}
      onError={() => setFailed(true)}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
    />
  )
}
