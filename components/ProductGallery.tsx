'use client'

import { useState } from 'react'
import ProductImage from './ProductImage'

interface ProductGalleryProps {
  images: string[]
  alts?: string[]
  videoUrl?: string
  title: string
}

/**
 * Interactive media gallery: a large main view (image or video) plus a
 * thumbnail strip. Video, when present, is offered as the first thumbnail.
 */
export default function ProductGallery({ images, alts, videoUrl, title }: ProductGalleryProps) {
  const gallery = images.filter(Boolean)
  const altFor = (idx: number) => alts?.[idx]?.trim() || title
  const hasVideo = Boolean(videoUrl)
  // 'video' selects the clip; a number selects gallery[index].
  const [selected, setSelected] = useState<number | 'video'>(hasVideo ? 'video' : 0)

  return (
    <div className="space-y-3">
      {/* Main viewer */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-50 aspect-square border border-slate-200 group">
        {selected === 'video' && videoUrl ? (
          <video
            src={videoUrl}
            controls
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <ProductImage
            src={gallery[selected as number] ?? gallery[0] ?? ''}
            alt={altFor(typeof selected === 'number' ? selected : 0)}
            priority
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
      </div>

      {/* Thumbnails */}
      {(gallery.length > 1 || hasVideo) && (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {hasVideo && (
            <button
              onClick={() => setSelected('video')}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                selected === 'video' ? 'border-sky-500' : 'border-slate-200 hover:border-slate-300'
              }`}
              aria-label="Ver vídeo"
            >
              <ProductImage src={gallery[0] ?? ''} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-lg">▶</span>
            </button>
          )}
          {gallery.map((img, idx) => (
            <button
              key={img + idx}
              onClick={() => setSelected(idx)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                selected === idx ? 'border-sky-500' : 'border-slate-200 hover:border-slate-300'
              }`}
              aria-label={altFor(idx)}
            >
              <ProductImage src={img} alt={altFor(idx)} className="absolute inset-0 w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
