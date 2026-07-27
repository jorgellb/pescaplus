'use client'

import { useState } from 'react'
import Icon, { type IconName } from '@/components/icons/Icon'

const LAYERS: { id: string; label: string; overlay: string; icon: IconName; seaOnly?: boolean }[] = [
  { id: 'wind', label: 'Viento', overlay: 'wind', icon: 'wind' },
  { id: 'rain', label: 'Lluvia', overlay: 'rain', icon: 'drizzle' },
  { id: 'waves', label: 'Oleaje', overlay: 'waves', icon: 'wave', seaOnly: true },
]

/** Live third-party (Windy) map, purely visual/orientative on top of our own
 * scored forecast. A client component only because the layer switch needs
 * state — the map itself is still just an iframe whose src we swap. */
export default function LiveWeatherMap({ lat, lon, spotName, isSea }: { lat: number; lon: number; spotName: string; isSea: boolean }) {
  const layers = LAYERS.filter((l) => !l.seaOnly || isSea)
  const [layer, setLayer] = useState(layers[0].overlay)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {layers.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLayer(l.overlay)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border transition-colors ${
              layer === l.overlay ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink/70 border-ink/10 hover:border-ink/40'
            }`}
          >
            <Icon name={l.icon} className="w-3.5 h-3.5" strokeWidth={2} />{l.label}
          </button>
        ))}
      </div>
      <div className="border border-ink/10 rounded-2xl overflow-hidden shadow-hard bg-paper">
        <iframe
          key={layer}
          src={`https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&zoom=9&level=surface&overlay=${layer}&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`}
          title={`Mapa de ${layers.find((l) => l.overlay === layer)?.label.toLowerCase()} en vivo sobre ${spotName}`}
          loading="lazy"
          className="w-full h-[420px] border-0 block"
        />
      </div>
    </div>
  )
}
