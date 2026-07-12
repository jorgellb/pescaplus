'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProductImage from '@/components/ProductImage'
import { getRecent, type ProductSnapshot } from '@/lib/product-history'

export default function RecentlyViewed({
  excludeId,
  title = 'Vistos recientemente',
}: {
  excludeId?: string
  title?: string
}) {
  const [items, setItems] = useState<ProductSnapshot[]>([])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(getRecent().filter((p) => p.id !== excludeId))
  }, [excludeId])

  if (items.length === 0) return null

  return (
    <section className="space-y-6 mb-20">
      <h2 className="font-display uppercase text-2xl sm:text-3xl md:text-4xl leading-none border-b border-ink/12 pb-4">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {items.map((p) => (
          <Link key={p.id} href={`/products/${p.id}`} className="flex-shrink-0 w-40 sm:w-48 group">
            <div className="relative aspect-square bg-[#e6e2d6] border border-ink/10 rounded-xl overflow-hidden">
              <ProductImage src={p.imageUrl} alt={p.title} sizes="200px" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            </div>
            <h3 className="mt-2 text-sm font-semibold text-ink line-clamp-2 leading-snug group-hover:text-accent transition-colors">{p.title}</h3>
            <span className="font-display text-lg text-ink">
              {p.price.toFixed(2)} {p.currency === 'EUR' ? '€' : p.currency}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
