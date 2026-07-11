import Link from 'next/link'
import type { Product } from '@/types'
import { fishingLabel } from '@/lib/fishing'
import ProductImage from './ProductImage'

type ProductCardProps = Pick<
  Product,
  'id' | 'title' | 'imageUrl' | 'price' | 'currency' | 'rating' | 'reviews' | 'typeFishing'
> &
  Partial<Pick<Product, 'videoUrl' | 'aiOptimized'>>

export default function ProductCard({
  id,
  title,
  imageUrl,
  price,
  currency,
  rating,
  reviews,
  typeFishing,
  videoUrl,
  aiOptimized,
}: ProductCardProps) {
  return (
    <div className="group relative flex flex-col h-full bg-paper border border-ink/10 rounded-2xl overflow-hidden shadow-hard hover-shift">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[#e6e2d6]">
        <ProductImage
          src={imageUrl}
          alt={title}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <Link href={`/products/${id}`} className="absolute inset-0 z-10" aria-label={title} />
        <span className="absolute top-2.5 left-2.5 z-20 pointer-events-none bg-ink/85 text-paper text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-sm">
          {fishingLabel(typeFishing)}
        </span>
        <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none flex flex-col items-end gap-1">
          {aiOptimized && (
            <span className="bg-accent text-paper text-[10px] font-bold uppercase px-2 py-1 rounded-full shadow-sm">✨ IA</span>
          )}
          {videoUrl && (
            <span className="bg-paper/90 text-ink text-[10px] font-bold uppercase px-2 py-1 rounded-full shadow-sm backdrop-blur-sm">▶ Vídeo</span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/products/${id}`} className="block flex-1">
          <h3 className="text-[15px] font-semibold text-ink group-hover:text-accent line-clamp-2 leading-snug tracking-tight transition-colors">
            {title}
          </h3>
        </Link>

        <div className="mt-2 flex items-center gap-1 font-mono text-[11px] text-ink/55">
          <span className="text-accent">★</span>
          <span className="font-bold text-ink/80">{rating.toFixed(1)}</span>
          <span>· {reviews.toLocaleString('es-ES')} vend.</span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-ink/10">
          <span className="font-display text-[26px] leading-none text-ink self-center">
            {price.toFixed(2)}<span className="text-sm align-top">{currency === 'EUR' ? '€' : ` ${currency}`}</span>
          </span>
          <a
            href={`/go/${id}`}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="relative z-20 inline-flex items-center text-xs font-bold uppercase tracking-wide text-paper bg-ink hover:bg-accent px-3.5 py-2 rounded-lg transition-colors"
          >
            Comprar
          </a>
        </div>
      </div>
    </div>
  )
}
