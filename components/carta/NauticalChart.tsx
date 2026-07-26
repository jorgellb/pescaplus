'use client'

import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, NavigationControl, ScaleControl, GeolocateControl, Marker, Popup, setWorkerUrl, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { ChartProvider } from '@/lib/chart-providers'
import type { Sounding } from '@/lib/soundings'
import { MIN_POI_ZOOM, POI_KINDS } from '@/lib/nautical-poi-types'
import type { Seabed } from '@/lib/seabed'
import { SEABED_LEGEND_URL, SEABED_NOTE } from '@/lib/seabed'

interface PointConditions {
  available: boolean
  hasMarine?: boolean
  ahora?: {
    windKmh: number | null; gustKmh: number | null; windDirLabel: string | null
    waveM: number | null; wavePeriod: number | null; seaTempC: number | null
    score: number; activity: number
  }
  ventana?: { start: number; end: number; avg: number } | null
  gridKm?: number | null
}

const nf = (v: number | null | undefined, dec = 0) =>
  v == null ? '—' : v.toLocaleString('es-ES', { maximumFractionDigits: dec })

/** "hoy 19:00 – 05:00" / "mañana 06:00 – 11:00", en hora de aquí. */
function ventanaTexto(v: { start: number; end: number }): string {
  const hora = (t: number) => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })
  const dia = (t: number) => {
    const hoy = new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })
    const manana = new Date(Date.now() + 86400000).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })
    const d = new Date(t).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })
    if (d === hoy) return 'hoy'
    if (d === manana) return 'mañana'
    return new Date(t).toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'Europe/Madrid' })
  }
  return `${dia(v.start)} ${hora(v.start)} – ${hora(v.end)}`
}

/**
 * El mar que hay en el punto. Se enseñan cuatro cifras y una ventana: es lo que
 * de verdad decide si sales o te quedas en el muelle. El parte completo, hora a
 * hora, ya vive en la ficha de cada zona.
 */
function PointWeather({ c }: { c: PointConditions | null }) {
  if (!c) return <p className="text-[13px] text-ink/60">Consultando el parte…</p>
  if (!c.available || !c.ahora) return <p className="text-[13px] text-ink/60">Sin parte para este punto</p>
  const a = c.ahora
  return (
    <>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
        <div>
          <dt className="text-ink/60 text-[11px]">Viento</dt>
          <dd className="text-ink font-semibold">
            {nf(a.windKmh)} km/h{a.windDirLabel ? ` ${a.windDirLabel}` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-ink/60 text-[11px]">Rachas</dt>
          <dd className="text-ink font-semibold">{nf(a.gustKmh)} km/h</dd>
        </div>
        {c.hasMarine && (
          <>
            <div>
              <dt className="text-ink/60 text-[11px]">Ola</dt>
              <dd className="text-ink font-semibold">
                {nf(a.waveM, 1)} m{a.wavePeriod != null ? ` · ${nf(a.wavePeriod, 0)} s` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-ink/60 text-[11px]">Agua</dt>
              <dd className="text-ink font-semibold">{nf(a.seaTempC, 1)} °C</dd>
            </div>
          </>
        )}
      </dl>
      {c.ventana && (
        <p className="text-[12px] text-ink/70 mt-2">
          <span className="font-semibold text-accent">Mejor ventana:</span> {ventanaTexto(c.ventana)}
        </p>
      )}
    </>
  )
}
import { WAYPOINT_TYPES, type Waypoint } from '@/lib/waypoint-types'

/**
 * Full-screen nautical chart.
 *
 * Layers are built from the provider passed in — this component never names a
 * source or writes a tile URL, which is what keeps the provider swap a config
 * change (see lib/chart-providers).
 */
/**
 * MapLibre carga su worker con `new URL('./maplibre-gl-worker.mjs',
 * import.meta.url)`. Turbopack no emite ese fichero: la petición caía en el
 * catch-all de Next, devolvía HTML, y el navegador la rechazaba por MIME type.
 * El mapa montaba el canvas y los controles, pero no dibujaba nada — y sin
 * error visible salvo en la consola. Lo servimos desde /public (lo copia
 * scripts/copy-maplibre-worker.mjs antes de compilar), que además cumple la
 * CSP sin abrirla a terceros.
 */
setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')

/**
 * La lectura del fondo. Cada caso se cuenta como es: una medida de un
 * levantamiento no vale lo mismo que una interpolación del modelo global, y
 * decir "0 m" en tierra sería sencillamente falso.
 */
function SoundingReading({ s }: { s: Sounding | null }) {
  if (!s) return <p className="text-[13px] text-ink/60">Midiendo el fondo…</p>
  if (s.kind === 'desconocida' || s.kind === 'tierra') {
    return (
      <p className="text-[13px] text-ink/70">
        {s.label}
        {s.elevationM != null && ` · ${s.elevationM} m de altitud`}
      </p>
    )
  }
  return (
    <>
      <p className="font-display text-[26px] leading-none text-ink">{s.label}</p>
      {s.minM != null && s.maxM != null && s.maxM - s.minM >= 1 && (
        <p className="text-[12px] text-ink/60 mt-1">Entre {nf(s.minM, 1)} y {nf(s.maxM, 1)} m alrededor del punto</p>
      )}
      {s.kind === 'aproximada' && (
        <p className="text-[12px] text-amber-900 mt-1">Sale del modelo global: tómalo solo como orientación.</p>
      )}
      {s.source && (
        <p className="text-[11px] text-ink/60 mt-1">
          Fuente: {s.sourceUrl
            ? <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">{s.source}</a>
            : s.source}
        </p>
      )}
    </>
  )
}

export default function NauticalChart({ provider, attribution, initial, loggedIn }: {
  provider: ChartProvider
  attribution: string
  /** Where to open the chart: a spot, or the middle of the Spanish coast. */
  initial: { lon: number; lat: number; zoom: number }
  loggedIn: boolean
}) {
  const holder = useRef<HTMLDivElement>(null)
  const shell = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const [seamarks, setSeamarks] = useState(true)
  const [bathy, setBathy] = useState(true)
  const [contours, setContours] = useState(true)
  const [substrate, setSubstrate] = useState(false)
  const [showAreas, setShowAreas] = useState(true)
  const [showPois, setShowPois] = useState(true)
  const [poisFar, setPoisFar] = useState(false)
  const [areasFar, setAreasFar] = useState(false)
  // WebGL se comprueba al crear el estado, no en un efecto: es un hecho del
  // navegador, no algo que dependa del ciclo de vida.
  const [fatal, setFatal] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const probe = document.createElement('canvas')
      const gl = probe.getContext('webgl2') || probe.getContext('webgl')
      return gl ? null : 'Tu navegador no tiene WebGL activo, y la carta lo necesita. Actívalo o prueba con otro navegador.'
    } catch {
      return 'No se ha podido inicializar el gráfico de la carta en este navegador.'
    }
  })
  const [tilesOk, setTilesOk] = useState(false)
  const [ready, setReady] = useState(false)
  const [marks, setMarks] = useState<Waypoint[]>([])
  const [draft, setDraft] = useState<{ lat: number; lon: number } | null>(null)
  /** Último punto pinchado y su sonda. `null` mientras se consulta. */
  const [clickedAt, setClickedAt] = useState<{ lat: number; lon: number } | null>(null)
  const [sounding, setSounding] = useState<Sounding | null>(null)
  const [weather, setWeather] = useState<PointConditions | null>(null)
  const [seabed, setSeabed] = useState<Seabed | null>(null)
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

  /*
   * La carta ocupa exactamente lo que queda de ventana bajo la cabecera.
   *
   * Con una altura fija de `100vh - 4rem` el mapa medía casi una pantalla
   * entera, pero empezaba ya por debajo del título y del aviso legal: su borde
   * inferior caía siempre fuera. Ahí viven la atribución y la escala, y la
   * atribución de OpenStreetMap/OpenSeaMap no es decorativa — la ODbL la exige.
   * Se mide contra el documento, no contra el scroll, para que el resultado no
   * dependa de por dónde ande el usuario.
   */
  useEffect(() => {
    const el = shell.current
    if (!el) return
    const fit = () => {
      const top = el.getBoundingClientRect().top + window.scrollY
      el.style.height = `${Math.round(Math.max(window.innerHeight - top, 420))}px`
    }
    fit()
    window.addEventListener('resize', fit)
    window.addEventListener('orientationchange', fit)
    return () => {
      window.removeEventListener('resize', fit)
      window.removeEventListener('orientationchange', fit)
    }
  }, [])

  useEffect(() => {
    if (!holder.current || map.current || fatal) return

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
    // El sustrato es un relleno opaco: va lo más abajo posible, justo sobre la
    // batimetría, para no tapar isóbatas ni balizamiento.
    if (provider.substrate) {
      sources.substrate = {
        type: 'raster', tiles: provider.substrate.tiles,
        tileSize: provider.substrate.tileSize, attribution: provider.substrate.attribution,
      }
      layers.push({
        id: 'substrate', type: 'raster', source: 'substrate',
        minzoom: provider.substrate.minZoom, maxzoom: provider.substrate.maxZoom,
        // Apagada de inicio: es una capa densa y tapa la carta si nadie la pide.
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': 0.5 },
      })
    }
    // Las isóbatas van SOBRE el color batimétrico —si no, se pierden— pero
    // debajo del balizamiento, que es lo que más importa leer.
    if (provider.contours) {
      sources.contours = {
        type: 'raster', tiles: provider.contours.tiles,
        tileSize: provider.contours.tileSize, attribution: provider.contours.attribution,
      }
      layers.push({
        id: 'contours', type: 'raster', source: 'contours',
        minzoom: provider.contours.minZoom, maxzoom: provider.contours.maxZoom,
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
    sources.pois = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
    layers.push(
      { id: 'areas-fill', type: 'fill', source: 'areas', paint: { 'fill-color': '#b91c1c', 'fill-opacity': 0.14 } },
      { id: 'areas-line', type: 'line', source: 'areas', paint: { 'line-color': '#b91c1c', 'line-width': 1.6, 'line-opacity': 0.75 } },
      // Un círculo con borde claro se lee sobre la batimetría y sobre tierra;
      // un icono de color plano se pierde en cuanto el fondo cambia de tono.
      {
        id: 'pois', type: 'circle', source: 'pois',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 4.5, 14, 7],
          'circle-color': ['match', ['get', 'kind'],
            'rampa', '#0a7d72', 'puerto', '#1d4ed8', 'pecio', '#7c2d12', '#0a7d72'],
          'circle-stroke-width': 1.6,
          'circle-stroke-color': '#ffffff',
        },
      },
    )

    let m: MapLibreMap
    let ro: ResizeObserver | null = null
    try {
    m = new MapLibreMap({
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
    const loadPois = () => {
      const src = m.getSource('pois') as { setData(d: unknown): void } | undefined
      if (!src) return
      // Con el mapa muy abierto serían miles de chinchetas ilegibles, y una
      // consulta inútil por cada arrastre. Se avisa en vez de pedirlos.
      if (m.getZoom() < MIN_POI_ZOOM) {
        src.setData({ type: 'FeatureCollection', features: [] })
        setPoisFar(true)
        return
      }
      setPoisFar(false)
      const b = m.getBounds()
      fetch(`/api/puntos-nauticos?w=${b.getWest()}&s=${b.getSouth()}&e=${b.getEast()}&n=${b.getNorth()}`)
        .then((r) => r.json())
        .then((d) => { if (d.success) src.setData(d.geojson) })
        .catch(() => {})
    }
    m.on('error', (e) => {
      const msg = (e as unknown as { error?: Error }).error?.message ?? 'error desconocido'
      console.error('MapLibre:', msg)
      // Un fallo de una tesela suelta no debe tapar el mapa entero.
      if (/webgl|context|style/i.test(msg)) setFatal(`La carta no ha podido dibujarse: ${msg}`)
    })
    m.on('data', (e) => { if (e.dataType === 'source' && e.isSourceLoaded) setTilesOk(true) })
    m.on('load', () => { setReady(true); m.resize(); loadAreas(); loadPois() })

    // Si el contenedor cambia de tamaño (fuentes, rotación, barra del móvil)
    // el mapa no se entera solo.
    ro = new ResizeObserver(() => m.resize())
    ro.observe(holder.current)
    m.on('moveend', loadAreas)
    m.on('moveend', loadPois)

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
    m.on('click', 'pois', (e) => {
      const f = e.features?.[0]
      if (!f) return
      const p = f.properties as { kind: string; name: string; details: string; osmUrl: string; sourceDate: string }
      let filas = ''
      try {
        const d = JSON.parse(p.details || '{}') as Record<string, string>
        filas = Object.entries(d).slice(0, 6)
          .map(([k, v]) => `<div style="font-size:12px"><span style="color:#5b6469">${k}:</span> ${v}</div>`)
          .join('')
      } catch { /* si el detalle viene roto, se enseña la ficha sin él */ }
      const tipo = POI_KINDS.find((k) => k.id === p.kind)
      // Muchos puntos de OSM no tienen nombre. En ese caso el tipo hace de
      // título y no se repite debajo, que quedaba "Rampa de varada" dos veces.
      const titulo = p.name || tipo?.label || 'Punto náutico'
      const subtitulo = p.name && tipo ? `<div style="font-size:12px;color:#5b6469">${tipo.label}</div>` : ''
      new Popup({ offset: 12 }).setLngLat(e.lngLat).setHTML(
        `<strong>${titulo}</strong>`
        + subtitulo
        + filas
        + `<div style="font-size:11px;margin-top:6px"><a href="${p.osmUrl}" target="_blank" rel="noopener noreferrer" style="color:#0a7d72">Ver en OpenStreetMap</a></div>`,
      ).addTo(m)
    })
    m.on('mouseenter', 'pois', () => { m.getCanvas().style.cursor = 'pointer' })
    m.on('mouseleave', 'pois', () => { m.getCanvas().style.cursor = '' })

    m.on('click', (e) => {
      // Si el clic ha caído sobre un punto, manda su ficha, no la sonda.
      if (m.queryRenderedFeatures(e.point, { layers: ['pois'] }).length > 0) return
      const lat = Math.round(e.lngLat.lat * 1e6) / 1e6
      const lon = Math.round(e.lngLat.lng * 1e6) / 1e6

      // La sonda se consulta pinches quien pinches: saber el fondo es útil
      // aunque no tengas cuenta, y es la mejor invitación a crearse una.
      setClickedAt({ lat, lon })
      setSounding(null)
      setWeather(null)
      setSeabed(null)
      fetch(`/api/fondo?lat=${lat}&lon=${lon}`)
        .then((r) => r.json())
        .then((d: Seabed & { success?: boolean }) => { if (d?.success) setSeabed(d) })
        .catch(() => {})
      fetch(`/api/condiciones?lat=${lat}&lon=${lon}`)
        .then((r) => r.json())
        .then((d: PointConditions & { success?: boolean }) => { if (d?.success) setWeather(d) })
        .catch(() => setWeather({ available: false }))
      fetch(`/api/sonda?lat=${lat}&lon=${lon}`)
        .then((r) => r.json())
        .then((d: Sounding & { success?: boolean }) => {
          if (!d?.success) return
          setSounding(d)
          // Se rellena la sonda solo si el patrón no ha escrito la suya: el
          // dato de a bordo siempre manda sobre el del modelo.
          if (d.depthM != null && d.depthM >= 0.5) setDepth((cur) => (cur === '' ? String(d.depthM) : cur))
        })
        .catch(() => setSounding({
          kind: 'desconocida', depthM: null, minM: null, maxM: null, elevationM: null,
          source: null, sourceUrl: null, label: 'Sonda no disponible ahora mismo',
        }))

      if (!loggedIn) return
      setDraft({ lat, lon })
      setName(''); setDepth(''); setErr(''); setZone(null)
      fetch(`/api/areas-protegidas?lat=${lat}&lon=${lon}`)
        .then((r) => r.json())
        .then((d) => { if (d.success) setZone(d) })
        .catch(() => {})
    })
    map.current = m
    } catch (err) {
      // Sin esto, un fallo al construir el mapa dejaba el recuadro vacío y sin
      // explicación: el usuario veía un hueco gris y nada más.
      console.error('MapLibre init falló:', err)
      // Fuera del cuerpo del efecto a propósito: React sigue renderizando este
      // componente y `setFatal` aquí encadenaría un render sobre otro.
      const msg = err instanceof Error ? err.message : 'No se ha podido cargar la carta.'
      queueMicrotask(() => setFatal(msg))
      return
    }

    return () => { ro?.disconnect(); m.remove(); map.current = null }
  }, [provider, initial.lon, initial.lat, initial.zoom, loggedIn, fatal])

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
    if (!m || !ready || !m.getLayer('contours')) return
    m.setLayoutProperty('contours', 'visibility', contours ? 'visible' : 'none')
  }, [contours, ready])

  useEffect(() => {
    const m = map.current
    if (!m || !ready || !m.getLayer('substrate')) return
    m.setLayoutProperty('substrate', 'visibility', substrate ? 'visible' : 'none')
  }, [substrate, ready])

  useEffect(() => {
    const m = map.current
    if (!m || !ready || !m.getLayer('pois')) return
    m.setLayoutProperty('pois', 'visibility', showPois ? 'visible' : 'none')
  }, [showPois, ready])

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

  /*
   * El tamaño de la carta va en estilos inline, y no es por pereza.
   *
   * MapLibre añade la clase `maplibregl-map` al contenedor, y su hoja declara
   * `position:relative` con la misma especificidad que el `.absolute` de
   * Tailwind. Como su CSS viaja en el chunk dinámico y se inyecta DESPUÉS del
   * de la app, ganaba MapLibre: el div se quedaba en relative, `inset:0` dejaba
   * de darle altura, y el mapa entero —controles incluidos— desaparecía tras su
   * propio overflow:hidden. En pantalla: un recuadro vacío, en todos los
   * navegadores.
   *
   * La altura del marco tampoco puede ser una clase: `h-[calc(100vh-4rem)]` no
   * llega a generarse, porque Tailwind v4 exige subrayados en los espacios de
   * un valor arbitrario. Inline, las dos cosas son inmunes al orden de carga.
   */
  return (
    <div ref={shell} className="relative w-full" style={{ height: 'calc(100vh - 4rem)', minHeight: '420px' }}>
      <div ref={holder} style={{ position: 'absolute', inset: 0 }} />

      {/* Todo lo que flota sobre la carta vive en UNA columna. Antes cada panel
          se colocaba con un `top-16` fijo, que da por hecho una sola fila de
          chips: en móvil los chips envuelven a dos filas y el aviso de sesión
          tapaba "Espacios protegidos". Apilados en columna, se colocan solos.
          El contenedor no intercepta el ratón; sus hijos sí. */}
      <div className="absolute top-3 left-3 right-14 z-20 flex flex-col items-start gap-2 pointer-events-none">
      <div className="flex flex-wrap gap-2 pointer-events-auto">
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
        {provider.contours && (
          <button type="button" onClick={() => setContours((v) => !v)} aria-pressed={contours} className={toggle(contours)}>
            📏 Isóbatas
          </button>
        )}
        <button type="button" onClick={() => setShowAreas((v) => !v)} aria-pressed={showAreas} className={toggle(showAreas)}>
          🛑 Espacios protegidos
        </button>
        {provider.substrate && (
          <button type="button" onClick={() => setSubstrate((v) => !v)} aria-pressed={substrate} className={toggle(substrate)}>
            🪨 Tipo de fondo
          </button>
        )}
        <button type="button" onClick={() => setShowPois((v) => !v)} aria-pressed={showPois} className={toggle(showPois)}>
          ⚓ Rampas y puertos
        </button>
        {showPois && poisFar && (
          <span className="px-3 py-1.5 rounded-full bg-paper/90 text-[12px] text-ink/60 border border-ink/12">
            Acércate para ver rampas, puertos y pecios
          </span>
        )}
        {showAreas && areasFar && (
          <span className="px-3 py-1.5 rounded-full bg-paper/90 text-[12px] text-ink/60 border border-ink/12">
            Acércate para ver los espacios protegidos
          </span>
        )}
      </div>

      {substrate && (
        <details className="pointer-events-auto w-64 max-w-full bg-paper rounded-2xl shadow-hard border border-ink/[0.07]">
          <summary className="px-4 py-2.5 text-[13px] font-semibold text-ink cursor-pointer select-none">
            Leyenda del fondo
          </summary>
          <div className="px-4 pb-3">
            {/* La leyenda la sirve el propio EMODnet: así no se desfasa si
                cambian los colores o las clases de su mapa. Va con <img> y no
                con next/image porque es una URL de un WMS ajeno, y optimizarla
                obligaría a declarar su dominio y a proxearla para nada. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SEABED_LEGEND_URL} alt="Clases de sustrato del fondo marino según EUSeaMap"
              className="max-w-full h-auto rounded-lg bg-white" />
            <p className="text-[11px] text-ink/60 mt-2">{SEABED_NOTE}</p>
          </div>
        </details>
      )}

      {clickedAt && !draft && (
        <div className="pointer-events-auto w-72 max-w-full bg-paper rounded-2xl shadow-hard border border-ink/[0.07] px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">Sonda</p>
            <button type="button" onClick={() => { setClickedAt(null); setSounding(null) }}
              aria-label="Cerrar la sonda" className="text-ink/40 hover:text-ink leading-none text-[15px]">×</button>
          </div>
          <div className="mt-1"><SoundingReading s={sounding} /></div>
          {seabed?.substrate && (
            <p className="text-[13px] text-ink mt-1.5">
              <span className="text-ink/60">Fondo:</span> <span className="font-semibold">{seabed.label}</span>
            </p>
          )}
          <div className="mt-3 pt-3 border-t border-ink/[0.07]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60 mb-1.5">El mar aquí</p>
            <PointWeather c={weather} />
          </div>
          <p className="text-[11px] text-ink/60 mt-2.5">{clickedAt.lat.toFixed(4)}, {clickedAt.lon.toFixed(4)}</p>
        </div>
      )}

      {loggedIn && draft && (
        <div className="pointer-events-auto w-72 max-w-full bg-paper rounded-2xl shadow-hard-lg border border-ink/[0.07] p-4 space-y-2.5">
          <p className="font-semibold text-ink text-[15px]">Nueva marca</p>
          <p className="text-[12px] text-ink/60">{draft.lat.toFixed(5)}, {draft.lon.toFixed(5)}</p>
          <div className="rounded-xl bg-ink/[0.03] px-3 py-2 space-y-2">
            <SoundingReading s={sounding} />
            {seabed?.substrate && (
              <p className="text-[13px] text-ink">
                <span className="text-ink/60">Fondo:</span> <span className="font-semibold">{seabed.label}</span>
              </p>
            )}
            <div className="pt-2 border-t border-ink/[0.07]"><PointWeather c={weather} /></div>
          </div>
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
        <details className="pointer-events-auto w-64 max-w-full bg-paper rounded-2xl shadow-hard border border-ink/[0.07]">
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
        <p className="pointer-events-auto bg-paper rounded-xl shadow-hard border border-ink/[0.07] px-3.5 py-2.5 text-[13px] text-ink/70 max-w-xs">
          <a href="/entrar" className="font-semibold text-accent hover:underline">Inicia sesión</a> para guardar tus
          caladeros en la carta. Son privados: solo los ves tú.
        </p>
      )}
      </div>

      {fatal && (
        <div className="absolute inset-x-3 top-3 z-30 rounded-2xl border border-red-600/35 bg-paper p-4 shadow-hard-lg">
          <p className="font-semibold text-red-900 text-[15px]">No se ha podido cargar la carta</p>
          <p className="text-[13.5px] text-ink/75 mt-1">{fatal}</p>
        </div>
      )}
      {!fatal && !tilesOk && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <p className="text-[14px] text-ink/60 bg-paper/85 rounded-full px-4 py-2">Cargando la carta…</p>
        </div>
      )}

      {/* Atribución: es parte de la licencia, así que no se puede ocultar. En
          móvil se le deja hueco a la derecha porque el botón flotante del
          asesor se comía el final del texto. */}
      <p className="absolute bottom-0 inset-x-0 z-10 bg-paper/90 backdrop-blur px-3 py-1.5 pr-20 sm:pr-3 text-[11px] text-ink/70 text-center">
        {attribution}
      </p>
    </div>
  )
}
