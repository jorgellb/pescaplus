'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSpotFavorites, onSpotFavoritesChanged } from '@/lib/spot-favorites'
import { getSpot } from '@/lib/fishing-spots'

/** "Tus zonas" quick links on the hub (localStorage favorites). */
export default function FavoriteZones() {
  const [slugs, setSlugs] = useState<string[]>([])

  useEffect(() => {
    const load = () => setSlugs(getSpotFavorites())
     
    load()
    return onSpotFavoritesChanged(load)
  }, [])

  const spots = slugs.map((s) => getSpot(s)).filter(Boolean)
  if (spots.length === 0) return null

  return (
    <div className="mt-5 space-y-2">
      <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">★ Tus zonas</p>
      <div className="flex flex-wrap gap-2">
        {spots.map((s) => (
          <Link key={s!.slug} href={`/mejores-horas/${s!.slug}`} className="px-3.5 py-1.5 text-sm font-bold bg-ink text-paper rounded-full hover:bg-accent transition-colors">
            {s!.name}
          </Link>
        ))}
        {spots.length >= 2 && (
          <Link href={`/mejores-horas/comparar?zonas=${spots.slice(0, 3).map((s) => s!.slug).join(',')}`} className="px-3.5 py-1.5 text-sm font-bold text-accent border border-accent/30 rounded-full hover:bg-accent hover:text-paper transition-colors">
            ⚖️ Comparar tus zonas
          </Link>
        )}
      </div>
    </div>
  )
}
