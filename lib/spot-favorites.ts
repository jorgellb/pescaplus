'use client'

/** Favorite fishing zones, stored in localStorage (slugs only). */
const KEY = 'pescaplus-zonas-v1'
export const SPOT_FAVS_EVENT = 'pescaplus:zonas-changed'

export function getSpotFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function isSpotFavorite(slug: string): boolean {
  return getSpotFavorites().includes(slug)
}

export function toggleSpotFavorite(slug: string): boolean {
  const list = getSpotFavorites()
  const next = list.includes(slug) ? list.filter((x) => x !== slug) : [slug, ...list].slice(0, 30)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SPOT_FAVS_EVENT))
  return next.includes(slug)
}

export function onSpotFavoritesChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(SPOT_FAVS_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(SPOT_FAVS_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}
