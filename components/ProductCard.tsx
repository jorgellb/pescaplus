import Link from 'next/link'
import type { Product } from '@/types'
import { fishingLabel } from '@/lib/fishing'
import ProductImage from './ProductImage'

type ProductCardProps = Pick<
  Product,
  'id' | 'title' | 'imageUrl' | 'price' | 'currency' | 'affiliateUrl' | 'rating' | 'reviews' | 'typeFishing'
> &
  Partial<Pick<Product, 'videoUrl' | 'aiOptimized'>>

export default function ProductCard({
  id,
  title,
  imageUrl,
  price,
  currency,
  affiliateUrl,
  rating,
  reviews,
  typeFishing,
  videoUrl,
  aiOptimized,
}: ProductCardProps) {
  return (
    <div className="group relative rounded-2xl overflow-hidden bg-white border border-slate-200 hover:border-sky-300 hover:shadow-lg hover:shadow-slate-900/5 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        <Link href={`/products/${id}`}>
          <ProductImage
            src={imageUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>
        <span className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur text-[10px] font-bold text-sky-700 px-2.5 py-1 rounded-full border border-sky-100 shadow-sm uppercase tracking-wide">
          {fishingLabel(typeFishing)}
        </span>
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
          {aiOptimized && (
            <span className="bg-violet-50 text-[10px] font-bold text-violet-600 px-2 py-1 rounded-full border border-violet-100 shadow-sm">
              ✨ IA
            </span>
          )}
          {videoUrl && (
            <span className="bg-slate-900/75 backdrop-blur text-[10px] font-bold text-white px-2 py-1 rounded-full">
              ▶ Vídeo
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/products/${id}`} className="block flex-1">
          <h3 className="text-sm font-semibold text-slate-800 hover:text-sky-600 line-clamp-2 transition-colors leading-snug">
            {title}
          </h3>
        </Link>

        <div className="mt-2 flex items-center gap-1 text-xs">
          <span className="text-amber-400">★</span>
          <span className="font-semibold text-slate-700">{rating.toFixed(1)}</span>
          <span className="text-slate-400">· {reviews.toLocaleString('es-ES')} vendidos</span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-2 pt-3 border-t border-slate-100">
          <span className="text-xl font-extrabold text-slate-900">
            {price.toFixed(2)} <span className="text-sm font-semibold text-slate-400">{currency}</span>
          </span>
          <a
            href={affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-1 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-2 rounded-lg shadow-sm shadow-emerald-500/20 active:scale-[0.97] transition-all"
          >
            Comprar
          </a>
        </div>
      </div>
    </div>
  )
}
