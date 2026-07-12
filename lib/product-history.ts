'use client'

/**
 * Client-side "recently viewed" and "favorites" stored in localStorage.
 * We keep a minimal snapshot per product so the lists render without any
 * server fetch. Favorites broadcast a change event so the heart buttons and the
 * navbar counter stay in sync across the page.
 */
export interface ProductSnapshot {
  id: string
  title: string
  price: number
  currency: string
  imageUrl: string
}

const RECENT_KEY = 'pescaplus-recent-v1'
const FAV_KEY = 'pescaplus-favs-v1'
const MAX_RECENT = 12
const MAX_FAVS = 60

export const FAVS_CHANGED_EVENT = 'pescaplus:favs-changed'

function read(key: string): ProductSnapshot[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(key: string, list: ProductSnapshot[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* quota / disabled storage — ignore */
  }
}

function clean(p: ProductSnapshot): ProductSnapshot {
  return { id: p.id, title: p.title, price: p.price, currency: p.currency, imageUrl: p.imageUrl }
}

// ---- Recently viewed -------------------------------------------------------

export function recordRecent(p: ProductSnapshot): void {
  if (!p.id) return
  const list = read(RECENT_KEY).filter((x) => x.id !== p.id)
  list.unshift(clean(p))
  write(RECENT_KEY, list.slice(0, MAX_RECENT))
}

export function getRecent(): ProductSnapshot[] {
  return read(RECENT_KEY)
}

// ---- Favorites -------------------------------------------------------------

export function getFavorites(): ProductSnapshot[] {
  return read(FAV_KEY)
}

export function isFavorite(id: string): boolean {
  return read(FAV_KEY).some((x) => x.id === id)
}

/** Toggle a product's favorite state. Returns the new state (true = saved). */
export function toggleFavorite(p: ProductSnapshot): boolean {
  const list = read(FAV_KEY)
  const exists = list.some((x) => x.id === p.id)
  const next = exists ? list.filter((x) => x.id !== p.id) : [clean(p), ...list].slice(0, MAX_FAVS)
  write(FAV_KEY, next)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(FAVS_CHANGED_EVENT))
  return !exists
}

export function onFavoritesChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(FAVS_CHANGED_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(FAVS_CHANGED_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}
