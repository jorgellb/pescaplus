'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, NavigationControl, ScaleControl, GeolocateControl, FullscreenControl, Marker, Popup, setWorkerUrl, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { ChartProvider } from '@/lib/chart-providers'
import { WAYPOINT_TYPES, type Waypoint } from '@/lib/waypoint-types'
import type { Sounding } from '@/lib/soundings'
import {
  Marea, PointWeather, SeabedReading, SoundingReading, nf,
  type PointConditions,
} from './PointReadings'
import { MIN_POI_ZOOM, POI_KINDS } from '@/lib/nautical-poi-types'
import type { Seabed } from '@/lib/seabed'
import { SEABED_RESOLUTION } from '@/lib/seabed'
import { especiesCompatibles, datosQueFaltan } from '@/lib/species-match'
import { useTrackRecorder } from './useTrackRecorder'
import { useSounder } from './useSounder'
import { formatDistance, formatDuration } from '@/lib/track-types'
import { trackToGPX } from '@/lib/gpx'
import MarksTransfer from './MarksTransfer'
import CoordinateEntry from './CoordinateEntry'
import { formatNautical } from '@/lib/marks-io'
import { SEABED_LEGEND_URL, SEABED_NOTE } from '@/lib/seabed'

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
  const [showPois, setShowPois] = useState(true)
  const [showMiFondo, setShowMiFondo] = useState(false)
  const [miFondo, setMiFondo] = useState<{ sondas: number; celdaM: number } | null>(null)
  const [poisFar, setPoisFar] = useState(false)
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
  const [normativa, setNormativa] = useState<{
    comunidad: { region: string; segun: string; organismo: string | null; enlace: string | null }
    licencia: string; tallasUrl: string; revisado: string; aviso: string
  } | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('caladero')
  const [depth, setDepth] = useState('')
  const [saving, setSaving] = useState(false)
  const [zone, setZone] = useState<{ coverage: string; areas: { name: string; recreationalFishing: boolean | null; requiresPermit: boolean | null; rulesUrl: string; sourceName: string; sourceDate: string }[]; pescarec: { note: string; url: string } | null } | null>(null)
  const [err, setErr] = useState('')
  const markers = useRef<{ remove(): void }[]>([])
  /** La chincheta del punto que se está mirando, distinta de las marcas guardadas. */
  const puntoMarker = useRef<Marker | null>(null)
  const sounder = useSounder()
  const sondaRef = useRef<number | null>(null)
  useEffect(() => { sondaRef.current = sounder.state.depthM }, [sounder.state.depthM])
  // Se pasa como función: si se pasara el valor, cada punto de la derrota se
  // quedaría con la profundidad del render anterior.
  const rec = useTrackRecorder(() => sondaRef.current)
  /**
   * Si el mapa sigue al barco. Se apaga en cuanto el usuario arrastra: grabando
   * una derrota es normal querer mirar la costa de al lado, y recentrar en cada
   * posición nueva le arranca el mapa de debajo del dedo. Para volver a
   * seguirlo está el botón de posición de MapLibre.
   */
  const siguiendo = useRef(true)
  /*
   * La entrada de coordenadas nace apagada: es una herramienta puntual —"llévame
   * a este sitio"— y tenerla siempre desplegada le comía un tercio de la carta a
   * quien no la usa.
   */
  const [showCoords, setShowCoords] = useState(false)
  /*
   * Sin cobertura la carta sigue funcionando con lo guardado, pero hay que
   * decirlo: el fondo y la sonda valen igual —no cambian— mientras que el parte
   * del mar puede ser de la última vez que hubo red. Callarlo sería dejar que
   * alguien salga fiándose de un viento de ayer.
   */
  const [sinRed, setSinRed] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  const [savingTrack, setSavingTrack] = useState(false)
  const [trackName, setTrackName] = useState('')
  const [trackDone, setTrackDone] = useState<string | null>(null)
  const [savedTracks, setSavedTracks] = useState<{ id: string; name: string; distanceM: number; durationS: number; startedAt: number }[]>([])
  const [shownTrack, setShownTrack] = useState<string | null>(null)

  /**
   * Pide la sonda de un punto. EMODnet falla de vez en cuando —la primera
   * conexión saliente de un proceso frío puede morir— y esto tiene que poder
   * repetirse sin obligar a nadie a buscar otra vez el mismo punto en la carta.
   * Solo toca setters, cuya identidad React garantiza estable, así que al efecto
   * del mapa (que se ejecuta una vez) le sirve la copia que capturó.
   */
  /**
   * La derrota, a un fichero GPX, sin pasar por el servidor.
   *
   * Grabar no exige cuenta: quien acaba de descubrir la página puede salir a
   * navegar, grabar su derrota y llevársela al plotter. Guardarla en PescaPlus
   * sí la exige, porque hay que saber de quién es.
   */
  const descargarGPX = () => {
    const pts = rec.state.points
    if (pts.length < 2) return
    const nombre = trackName.trim() || `Salida del ${new Date(pts[0].t).toLocaleDateString('es-ES')}`
    const xml = trackToGPX({
      id: 'local', userId: '', name: nombre, notes: '', points: pts,
      distanceM: rec.state.distanceM, durationS: rec.state.durationS,
      startedAt: pts[0].t, visibility: 'private', createdAt: Date.now(), updatedAt: Date.now(),
    })
    const url = URL.createObjectURL(new Blob([xml], { type: 'application/gpx+xml' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${nombre.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'ruta'}.gpx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const guardarRuta = async () => {
    const pts = rec.terminar()
    if (pts.length < 2) { setTrackDone('La ruta no tiene puntos suficientes para guardarse.'); return }
    setSavingTrack(true)
    try {
      const r = await fetch('/api/rutas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trackName.trim() || `Salida del ${new Date(pts[0].t).toLocaleDateString('es-ES')}`, points: pts }),
      })
      const d = await r.json()
      if (d.success) {
        rec.limpiar()
        setTrackName('')
        setTrackDone('Ruta guardada. Es privada: solo la ves tú.')
        cargarRutas()
      } else {
        // La grabación NO se borra si el guardado falla: se puede reintentar.
        setTrackDone(d.error ?? 'No se ha podido guardar la ruta.')
      }
    } catch {
      setTrackDone('No se ha podido guardar la ruta. Sigue aquí: inténtalo otra vez.')
    } finally {
      setSavingTrack(false)
    }
  }

  /** Pinta una ruta guardada sobre la carta y encuadra su recorrido. */
  const verRuta = async (id: string) => {
    // Grabando NO se pisa la derrota en curso con otra: se perdería de vista lo
    // que se está haciendo, que es lo último que quiere nadie en el agua.
    if (rec.state.status === 'grabando') { setTrackDone('Termina o pausa la grabación para ver otra ruta.'); return }
    try {
      const r = await fetch(`/api/rutas/${id}`)
      const d = await r.json()
      if (!d.success || !Array.isArray(d.track?.points) || d.track.points.length < 2) return
      const pts = d.track.points as { lat: number; lon: number }[]
      const src = map.current?.getSource('ruta') as { setData(d: unknown): void } | undefined
      src?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts.map((p) => [p.lon, p.lat]) } })
      setShownTrack(id)
      siguiendo.current = false
      const lats = pts.map((p) => p.lat)
      const lons = pts.map((p) => p.lon)
      map.current?.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 60, duration: 800 })
    } catch { /* si falla, la carta se queda como estaba */ }
  }

  const borrarRuta = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Borrar la ruta "${nombre}"? No se puede deshacer.`)) return
    try {
      const r = await fetch(`/api/rutas/${id}`, { method: 'DELETE' })
      if ((await r.json()).success) {
        setSavedTracks((prev) => prev.filter((t) => t.id !== id))
        if (shownTrack === id) {
          const src = map.current?.getSource('ruta') as { setData(d: unknown): void } | undefined
          src?.setData({ type: 'FeatureCollection', features: [] })
          setShownTrack(null)
        }
      }
    } catch { /* se queda como estaba */ }
  }

  const pedirSonda = (lat: number, lon: number) => {
    setSounding(null)
    fetch(`/api/sonda?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((d: Sounding & { success?: boolean }) => {
        if (!d?.success) return
        setSounding(d)
        // Se rellena la sonda solo si el patrón no ha escrito la suya: el dato
        // de a bordo siempre manda sobre el del modelo.
        if (d.depthM != null && d.depthM >= 0.5) setDepth((cur) => (cur === '' ? String(d.depthM) : cur))
      })
      .catch(() => setSounding({
        kind: 'desconocida', depthM: null, minM: null, maxM: null, elevationM: null,
        source: null, sourceUrl: null, label: 'Sonda no disponible ahora mismo',
        relief: { kind: 'desconocido', rangeM: null, label: 'Sin datos de relieve', hint: null },
        cells: null,
      }))
  }

  /**
   * Todo lo que se sabe de un punto: sonda, fondo, mar y —con sesión— el panel
   * para guardarlo como marca.
   *
   * La usan el clic en la carta y el formulario de coordenadas. Estaba metida
   * dentro del manejador del mapa, y dejarla ahí habría obligado a duplicarla
   * para la entrada manual, con el riesgo de que una de las dos vías acabara
   * enseñando menos que la otra.
   */
  const marcarPunto = (lat: number, lon: number) => {
    setClickedAt({ lat, lon })
    setWeather(null)
    setSeabed(null)
    setNormativa(null)
    fetch(`/api/normativa?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((d) => { if (d?.success) setNormativa(d) })
      .catch(() => {})
    fetch(`/api/fondo?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((d: Seabed & { success?: boolean }) => { if (d?.success) setSeabed(d) })
      .catch(() => {})
    fetch(`/api/condiciones?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((d: PointConditions & { success?: boolean }) => { if (d?.success) setWeather(d) })
      .catch(() => setWeather({ available: false }))
    pedirSonda(lat, lon)

    if (!loggedIn) return
    setDraft({ lat, lon })
    setName(''); setDepth(''); setErr(''); setZone(null)
    fetch(`/api/areas-protegidas?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setZone(d) })
      .catch(() => {})
  }

  /*
   * El efecto que crea el mapa se ejecuta una sola vez —está guardado con
   * `map.current`— así que se quedaría con la copia de `marcarPunto` del primer
   * render, y con ella el `loggedIn` de entonces. Meterla en las dependencias no
   * vale: la limpieza destruiría el mapa y volvería a crearlo en cada render.
   * Una referencia al día resuelve las dos cosas.
   */
  const marcarPuntoRef = useRef(marcarPunto)
  useEffect(() => { marcarPuntoRef.current = marcarPunto })

  /** Lleva la carta a unas coordenadas escritas a mano y las marca. */
  const irACoordenadas = (lat: number, lon: number) => {
    // Se deja de seguir al barco: acabas de decir adónde quieres mirar.
    siguiendo.current = false
    map.current?.flyTo({ center: [lon, lat], zoom: Math.max(map.current.getZoom(), 13), duration: 900 })
    marcarPunto(lat, lon)
  }

  const cargarRutas = useCallback(() => {
    if (!loggedIn) return
    fetch('/api/rutas')
      .then((r) => r.json())
      .then((d) => { if (d.success) setSavedTracks(d.tracks) })
      .catch(() => {})
  }, [loggedIn])

  useEffect(() => { cargarRutas() }, [cargarRutas])

  // `navigator.onLine` se consulta al crear el estado, pero también hay que
  // escuchar: la cobertura se va y vuelve sola durante toda una salida.
  useEffect(() => {
    const conectado = () => setSinRed(false)
    const desconectado = () => setSinRed(true)
    window.addEventListener('online', conectado)
    window.addEventListener('offline', desconectado)
    return () => {
      window.removeEventListener('online', conectado)
      window.removeEventListener('offline', desconectado)
    }
  }, [])

  // Las marcas se piden solo si hay sesión: son privadas por definición.
  const recargarMarcas = useCallback(() => {
    if (!loggedIn) return
    fetch('/api/waypoints')
      .then((r) => r.json())
      .then((d) => { if (d.success) setMarks(d.waypoints) })
      .catch(() => {})
  }, [loggedIn])

  useEffect(() => { recargarMarcas() }, [recargarMarcas])

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

    // Fuentes vacías: se rellenan al mover, con lo que entre en pantalla.
    sources.pois = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
    sources.ruta = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
    sources.mifondo = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
    layers.push(
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
      /*
       * Tus propias sondas. Lo somero en cálido y lo hondo en azul, que es el
       * convenio de cualquier carta: así una piedra que sube salta a la vista
       * entre lo que la rodea, que es justo para lo que sirve esta capa.
       */
      {
        id: 'mifondo', type: 'circle', source: 'mifondo',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 16, 9],
          'circle-color': ['interpolate', ['linear'], ['get', 'depthM'],
            0, '#b91c1c', 10, '#ea580c', 25, '#eab308', 50, '#22c55e', 100, '#0ea5e9', 300, '#1e3a8a'],
          'circle-opacity': 0.9,
          'circle-stroke-width': 0.5,
          'circle-stroke-color': '#ffffff',
        },
      },
      // La derrota va encima de todo: mientras se graba es lo que se mira. Dos
      // trazos, uno oscuro debajo, para que se lea sobre agua clara y oscura.
      { id: 'ruta-borde', type: 'line', source: 'ruta',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.9 } },
      { id: 'ruta', type: 'line', source: 'ruta',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#b45309', 'line-width': 3 } },
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
      showUserLocation: true,
    }), 'top-right')
    // A pantalla completa se le pasa el marco, no el div del mapa: si no, los
    // paneles y los botones se quedan fuera y solo se ve la carta pelada.
    if (shell.current) m.addControl(new FullscreenControl({ container: shell.current }), 'top-right')
    const loadMiFondo = () => {
      const src = m.getSource('mifondo') as { setData(d: unknown): void } | undefined
      if (!src || !loggedIn) return
      const b = m.getBounds()
      fetch(`/api/mi-fondo?w=${b.getWest()}&s=${b.getSouth()}&e=${b.getEast()}&n=${b.getNorth()}`)
        .then((r) => r.json())
        .then((d) => {
          if (!d.success) return
          src.setData(d.geojson)
          setMiFondo({ sondas: d.sondas, celdaM: d.celdaM })
        })
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
    m.on('load', () => { setReady(true); m.resize(); loadPois(); loadMiFondo() })

    // Si el contenedor cambia de tamaño (fuentes, rotación, barra del móvil)
    // el mapa no se entera solo.
    ro = new ResizeObserver(() => m.resize())
    ro.observe(holder.current)
    m.on('moveend', loadPois)
    m.on('moveend', loadMiFondo)
    // `dragstart` y no `movestart`: este último lo dispara también el recentrado
    // automático, que se apagaría a sí mismo en cuanto empezara.
    m.on('dragstart', () => { siguiendo.current = false })
    m.on('zoomstart', (e) => { if ((e as unknown as { originalEvent?: unknown }).originalEvent) siguiendo.current = false })

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
    m.on('click', 'mifondo', (e) => {
      const f = e.features?.[0]
      if (!f) return
      const p = f.properties as { depthM: number; samples: number; spreadM: number }
      new Popup({ offset: 10 }).setLngLat(e.lngLat).setHTML(
        `<strong>${String(p.depthM).replace('.', ',')} m</strong>`
        + `<div style="font-size:12px;color:#5b6469">tu sonda · ${p.samples} pasada${p.samples === 1 ? '' : 's'}`
        + (p.spreadM > 0 ? ` · ${String(p.spreadM).replace('.', ',')} m de diferencia entre ellas` : '') + '</div>',
      ).addTo(m)
    })
    m.on('mouseenter', 'pois', () => { m.getCanvas().style.cursor = 'pointer' })
    m.on('mouseleave', 'pois', () => { m.getCanvas().style.cursor = '' })

    m.on('click', (e) => {
      // Si el clic ha caído sobre un punto, manda su ficha, no la sonda.
      if (m.queryRenderedFeatures(e.point, { layers: ['pois'] }).length > 0) return
      const lat = Math.round(e.lngLat.lat * 1e6) / 1e6
      const lon = Math.round(e.lngLat.lng * 1e6) / 1e6

      marcarPuntoRef.current(lat, lon)
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
    if (!m || !ready) return
    const src = m.getSource('ruta') as { setData(d: unknown): void } | undefined
    if (!src) return
    const pts = rec.state.points
    src.setData(pts.length >= 2
      ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts.map((p) => [p.lon, p.lat]) } }
      : { type: 'FeatureCollection', features: [] })
  }, [rec.state.points, ready])

  /*
   * La chincheta del punto elegido.
   *
   * Sin ella, escribir unas coordenadas movía la carta y abría la ficha, pero no
   * señalaba nada: había que adivinar cuál de los accidentes del centro era el
   * punto. Se dibuja con el color de acento y un anillo claro para que se lea
   * sobre cualquier fondo, y se distinga de las marcas ya guardadas.
   */
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    puntoMarker.current?.remove()
    puntoMarker.current = null
    if (!clickedAt) return
    const el = document.createElement('div')
    el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#0a7d72;'
      + 'border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)'
    el.setAttribute('aria-label', 'Punto seleccionado')
    puntoMarker.current = new Marker({ element: el }).setLngLat([clickedAt.lon, clickedAt.lat]).addTo(m)
  }, [clickedAt, ready])

  // Grabando, la carta sigue al barco — hasta que el usuario decida mirar otra
  // cosa. Ver `siguiendo`.
  useEffect(() => {
    const m = map.current
    const ultimo = rec.state.points[rec.state.points.length - 1]
    if (!m || !ready || rec.state.status !== 'grabando' || !ultimo || !siguiendo.current) return
    m.easeTo({ center: [ultimo.lon, ultimo.lat], duration: 800 })
  }, [rec.state.points, rec.state.status, ready])

  useEffect(() => {
    const m = map.current
    if (!m || !ready || !m.getLayer('substrate')) return
    m.setLayoutProperty('substrate', 'visibility', substrate ? 'visible' : 'none')
  }, [substrate, ready])

  useEffect(() => {
    const m = map.current
    if (!m || !ready || !m.getLayer('mifondo')) return
    m.setLayoutProperty('mifondo', 'visibility', showMiFondo ? 'visible' : 'none')
  }, [showMiFondo, ready])

  useEffect(() => {
    const m = map.current
    if (!m || !ready || !m.getLayer('pois')) return
    m.setLayoutProperty('pois', 'visibility', showPois ? 'visible' : 'none')
  }, [showPois, ready])

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

  /**
   * Qué hay apagado por estar el mapa demasiado abierto, como una enumeración
   * en condiciones: "espacios protegidos, rampas, puertos y pecios". Unir dos
   * frases con "y" daba "espacios protegidos y rampas, puertos y pecios", que
   * se lee de pena.
   */
  const capasLejos = showPois && poisFar ? ['rampas', 'puertos', 'pecios'] : []
  const avisoLejos = capasLejos.length > 1
    ? `${capasLejos.slice(0, -1).join(', ')} y ${capasLejos[capasLejos.length - 1]}`
    : capasLejos[0] ?? ''

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
      {/* La columna se desplaza sola: con la entrada de coordenadas, la ficha del
          punto y el resto, el último panel se salía por debajo de la carta. */}
      <div className="absolute top-3 left-3 right-14 bottom-10 z-20 flex flex-col items-start gap-2 pointer-events-none overflow-y-auto overscroll-contain">
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
        <button type="button" onClick={() => setShowCoords((v) => !v)} aria-pressed={showCoords} className={toggle(showCoords)}>
          🧭 Ir a coordenadas
        </button>
        {provider.substrate && (
          <button type="button" onClick={() => setSubstrate((v) => !v)} aria-pressed={substrate} className={toggle(substrate)}>
            🪨 Tipo de fondo
          </button>
        )}
        {rec.state.status === 'parado' && !rec.state.recovered && rec.state.points.length === 0 && (
          <button type="button" onClick={() => { setTrackDone(null); siguiendo.current = true; rec.empezar() }}
            className="px-3 py-1.5 rounded-full text-[13px] font-semibold bg-red-700 text-paper hover:bg-red-800 transition-colors">
            ⏺ Grabar ruta
          </button>
        )}
        {loggedIn && (
          <button type="button" onClick={() => setShowMiFondo((v) => !v)} aria-pressed={showMiFondo} className={toggle(showMiFondo)}>
            📡 Mi fondo{miFondo && miFondo.sondas > 0 ? ` (${miFondo.sondas})` : ''}
          </button>
        )}
        <button type="button" onClick={() => setShowPois((v) => !v)} aria-pressed={showPois} className={toggle(showPois)}>
          ⚓ Rampas y puertos
        </button>
        {/* Un solo aviso, aunque falten las dos capas. Antes iban por separado
            y salían dos pastillas seguidas empezando las dos por "Acércate para
            ver…": se leían como el mismo mensaje repetido. */}
        {capasLejos.length > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-paper/90 text-[12px] text-ink/60 border border-ink/12">
            Acércate para ver {avisoLejos}
          </span>
        )}
      </div>

      {sinRed && (
        <div className="pointer-events-auto w-72 max-w-full bg-amber-500/[0.12] border border-amber-600/40 rounded-2xl px-4 py-2.5">
          <p className="text-[13px] font-semibold text-amber-900">Sin conexión</p>
          <p className="text-[12px] text-amber-900/90 mt-0.5">
            La carta y las sondas que ya habías mirado siguen aquí. El parte del mar puede ser
            de la última vez que tuviste cobertura.
          </p>
        </div>
      )}

      {sounder.state.soportado && (
        <details className="pointer-events-auto w-72 max-w-full bg-paper rounded-2xl shadow-hard border border-ink/[0.07]"
          open={sounder.state.conectado}>
          <summary className="px-4 py-2.5 text-[14px] font-semibold text-ink cursor-pointer select-none">
            📡 Sonda de a bordo {sounder.state.conectado && <span className="text-accent">· conectada</span>}
          </summary>
          <div className="px-4 pb-3 pt-1 space-y-2">
            {!sounder.state.conectado ? (
              <>
                <p className="text-[12px] text-ink/60">
                  Conecta la sonda por cable USB y la profundidad se guardará en tu derrota mientras navegas.
                </p>
                <label className="block text-[12px] text-ink/70">
                  Calado del transductor
                  <span className="block text-[11px] text-ink/50">
                    Cuánto baja el transductor bajo la flotación. Sin esto la sonda lleva un error fijo.
                  </span>
                  <input type="number" step="0.05" min="0" max="10" value={sounder.caladoM}
                    onChange={(e) => sounder.guardarCalado(Number(e.target.value))}
                    className="mt-1 w-24 border border-ink/12 rounded-lg px-2 py-1.5 text-[13px] focus:outline-none focus:border-accent" />
                  <span className="text-[12px] text-ink/60"> m</span>
                </label>
                <button type="button" onClick={sounder.conectar}
                  className="bg-accent text-paper px-4 py-2 text-[13px] font-semibold rounded-full">
                  Conectar sonda
                </button>
              </>
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
                  <div>
                    <dt className="text-ink/60 text-[11px]">Sonda</dt>
                    <dd className="font-display text-[22px] leading-none text-ink">
                      {sounder.state.depthM != null ? `${nf(sounder.state.depthM, 1)} m` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink/60 text-[11px]">Agua</dt>
                    <dd className="text-ink font-semibold">
                      {sounder.state.waterTempC != null ? `${nf(sounder.state.waterTempC, 1)} °C` : '—'}
                    </dd>
                  </div>
                </dl>
                {/* Las frases descartadas miden la salud del cable: si suben sin
                    parar, hay ruido o el conector está sulfatado. */}
                <p className="text-[11px] text-ink/50">
                  {sounder.state.frases.leidas} frases · {sounder.state.frases.descartadas} descartadas
                  {' · '}calado {nf(sounder.caladoM, 2)} m
                </p>
                <button type="button" onClick={sounder.desconectar}
                  className="px-3 py-1.5 text-[13px] text-ink/60 hover:text-ink">Desconectar</button>
              </>
            )}
            {sounder.state.error && <p className="text-[12.5px] text-red-700">{sounder.state.error}</p>}
          </div>
        </details>
      )}

      {showCoords && (
        <div className="pointer-events-auto w-72 max-w-full bg-paper rounded-2xl shadow-hard border border-ink/[0.07] px-4 py-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">Ir a coordenadas</p>
            <button type="button" onClick={() => setShowCoords(false)} aria-label="Cerrar la entrada de coordenadas"
              className="text-ink/40 hover:text-ink leading-none text-[15px]">×</button>
          </div>
          <CoordinateEntry onGo={irACoordenadas} />
        </div>
      )}

      {/* Grabación de la derrota. Va la primera de la columna porque mientras
          se graba es lo único que se mira, y con guantes o con el barco
          moviéndose los botones tienen que ser grandes. */}
      {(rec.state.status !== 'parado' || rec.state.recovered || rec.state.points.length > 0 || trackDone) && (
        <div className="pointer-events-auto w-64 max-w-full bg-paper rounded-2xl shadow-hard-lg border border-ink/[0.07] px-4 py-3">
          {rec.state.recovered ? (
            <>
              <p className="text-[13px] text-ink">Hay una ruta a medias sin cerrar.</p>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={rec.retomar}
                  className="bg-accent text-paper px-3 py-2 text-[13px] font-semibold rounded-full">Continuarla</button>
                <button type="button" onClick={rec.descartarRecuperada}
                  className="px-3 py-2 text-[13px] text-ink/60 hover:text-ink">Descartar</button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">
                  {rec.state.status === 'grabando' ? 'Grabando ruta' : rec.state.status === 'pausa' ? 'Ruta en pausa' : 'Ruta'}
                </p>
                {rec.state.status === 'grabando' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" aria-label="grabando" />
                )}
              </div>
              <p className="font-display text-[26px] leading-none text-ink mt-1">{formatDistance(rec.state.distanceM)}</p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px] mt-2">
                <div>
                  <dt className="text-ink/60 text-[11px]">Tiempo</dt>
                  <dd className="text-ink font-semibold">{formatDuration(rec.state.durationS)}</dd>
                </div>
                <div>
                  <dt className="text-ink/60 text-[11px]">Velocidad</dt>
                  <dd className="text-ink font-semibold">
                    {rec.state.knots != null ? `${rec.state.knots.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kn` : '—'}
                  </dd>
                </div>
              </dl>
              {/* Decir por qué NO avanza la ruta evita que parezca rota. */}
              {rec.state.status === 'grabando' && rec.state.waiting && (
                <p className="text-[12px] text-ink/60 mt-1.5">
                  {rec.state.waiting}
                  {rec.state.accuracyM != null && ` · ±${rec.state.accuracyM} m`}
                </p>
              )}
              {rec.state.error && <p className="text-[12.5px] text-red-700 mt-1.5">{rec.state.error}</p>}
              {trackDone && <p className="text-[12.5px] text-accent mt-1.5">{trackDone}</p>}

              <div className="flex flex-wrap gap-2 mt-2.5">
                {rec.state.status === 'grabando' && (
                  <button type="button" onClick={rec.pausar}
                    className="px-3 py-2 text-[13px] font-semibold rounded-full border border-ink/12 hover:border-accent">Pausa</button>
                )}
                {rec.state.status === 'pausa' && (
                  <button type="button" onClick={rec.continuar}
                    className="bg-accent text-paper px-3 py-2 text-[13px] font-semibold rounded-full">Continuar</button>
                )}
                {rec.state.points.length >= 2 && loggedIn && (
                  <button type="button" onClick={guardarRuta} disabled={savingTrack}
                    className="bg-accent text-paper px-3 py-2 text-[13px] font-semibold rounded-full disabled:opacity-60">
                    {savingTrack ? 'Guardando…' : 'Terminar y guardar'}
                  </button>
                )}
                {rec.state.points.length >= 2 && (
                  <button type="button" onClick={descargarGPX}
                    className="px-3 py-2 text-[13px] font-semibold rounded-full border border-ink/12 hover:border-accent">
                    Descargar GPX
                  </button>
                )}
                {rec.state.points.length >= 2 && !loggedIn && (
                  <p className="text-[12px] text-ink/60 w-full">
                    <a href="/entrar" className="font-semibold text-accent hover:underline">Inicia sesión</a> para
                    guardarla en tu cuenta. Es privada: solo la ves tú.
                  </p>
                )}
              </div>
              {rec.state.points.length >= 2 && rec.state.status !== 'parado' && (
                <input value={trackName} onChange={(e) => setTrackName(e.target.value)} maxLength={90}
                  placeholder="Nombre de la ruta (opcional)"
                  className="w-full mt-2 border border-ink/12 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent" />
              )}
            </>
          )}
        </div>
      )}

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
          <div className="mt-1"><SoundingReading s={sounding} onRetry={() => clickedAt && pedirSonda(clickedAt.lat, clickedAt.lon)} /></div>
          <div className="mt-2"><SeabedReading s={seabed} relief={sounding?.relief ?? null} /></div>
          <div className="mt-3 pt-3 border-t border-ink/[0.07]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60 mb-1.5">El mar aquí</p>
            <PointWeather c={weather} />
          </div>
          <p className="text-[11px] text-ink/60 mt-2.5">
            {formatNautical(clickedAt.lat, clickedAt.lon).lat} · {formatNautical(clickedAt.lat, clickedAt.lon).lon}
          </p>
          {(() => {
        /*
         * Qué pescar aquí. Se calcula EN EL NAVEGADOR con la sonda, el fondo y
         * el agua que ya se han pedido para este punto: pedir otra vez lo mismo
         * al servidor solo para cruzarlo sería una llamada de más.
         */
        const punto = {
          sondaM: sounding?.depthM ?? null,
          sustrato: seabed?.substrate ?? null,
          aguaC: weather?.ahora?.seaTempC ?? null,
          mes: new Date().getMonth() + 1,
        }
        const faltan = datosQueFaltan(punto)
        // Con un solo dato la lista sale larguísima y no informa de nada.
        if (faltan.length >= 3) return null
        const compatibles = especiesCompatibles(punto, 4)
        if (compatibles.length === 0) return null
        return (
          <details className="mt-2 pt-2 border-t border-ink/[0.07]">
            <summary className="text-[12px] font-semibold text-ink/70 cursor-pointer">
              Qué encaja aquí ({compatibles.length})
            </summary>
            <ul className="mt-1.5 space-y-1.5">
              {compatibles.map((c) => (
                <li key={c.speciesId}>
                  <p className="text-[13px] text-ink font-semibold">{c.emoji} {c.name}</p>
                  {/* Se enseña QUÉ ha encajado: quien lee juzga, en vez de
                      tragarse una puntuación que no puede comprobar. */}
                  <p className="text-[11.5px] text-ink/60">
                    {c.criterios.filter((x) => x.encaja).map((x) => x.detalle).join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
            {faltan.length > 0 && (
              <p className="text-[11px] text-ink/50 mt-1.5">Sin {faltan.join(' ni ')}: la lista sería más ajustada con esos datos.</p>
            )}
            <p className="text-[11.5px] text-amber-900 mt-1.5">
              Encajan con estas condiciones según su ficha. No significa que estén aquí.
            </p>
          </details>
        )
      })()}

      {normativa && (
            <details className="mt-2 pt-2 border-t border-ink/[0.07]">
              <summary className="text-[12px] font-semibold text-ink/70 cursor-pointer">
                Normativa aquí · {normativa.comunidad.region}
              </summary>
              <div className="mt-1.5 space-y-1">
                <p className="text-[12px] text-ink/70">{normativa.licencia}</p>
                {normativa.comunidad.enlace && (
                  <p className="text-[12px]">
                    <a href={normativa.comunidad.enlace} target="_blank" rel="noopener noreferrer"
                      className="font-semibold text-accent hover:underline">
                      {normativa.comunidad.organismo}
                    </a>
                  </p>
                )}
                <p className="text-[12px]">
                  <a href={normativa.tallasUrl} target="_blank" rel="noopener noreferrer"
                    className="font-semibold text-accent hover:underline">Tallas mínimas oficiales</a>
                </p>
                {/* El aviso no es letra pequeña: es lo que evita que alguien dé
                    por buena una talla que aquí no se publica. */}
                <p className="text-[11.5px] text-amber-900">{normativa.aviso}</p>
                <p className="text-[11px] text-ink/50">
                  Comunidad deducida por {normativa.comunidad.segun} · revisado {normativa.revisado}
                </p>
              </div>
            </details>
          )}
          {(seabed?.substrate || sounding?.relief.kind !== 'desconocido') && (
            <details className="mt-1.5">
              <summary className="text-[11px] text-ink/50 cursor-pointer">Hasta dónde llega este dato</summary>
              <p className="text-[11px] text-ink/60 mt-1">{SEABED_RESOLUTION} Para saber si hay una piedra concreta bajo la quilla, la ecosonda de a bordo.</p>
            </details>
          )}
        </div>
      )}

      {loggedIn && draft && (
        <div className="pointer-events-auto w-72 max-w-full bg-paper rounded-2xl shadow-hard-lg border border-ink/[0.07] p-4 space-y-2.5">
          <p className="font-semibold text-ink text-[15px]">Nueva marca</p>
          <p className="text-[12px] text-ink/60">
            {formatNautical(draft.lat, draft.lon).lat} · {formatNautical(draft.lat, draft.lon).lon}
          </p>
          <div className="rounded-xl bg-ink/[0.03] px-3 py-2 space-y-2">
            <SoundingReading s={sounding} onRetry={() => draft && pedirSonda(draft.lat, draft.lon)} />
            <SeabedReading s={seabed} relief={sounding?.relief ?? null} />
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

      {loggedIn && savedTracks.length > 0 && rec.state.status === 'parado' && !draft && (
        <details className="pointer-events-auto w-64 max-w-full bg-paper rounded-2xl shadow-hard border border-ink/[0.07]">
          <summary className="px-4 py-2.5 text-[14px] font-semibold text-ink cursor-pointer">
            🧭 Mis rutas ({savedTracks.length})
          </summary>
          <ul className="max-h-72 overflow-y-auto px-2 pb-2 space-y-0.5">
            {savedTracks.map((t) => (
              <li key={t.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-ink/[0.04]">
                <button onClick={() => verRuta(t.id)} className="flex-1 text-left min-w-0">
                  <span className="block text-[13.5px] text-ink/85 truncate">{t.name}</span>
                  <span className="block text-[11.5px] text-ink/60">
                    {formatDistance(t.distanceM)} · {formatDuration(t.durationS)} · {new Date(t.startedAt).toLocaleDateString('es-ES')}
                  </span>
                </button>
                <a href={`/api/rutas/${t.id}/gpx`} download aria-label={`Descargar ${t.name} en GPX`}
                  className="text-[11px] font-semibold text-accent hover:underline shrink-0">GPX</a>
                <button onClick={() => borrarRuta(t.id, t.name)} aria-label={`Borrar ${t.name}`}
                  className="text-[12px] text-ink/40 hover:text-red-700 shrink-0">✕</button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {loggedIn && marks.length > 0 && !draft && (
        <details className="pointer-events-auto w-72 max-w-full bg-paper rounded-2xl shadow-hard border border-ink/[0.07]">
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
          <div className="px-4 pb-3 pt-1 border-t border-ink/[0.07]">
            <MarksTransfer onImported={recargarMarcas} />
          </div>
        </details>
      )}

      {/* Sin marcas todavía no hay listado donde meterlo, y es justo cuando más
          falta hace: la primera vez lo que quieres es traerte las de la sonda. */}
      {loggedIn && marks.length === 0 && !draft && rec.state.status === 'parado' && (
        <details className="pointer-events-auto w-72 max-w-full bg-paper rounded-2xl shadow-hard border border-ink/[0.07]">
          <summary className="px-4 py-2.5 text-[14px] font-semibold text-ink cursor-pointer">
            📥 Traer mis marcas de la sonda
          </summary>
          <div className="px-4 pb-3 pt-1">
            <MarksTransfer onImported={recargarMarcas} />
          </div>
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
