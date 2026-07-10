'use client'

import { useState } from 'react'

interface ProductImageProps {
  src: string
  alt: string
  /** Classes applied to the <img> (e.g. object-fit / transitions). */
  className?: string
  /** Load eagerly for above-the-fold hero images. Defaults to lazy. */
  priority?: boolean
}

/**
 * Resilient product image. External catalog/AliExpress images occasionally 404;
 * instead of showing a broken image icon we fall back to a branded placeholder.
 * Kept as a small client component so the rest of the tree can stay server-rendered.
 */
export default function ProductImage({ src, alt, className, priority }: ProductImageProps) {
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

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external hosts + graceful onError fallback
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
