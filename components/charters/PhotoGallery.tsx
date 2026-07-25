'use client'

import { useState } from 'react'

/**
 * Charter photo gallery: a big cover plus thumbnails, with a lightbox. Photos
 * come from arbitrary hosts (our blob store or a pasted link), so they're plain
 * <img> rather than next/image — no remotePatterns list can cover "anywhere".
 */
export default function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(false)
  if (photos.length === 0) return null

  return (
    <>
      <div className="space-y-2">
        <button type="button" onClick={() => setZoom(true)}
          className="relative block w-full aspect-[16/10] rounded-2xl overflow-hidden bg-ink/[0.05] group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[active]} alt={alt} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
          <span className="absolute bottom-2.5 right-2.5 bg-black/55 text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
            {active + 1} / {photos.length} · ampliar
          </span>
        </button>

        {photos.length > 1 && (
          <div className="grid grid-cols-5 gap-2">
            {photos.slice(0, 5).map((p, i) => (
              <button key={p} type="button" onClick={() => setActive(i)}
                aria-label={`Ver foto ${i + 1}`}
                className={`relative aspect-[4/3] rounded-lg overflow-hidden bg-ink/[0.05] ${i === active ? 'ring-2 ring-accent' : 'opacity-75 hover:opacity-100'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="absolute inset-0 w-full h-full object-cover" />
                {i === 4 && photos.length > 5 && (
                  <span className="absolute inset-0 bg-black/55 text-white text-sm font-semibold flex items-center justify-center">
                    +{photos.length - 5}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {zoom && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoom(false)} role="dialog" aria-modal="true" aria-label={alt}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[active]} alt={alt} className="max-h-full max-w-full object-contain" />
          <button type="button" onClick={() => setZoom(false)} aria-label="Cerrar"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 text-ink text-lg">✕</button>
          {photos.length > 1 && (
            <>
              <button type="button" aria-label="Anterior"
                onClick={(e) => { e.stopPropagation(); setActive((a) => (a - 1 + photos.length) % photos.length) }}
                className="absolute left-4 w-10 h-10 rounded-full bg-white/90 text-ink text-lg">‹</button>
              <button type="button" aria-label="Siguiente"
                onClick={(e) => { e.stopPropagation(); setActive((a) => (a + 1) % photos.length) }}
                className="absolute right-4 w-10 h-10 rounded-full bg-white/90 text-ink text-lg">›</button>
            </>
          )}
        </div>
      )}
    </>
  )
}
