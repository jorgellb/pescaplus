'use client'

import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, NavigationControl, ScaleControl, GeolocateControl, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { ChartProvider } from '@/lib/chart-providers'

/**
 * Full-screen nautical chart.
 *
 * Layers are built from the provider passed in — this component never names a
 * source or writes a tile URL, which is what keeps the provider swap a config
 * change (see lib/chart-providers).
 */
export default function NauticalChart({ provider, attribution, initial }: {
  provider: ChartProvider
  attribution: string
  /** Where to open the chart: a spot, or the middle of the Spanish coast. */
  initial: { lon: number; lat: number; zoom: number }
}) {
  const holder = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const [seamarks, setSeamarks] = useState(true)
  const [bathy, setBathy] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!holder.current || map.current) return

    const sources: StyleSpecification['sources'] = {
      base: { type: 'raster', tiles: provider.base.tiles, tileSize: provider.base.tileSize, attribution: provider.base.attribution },
    }
    const layers: StyleSpecification['layers'] = [
      { id: 'base', type: 'raster', source: 'base', minzoom: provider.base.minZoom, maxzoom: provider.base.maxZoom },
    ]
    // La batimetría va DEBAJO del balizamiento: las marcas deben leerse encima.
    if (provider.bathymetry) {
      sources.bathymetry = {
        type: 'raster', tiles: provider.bathymetry.tiles,
        tileSize: provider.bathymetry.tileSize, attribution: provider.bathymetry.attribution,
      }
      layers.push({
        id: 'bathymetry', type: 'raster', source: 'bathymetry',
        minzoom: provider.bathymetry.minZoom, maxzoom: provider.bathymetry.maxZoom,
        paint: { 'raster-opacity': 0.55 },
      })
    }
    if (provider.seamarks) {
      sources.seamarks = {
        type: 'raster', tiles: provider.seamarks.tiles,
        tileSize: provider.seamarks.tileSize, attribution: provider.seamarks.attribution,
      }
      layers.push({
        id: 'seamarks', type: 'raster', source: 'seamarks',
        minzoom: provider.seamarks.minZoom, maxzoom: provider.seamarks.maxZoom,
      })
    }

    const m = new MapLibreMap({
      container: holder.current,
      style: { version: 8, sources, layers },
      center: [initial.lon, initial.lat],
      zoom: initial.zoom,
      attributionControl: false,
    })
    m.addControl(new NavigationControl({ visualizePitch: false }), 'top-right')
    m.addControl(new ScaleControl({ unit: 'nautical' }), 'bottom-left')
    m.addControl(new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }), 'top-right')
    m.on('load', () => setReady(true))
    map.current = m

    return () => { m.remove(); map.current = null }
  }, [provider, initial.lon, initial.lat, initial.zoom])

  // Los interruptores solo tocan visibilidad: no recrean el mapa.
  useEffect(() => {
    const m = map.current
    if (!m || !ready || !m.getLayer('seamarks')) return
    m.setLayoutProperty('seamarks', 'visibility', seamarks ? 'visible' : 'none')
  }, [seamarks, ready])

  useEffect(() => {
    const m = map.current
    if (!m || !ready || !m.getLayer('bathymetry')) return
    m.setLayoutProperty('bathymetry', 'visibility', bathy ? 'visible' : 'none')
  }, [bathy, ready])

  const toggle = (on: boolean) =>
    `px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${
      on ? 'bg-accent text-paper' : 'bg-paper text-ink/70 border border-ink/12 hover:border-accent'
    }`

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] min-h-[420px]">
      <div ref={holder} className="absolute inset-0" />

      <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
        {provider.seamarks && (
          <button type="button" onClick={() => setSeamarks((v) => !v)} aria-pressed={seamarks} className={toggle(seamarks)}>
            ⚓ Balizamiento
          </button>
        )}
        {provider.bathymetry && (
          <button type="button" onClick={() => setBathy((v) => !v)} aria-pressed={bathy} className={toggle(bathy)}>
            🌊 Profundidad
          </button>
        )}
      </div>

      {/* Atribución: es parte de la licencia, así que no se puede ocultar. */}
      <p className="absolute bottom-0 inset-x-0 z-10 bg-paper/90 backdrop-blur px-3 py-1.5 text-[11px] text-ink/70 text-center">
        {attribution}
      </p>
    </div>
  )
}
