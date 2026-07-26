'use client'

import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, NavigationControl, ScaleControl, GeolocateControl, Marker, Popup, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { ChartProvider } from '@/lib/chart-providers'
import { WAYPOINT_TYPES, type Waypoint } from '@/lib/waypoint-types'

/**
 * Full-screen nautical chart.
 *
 * Layers are built from the provider passed in — this component never names a
 * source or writes a tile URL, which is what keeps the provider swap a config
 * change (see lib/chart-providers).
 */
export default function NauticalChart({ provider, attribution, initial, loggedIn }: {
  provider: ChartProvider
  attribution: string
  /** Where to open the chart: a spot, or the middle of the Spanish coast. */
  initial: { lon: number; lat: number; zoom: number }
  loggedIn: boolean
}) {
  const holder = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const [seamarks, setSeamarks] = useState(true)
  const [bathy, setBathy] = useState(true)
  const [showAreas, setShowAreas] = useState(true)
  const [areasFar, setAreasFar] = useState(false)
  const [ready, setReady] = useState(false)
  const [marks, setMarks] = useState<Waypoint[]>([])
  const [draft, setDraft] = useState<{ lat: number; lon: number } | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('caladero')
  const [depth, setDepth] = useState('')
  const [saving, setSaving] = useState(false)
  const [zone, setZone] = useState<{ coverage: string; areas: { name: string; recreationalFishing: boolean | null; requiresPermit: boolean | null; rulesUrl: string; sourceName: string; sourceDate: string }[]; pescarec: { note: string; url: string } | null } | null>(null)
  const [err, setErr] = useState('')
  const markers = useRef<{ remove(): void }[]>([])

  // Las marcas se piden solo si hay sesión: son privadas por definición.
  useEffect(() => {
    if (!loggedIn) return
    fetch('/api/waypoints')
      .then((r) => r.json())
      .then((d) => { if (d.success) setMarks(d.waypoints) })
      .catch(() => {})
  }, [loggedIn])

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

    // Fuente vacía: se rellena al mover, con lo que entre en pantalla.
    sources.areas = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
    layers.push(
      { id: 'areas-fill', type: 'fill', source: 'areas', paint: { 'fill-color': '#b91c1c', 'fill-opacity': 0.14 } },
      { id: 'areas-line', type: 'line', source: 'areas', paint: { 'line-color': '#b91c1c', 'line-width': 1.6, 'line-opacity': 0.75 } },
    )

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
    const loadAreas = () => {
      const src = m.getSource('areas') as { setData(d: unknown): void } | undefined
      if (!src) return
      const b = m.getBounds()
      const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(',')
      fetch(`/api/areas-protegidas/geojson?bbox=${bbox}&zoom=${m.getZoom().toFixed(1)}`)
        .then((r) => r.json())
        .then((d) => { src.setData(d); setAreasFar(!!d.tooFar) })
        .catch(() => {})
    }
    m.on('load', () => { setReady(true); loadAreas() })
    m.on('moveend', loadAreas)

    // Pulsar un espacio protegido cuenta su nombre y enlaza su ficha.
    m.on('click', 'areas-fill', (e) => {
      const f = e.features?.[0]
      if (!f) return
      const p = f.properties as { name?: string; rulesUrl?: string }
      const link = p.rulesUrl ? `<br><a href="${p.rulesUrl}" target="_blank" rel="noopener noreferrer" style="color:#0a7d72">Ver normativa</a>` : ''
      new Popup({ offset: 8 }).setLngLat(e.lngLat)
        .setHTML(`<strong>${p.name ?? 'Espacio protegido'}</strong><br><span style="font-size:12px">Consulta la normativa antes de pescar.</span>${link}`)
        .addTo(m)
    })
    m.on('click', (e) => {
      if (!loggedIn) return
      const lat = Math.round(e.lngLat.lat * 1e6) / 1e6
      const lon = Math.round(e.lngLat.lng * 1e6) / 1e6
      setDraft({ lat, lon })
      setName(''); setDepth(''); setErr(''); setZone(null)
      fetch(`/api/areas-protegidas?lat=${lat}&lon=${lon}`)
        .then((r) => r.json())
        .then((d) => { if (d.success) setZone(d) })
        .catch(() => {})
    })
    map.current = m

    return () => { m.remove(); map.current = null }
  }, [provider, initial.lon, initial.lat, initial.zoom, loggedIn])

  // Pintar las marcas. Se redibujan enteras: son decenas, no miles.
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    markers.current.forEach((mk) => mk.remove())
    markers.current = marks.map((w) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.title = `${w.name}${w.depthM != null ? ` · ${w.depthM} m` : ''}`
      el.textContent = WAYPOINT_TYPES.find((t) => t.id === w.type)?.emoji ?? '📍'
      el.style.cssText = 'font-size:22px;line-height:1;background:none;border:none;cursor:pointer'
      return new Marker({ element: el }).setLngLat([w.lon, w.lat])
        .setPopup(new Popup({ offset: 18 }).setText(el.title))
        .addTo(m)
    })
  }, [marks, ready])

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

  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    for (const id of ['areas-fill', 'areas-line']) {
      if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', showAreas ? 'visible' : 'none')
    }
  }, [showAreas, ready])

  const saveDraft = async () => {
    if (!draft || !name.trim()) { setErr('Ponle un nombre a la marca.'); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/waypoints', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), type, lat: draft.lat, lon: draft.lon,
          depthM: depth ? Number(depth) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setErr(data.error || 'No se pudo guardar.'); return }
      setMarks((m) => [data.waypoint, ...m])
      setDraft(null)
    } catch { setErr('Fallo de red.') } finally { setSaving(false) }
  }

  const removeMark = async (id: string) => {
    const res = await fetch(`/api/waypoints/${id}`, { method: 'DELETE' })
    if (res.ok) setMarks((m) => m.filter((w) => w.id !== id))
  }

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
        <button type="button" onClick={() => setShowAreas((v) => !v)} aria-pressed={showAreas} className={toggle(showAreas)}>
          🛑 Espacios protegidos
        </button>
        {showAreas && areasFar && (
          <span className="px-3 py-1.5 rounded-full bg-paper/90 text-[12px] text-ink/60 border border-ink/12">
            Acércate para ver los espacios protegidos
          </span>
        )}
      </div>

      {loggedIn && draft && (
        <div className="absolute top-16 left-3 z-20 w-72 bg-paper rounded-2xl shadow-hard-lg border border-ink/[0.07] p-4 space-y-2.5">
          <p className="font-semibold text-ink text-[15px]">Nueva marca</p>
          <p className="text-[12px] text-ink/60">{draft.lat.toFixed(5)}, {draft.lon.toFixed(5)}</p>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
            placeholder="Nombre (p. ej. Bajo de las lubinas)"
            className="w-full border border-ink/12 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent" />
          <div className="grid grid-cols-2 gap-2">
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="border border-ink/12 rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-accent">
              {WAYPOINT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
            </select>
            <input value={depth} onChange={(e) => setDepth(e.target.value)} type="number" min={0} max={11000}
              placeholder="Sonda (m)"
              className="border border-ink/12 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent" />
          </div>
          {zone?.coverage === 'inside' && (
            <div className="rounded-xl border border-red-600/35 bg-red-600/[0.07] p-2.5 space-y-1">
              <p className="text-[12.5px] font-semibold text-red-900">⚠️ Estás dentro de un espacio protegido</p>
              {zone.areas.map((a) => (
                <p key={a.name} className="text-[12px] text-red-900/90">
                  <strong>{a.name}</strong>
                  {a.recreationalFishing === false && ' · pesca recreativa NO permitida'}
                  {a.recreationalFishing === true && ' · pesca recreativa permitida'}
                  {a.recreationalFishing === null && ' · consulta la normativa'}
                  {a.requiresPermit && ' · requiere autorización'}
                  {a.rulesUrl && <> · <a href={a.rulesUrl} target="_blank" rel="noopener noreferrer" className="underline">normativa</a></>}
                  <span className="block text-[11px] opacity-70">Fuente: {a.sourceName} ({a.sourceDate})</span>
                </p>
              ))}
              {zone.pescarec && (
                <p className="text-[11.5px] text-red-900/90">
                  {zone.pescarec.note}{' '}
                  <a href={zone.pescarec.url} target="_blank" rel="noopener noreferrer" className="underline">Más información</a>
                </p>
              )}
            </div>
          )}
          {zone?.coverage === 'unverified' && (
            <p className="text-[11.5px] text-amber-900 bg-amber-500/10 border border-amber-600/25 rounded-xl px-2.5 py-2">
              No tenemos verificada la capa de espacios protegidos en esta zona. <strong>Esto no significa
              que puedas pescar aquí</strong>: comprueba la normativa antes de salir.
            </p>
          )}
          {err && <p className="text-[13px] text-red-700">{err}</p>}
          <p className="text-[11px] text-ink/60">🔒 Solo tú verás esta marca.</p>
          <div className="flex gap-2">
            <button onClick={saveDraft} disabled={saving}
              className="bg-accent text-paper px-4 py-2 text-sm font-semibold rounded-full disabled:opacity-60">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button onClick={() => setDraft(null)} className="px-3 py-2 text-sm text-ink/60 hover:text-ink">Cancelar</button>
          </div>
        </div>
      )}

      {loggedIn && marks.length > 0 && !draft && (
        <details className="absolute top-16 left-3 z-20 w-64 bg-paper rounded-2xl shadow-hard border border-ink/[0.07]">
          <summary className="px-4 py-2.5 text-[14px] font-semibold text-ink cursor-pointer">
            📍 Mis marcas ({marks.length})
          </summary>
          <ul className="max-h-72 overflow-y-auto px-2 pb-2 space-y-0.5">
            {marks.map((w) => (
              <li key={w.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-ink/[0.04]">
                <button onClick={() => map.current?.flyTo({ center: [w.lon, w.lat], zoom: 13 })}
                  className="flex-1 text-left text-[13.5px] text-ink/85 truncate">
                  {WAYPOINT_TYPES.find((t) => t.id === w.type)?.emoji} {w.name}
                </button>
                <button onClick={() => removeMark(w.id)} aria-label={`Borrar ${w.name}`}
                  className="text-[12px] text-ink/40 hover:text-red-700">✕</button>
              </li>
            ))}
          </ul>
          {/* Descarga de fichero, no navegación: un <Link> haría transición de
              cliente y el navegador nunca recibiría el GPX. */}
          <a href="/api/waypoints/gpx" download className="block px-4 py-2 text-[13px] font-semibold text-accent hover:underline">
            Descargar en GPX ↓
          </a>
        </details>
      )}

      {!loggedIn && (
        <p className="absolute top-16 left-3 z-20 bg-paper rounded-xl shadow-hard border border-ink/[0.07] px-3.5 py-2.5 text-[13px] text-ink/70 max-w-xs">
          <a href="/entrar" className="font-semibold text-accent hover:underline">Inicia sesión</a> para guardar tus
          caladeros en la carta. Son privados: solo los ves tú.
        </p>
      )}

      {/* Atribución: es parte de la licencia, así que no se puede ocultar. */}
      <p className="absolute bottom-0 inset-x-0 z-10 bg-paper/90 backdrop-blur px-3 py-1.5 text-[11px] text-ink/70 text-center">
        {attribution}
      </p>
    </div>
  )
}
