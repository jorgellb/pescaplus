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
    <div className="group relative rounded-xl overflow-hidden bg-slate-900/40 border border-white/5 hover:border-cyan-500/30 shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full backdrop-blur-md">
      {/* Product Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
        <Link href={`/products/${id}`}>
          <ProductImage
            src={imageUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>
        <span className="absolute top-3 left-3 z-10 bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-cyan-400 px-2.5 py-1 rounded-full border border-cyan-500/20 uppercase tracking-wider">
          {fishingLabel(typeFishing)}
        </span>
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
          {aiOptimized && (
            <span className="bg-violet-500/20 backdrop-blur-md text-[10px] font-bold text-violet-200 px-2 py-1 rounded-full border border-violet-400/30">
              ✨ IA
            </span>
          )}
          {videoUrl && (
            <span className="bg-black/70 backdrop-blur-md text-[10px] font-bold text-white px-2 py-1 rounded-full border border-white/10">
              ▶ Vídeo
            </span>
          )}
        </div>
      </div>

      {/* Product Details */}
      <div className="p-5 flex flex-col flex-1">
        <Link href={`/products/${id}`} className="block flex-1">
          <h3 className="text-base font-bold text-slate-100 hover:text-cyan-400 line-clamp-2 transition-colors duration-200 leading-snug">
            {title}
          </h3>
        </Link>

        {/* Rating and Reviews */}
        <div className="mt-3 flex items-center gap-1">
          <span className="text-amber-400 text-sm">★</span>
          <span className="text-sm font-semibold text-slate-200">{rating.toFixed(1)}</span>
          <span className="text-xs text-slate-400">({reviews.toLocaleString('es-ES')} reseñas)</span>
        </div>

        {/* Price and Action */}
        <div className="mt-5 flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">Precio</span>
            <span className="text-xl font-extrabold text-cyan-300">
              {price.toFixed(2)} <span className="text-xs font-semibold text-slate-400">{currency}</span>
            </span>
          </div>

          <a
            href={affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-xs font-bold text-white rounded-lg group/btn bg-gradient-to-br from-green-400 to-emerald-600 focus:ring-4 focus:outline-none focus:ring-green-800/50 transition-all shadow-md shadow-green-500/10 hover:shadow-green-500/20 hover:scale-[1.03] active:scale-[0.97]"
          >
            <span className="relative px-3 py-2 transition-all ease-in duration-75 bg-slate-900 rounded-md group-hover/btn:bg-transparent">
              Ver en AliExpress
            </span>
          </a>
        </div>
      </div>
    </div>
  )
}
