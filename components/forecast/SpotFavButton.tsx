'use client'

import { useEffect, useState } from 'react'
import { isSpotFavorite, toggleSpotFavorite, onSpotFavoritesChanged } from '@/lib/spot-favorites'

export default function SpotFavButton({ slug, name }: { slug: string; name: string }) {
  const [fav, setFav] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFav(isSpotFavorite(slug))
    return onSpotFavoritesChanged(() => setFav(isSpotFavorite(slug)))
  }, [slug])

  return (
    <button
      onClick={() => setFav(toggleSpotFavorite(slug))}
      aria-pressed={fav}
      aria-label={fav ? `Quitar ${name} de tus zonas` : `Guardar ${name} en tus zonas`}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wide border rounded-xl shadow-hard hover-shift transition-colors ${
        fav ? 'bg-accent text-paper border-accent' : 'bg-paper text-ink border-ink/15 hover:bg-ink hover:text-paper'
      }`}
    >
      {fav ? '★ Zona guardada' : '☆ Guardar zona'}
    </button>
  )
}
