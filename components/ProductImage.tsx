'use client'

import { useState } from 'react'
import Image from 'next/image'
import { proxiedImage } from '@/lib/img-proxy'
import Icon from '@/components/icons/Icon'

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
        className="absolute inset-0 flex items-center justify-center bg-ink/[0.05] select-none"
      >
        <Icon name="image" className="w-10 h-10 opacity-25" strokeWidth={1.4} />
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
        /**
         * SIN el optimizador de Vercel, a propósito.
         *
         * Estas imágenes ya vienen optimizadas por nuestro proxy `/img/`, que
         * pide al CDN la variante ligera de 640×640 y la cachea un año como
         * inmutable. Pasarlas ADEMÁS por el optimizador aportaba poco (AVIF y
         * un srcset que apenas se aprovecha en tarjetas pequeñas) y costaba una
         * transformación por cada imagen y cada ancho: con 1.089 imágenes de
         * galería salían ~5.400 transformaciones, muy por encima del tope del
         * plan, y Vercel empezó a responder 402 PAYMENT_REQUIRED a las
         * imágenes — que se veían rotas en la tienda.
         *
         * Si algún día se amplía el plan y se quiere recuperar AVIF aquí, hay
         * que hacer números antes: el gasto crece con el catálogo.
         */
        unoptimized
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
