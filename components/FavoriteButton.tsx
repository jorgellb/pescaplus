'use client'

import { useEffect, useState } from 'react'
import { isFavorite, toggleFavorite, onFavoritesChanged, type ProductSnapshot } from '@/lib/product-history'

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export default function FavoriteButton({
  product,
  variant = 'icon',
  className = '',
}: {
  product: ProductSnapshot
  variant?: 'icon' | 'full'
  className?: string
}) {
  const [fav, setFav] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setMounted(true)
    setFav(isFavorite(product.id))
    /* eslint-enable react-hooks/set-state-in-effect */
    return onFavoritesChanged(() => setFav(isFavorite(product.id)))
  }, [product.id])

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setFav(toggleFavorite(product))
  }

  const label = fav ? 'Quitar de favoritos' : 'Guardar en favoritos'

  if (variant === 'full') {
    return (
      <button
        onClick={onClick}
        aria-pressed={mounted ? fav : undefined}
        aria-label={label}
        className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 font-bold uppercase text-sm tracking-tight border rounded-xl transition-colors ${
          fav ? 'bg-accent text-paper border-accent' : 'bg-paper text-ink border-ink/15 hover:bg-ink hover:text-paper'
        } ${className}`}
      >
        <Heart filled={fav} />
        {fav ? 'Guardado en favoritos' : 'Guardar en favoritos'}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={mounted ? fav : undefined}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors ${
        fav ? 'bg-accent text-paper border-accent' : 'bg-paper/90 text-ink border-ink/15 hover:bg-ink hover:text-paper backdrop-blur-sm'
      } ${className}`}
    >
      <Heart filled={fav} />
    </button>
  )
}
