/**
 * Nautical chart providers, behind one interface.
 *
 * This abstraction is the project's insurance policy, and it is a requirement,
 * not a convenience: no other file may know a provider's name or build a tile
 * URL by hand. Swapping the chart source has to be a config change.
 *
 * LICENSING — read before adding a provider:
 * The active provider must allow COMMERCIAL use, because PescaPlus has an
 * affiliate shop and charges a commission on charter bookings. That rules out
 * the Instituto Hidrográfico de la Marina's geoportal, whose terms forbid
 * commercial use of its information and services. If a commercial licence with
 * the IHM is ever signed, add its adapter here and flip CHART_PROVIDER — that
 * is the whole migration.
 *
 * Attribution is part of the licence, so it travels with the provider and the
 * UI renders it always. A provider without attribution text is a bug.
 */
export interface ChartLayer {
  id: string
  /**
   * Raster tile URL template. Normalmente `{z}/{x}/{y}`; un servicio WMS usa
   * `{bbox-epsg-3857}`, que MapLibre sustituye igual de bien.
   */
  tiles: string[]
  minZoom: number
  maxZoom: number
  tileSize: number
  /** Attribution required by the licence — rendered, never optional. */
  attribution: string
}

export interface ChartProvider {
  id: string
  label: string
  /** Land/base map under the nautical layer. */
  base: ChartLayer
  /** Seamarks, buoys, beacons, harbours. */
  seamarks: ChartLayer | null
  /** Depth / bathymetry, when the provider offers it. */
  bathymetry: ChartLayer | null
  /** Isóbatas: las curvas de nivel del fondo, rotuladas en metros. */
  contours: ChartLayer | null
  /** False means it may not be used while the site earns money. */
  allowsCommercialUse: boolean
  /** Shown in the legal notice under the chart. */
  sourceNote: string
}

const OSM_BASE: ChartLayer = {
  id: 'osm',
  tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  minZoom: 0,
  maxZoom: 19,
  tileSize: 256,
  attribution: '© OpenStreetMap',
}

/**
 * OpenSeaMap — seamark rendering on top of OSM data, ODbL. Commercial use is
 * allowed with attribution and share-alike on derived data.
 */
const OPENSEAMAP: ChartProvider = {
  id: 'openseamap',
  label: 'OpenSeaMap',
  base: OSM_BASE,
  seamarks: {
    id: 'seamarks',
    tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
    minZoom: 9,
    maxZoom: 18,
    tileSize: 256,
    attribution: '© OpenSeaMap (ODbL)',
  },
  /**
   * EMODnet Bathymetry — European bathymetry, open data, commercial use
   * permitted with attribution. This is what replaces the official soundings
   * an IHM chart would give us.
   */
  bathymetry: {
    id: 'emodnet',
    tiles: ['https://tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator/{z}/{x}/{y}.png'],
    minZoom: 0,
    maxZoom: 12,
    tileSize: 256,
    attribution: '© EMODnet Bathymetry',
  },
  /**
   * Isóbatas de EMODnet por WMS. Van aparte de la batimetría en color porque
   * responden a preguntas distintas: el color dice "aquí baja", la curva dice
   * "aquí hay 50 m". Se dibujan en blanco con halo oscuro, así que solo se leen
   * sobre la carta, nunca sobre fondo claro.
   */
  contours: {
    id: 'emodnet-contours',
    tiles: [
      'https://ows.emodnet-bathymetry.eu/wms?service=WMS&version=1.3.0&request=GetMap' +
      '&layers=emodnet%3Acontours&styles=&format=image%2Fpng&transparent=true' +
      '&crs=EPSG%3A3857&width=256&height=256&bbox={bbox-epsg-3857}',
    ],
    minZoom: 6,
    maxZoom: 18,
    tileSize: 256,
    attribution: '© EMODnet Bathymetry',
  },
  allowsCommercialUse: true,
  sourceNote: 'Cartografía de OpenSeaMap y OpenStreetMap (ODbL) con batimetría de EMODnet.',
}

const PROVIDERS: Record<string, ChartProvider> = {
  [OPENSEAMAP.id]: OPENSEAMAP,
}

/**
 * The active provider. Falls back to OpenSeaMap rather than failing: a chart
 * that renders with the wrong-but-legal source beats a blank page.
 */
export function getChartProvider(): ChartProvider {
  const id = (process.env.NEXT_PUBLIC_CHART_PROVIDER ?? '').trim() || OPENSEAMAP.id
  const provider = PROVIDERS[id]
  if (!provider) {
    console.warn(`Proveedor de carta desconocido: "${id}". Se usa ${OPENSEAMAP.id}.`)
    return OPENSEAMAP
  }
  return provider
}

/** Every attribution the visible layers demand, deduplicated. */
export function attributionFor(p: ChartProvider): string {
  return [p.base, p.seamarks, p.bathymetry, p.contours]
    .filter((l): l is ChartLayer => !!l)
    .map((l) => l.attribution)
    .filter((a, i, arr) => arr.indexOf(a) === i)
    .join(' · ')
}

/**
 * The chart is a fishing aid, never a navigation instrument. This text is shown
 * on every chart view and accepted once per account; it is not decorative.
 */
export const NOT_FOR_NAVIGATION =
  'Esta carta es una ayuda para la pesca. NO es válida para la navegación y no sustituye a las cartas náuticas oficiales corregidas.'
