import type { WaypointInput } from '@/lib/waypoint-types'

/**
 * Entrada y salida de marcas entre PescaPlus y los aparatos de a bordo.
 *
 * QUÉ FORMATOS Y POR QUÉ. GPX es el idioma común: lo leen y lo escriben Garmin
 * (GPSMAP, echoMAP), Lowrance HDS y Elite, Simrad, B&G, Humminbird HELIX y
 * SOLIX, Raymarine con LightHouse 3 o más, Furuno TZtouch, Navionics Boating,
 * C-MAP y OpenCPN. Cubre prácticamente todo lo vendido en la última década.
 *
 * CSV se añade porque los aparatos viejos y los programas de PC (SeaClear,
 * Fugawi, hojas de cálculo) lo siguen usando, y porque a mucha gente le resulta
 * más fácil revisar sus marcas en Excel que en un XML.
 *
 * KML se añade para Google Earth, que es donde media flota enseña sus caladeros.
 *
 * QUÉ NO SE PROMETE. Los formatos binarios propietarios —`.usr` de
 * Lowrance/Simrad, `.fsh` de Raymarine/Navionics, `.gdb` de Garmin, `.hwr` de
 * Humminbird— NO se leen. Son formatos sin especificación pública fiable, y
 * escribir un lector a ciegas para coordenadas de pesca es la clase de cosa que
 * falla en silencio y deja a alguien buscando un bajo donde no está. Todos esos
 * aparatos exportan GPX; esa es la vía.
 *
 * TODO LO IMPORTADO ENTRA COMO PRIVADO. Un fichero traído de otro aparato no
 * dice nada sobre la intención de su dueño de publicar nada.
 */
export type MarkFormat = 'gpx' | 'csv' | 'kml'

export interface ParseResult {
  waypoints: WaypointInput[]
  format: MarkFormat | null
  /** Lo que se ha ignorado y por qué. Se enseña: importar a ciegas asusta. */
  warnings: string[]
}

const KNOWN_TYPES = new Set(['caladero', 'bajo', 'naufragio', 'boya', 'rampa', 'peligro', 'otro'])

/**
 * Los símbolos que ponen los plotters, traducidos a nuestros tipos.
 *
 * Cada marca usa los suyos y no hay norma. Lo que no se reconoce cae en 'otro',
 * que es honesto: es mejor una marca sin clasificar que una clasificada mal.
 */
const SIMBOLOS: Record<string, string> = {
  // Garmin
  'shipwreck': 'naufragio', 'wreck': 'naufragio', 'anchor': 'boya', 'buoy': 'boya',
  'boat ramp': 'rampa', 'fishing area': 'caladero', 'fish': 'caladero',
  'danger area': 'peligro', 'shallow water': 'bajo', 'reef': 'bajo', 'rock': 'bajo',
  // Lowrance / Simrad / B&G
  'wpt_wreck': 'naufragio', 'wpt_fish': 'caladero', 'wpt_danger': 'peligro',
  // Humminbird / Raymarine
  'fishing spot': 'caladero', 'rocks': 'bajo', 'diver down': 'peligro',
}

function tipoDe(raw: string): string {
  const t = raw.trim().toLowerCase()
  if (KNOWN_TYPES.has(t)) return t
  return SIMBOLOS[t] ?? 'otro'
}

/* ------------------------------------------------------------------ GPX --- */

function limpiarTexto(v: string): string {
  return v
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
}

function etiqueta(fragmento: string, nombre: string): string {
  const m = fragmento.match(new RegExp(`<(?:\\w+:)?${nombre}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${nombre}>`, 'i'))
  return m ? limpiarTexto(m[1]) : ''
}

function atributo(attrs: string, nombre: string): string | null {
  // Comillas dobles o simples: los dos son XML válido y los dos aparecen.
  const m = attrs.match(new RegExp(`\\b${nombre}\\s*=\\s*["']([^"']+)["']`, 'i'))
  return m ? m[1] : null
}

/**
 * Lee `<wpt>` y también `<rtept>`.
 *
 * Lo segundo importa más de lo que parece: bastantes plotters exportan las
 * marcas dentro de una ruta, y un lector que solo mire `<wpt>` le dice al
 * usuario "no se han encontrado marcas" ante un fichero lleno de ellas.
 */
export function parseGPX(xml: string, max = 5000): ParseResult {
  const out: WaypointInput[] = []
  const warnings: string[] = []
  let descartados = 0
  const vistos = new Set<string>()

  // Con cuerpo o auto-cerrada: `<wpt lat=".." lon=".."/>` es GPX válido.
  const re = /<(?:\w+:)?(wpt|rtept)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?\1>)/gi
  let m: RegExpExecArray | null

  while ((m = re.exec(xml)) && out.length < max) {
    const attrs = m[2] ?? ''
    const body = m[3] ?? ''
    const lat = Number(atributo(attrs, 'lat'))
    const lon = Number(atributo(attrs, 'lon'))
    if (!Number.isFinite(lat) || !Number.isFinite(lon)
      || Math.abs(lat) > 90 || Math.abs(lon) > 180) { descartados += 1; continue }

    // Un mismo punto puede venir como <wpt> y repetido dentro de una <rte>.
    const clave = `${lat.toFixed(6)},${lon.toFixed(6)}`
    if (vistos.has(clave)) continue
    vistos.add(clave)

    // La elevación en un GPX marino suele venir negativa: es la sonda.
    const ele = Number(etiqueta(body, 'ele'))
    const depth = Number.isFinite(ele) && ele < 0 ? Math.abs(ele) : null
    // `sym` es lo que pone el plotter; `type` lo que ponemos nosotros al exportar.
    const tipo = tipoDe(etiqueta(body, 'type') || etiqueta(body, 'sym'))

    out.push({
      name: etiqueta(body, 'name') || 'Marca importada',
      type: tipo,
      lat, lon,
      depthM: depth,
      // `cmt` es el comentario del aparato; muchos plotters no escriben `desc`.
      notes: etiqueta(body, 'desc') || etiqueta(body, 'cmt'),
      visibility: 'private',
    })
  }
  if (descartados > 0) warnings.push(`${descartados} puntos con coordenadas no válidas, descartados.`)
  return { waypoints: out, format: 'gpx', warnings }
}

/* ------------------------------------------------------------------ CSV --- */

/**
 * Coordenada suelta a grados decimales.
 *
 * Acepta lo que sale de verdad de los aparatos y de las hojas de cálculo:
 * `36.0128`, `36,0128` (coma decimal española), `36° 00.768' N`, `36 00 46 N`,
 * `N36 00.768`. Lo que no se entiende devuelve NaN, y el punto se descarta con
 * su aviso; no se adivina.
 */
export function parseCoord(raw: string): number {
  const s = raw.trim().replace(/["']?\s*$/, '')
  if (!s) return NaN

  const hemisferio = /[NSEWO]/i.exec(s)?.[0]?.toUpperCase()
  // "O" de Oeste en español es negativa, igual que "W".
  const signo = hemisferio === 'S' || hemisferio === 'W' || hemisferio === 'O' ? -1 : 1
  // Fuera letras; la coma decimal pasa a punto solo si no separa campos.
  const limpio = s.replace(/[NSEWO]/gi, ' ').trim()

  const numeros = limpio
    .replace(/[°º]/g, ' ').replace(/['′]/g, ' ').replace(/["″]/g, ' ')
    .replace(/(\d),(\d)/g, '$1.$2')
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)

  if (numeros.some((n) => !Number.isFinite(n)) || numeros.length === 0) return NaN
  const [g, min = 0, seg = 0] = numeros
  const magnitud = Math.abs(g) + min / 60 + seg / 3600
  // Un grado negativo ya lleva el signo; no se aplica dos veces.
  return (g < 0 ? -1 : signo) * magnitud
}

/**
 * De grados decimales a la notación de a bordo: 36° 00.768' N.
 *
 * Grados y minutos decimales es lo que enseñan los plotters y lo que viene
 * impreso en las cartas náuticas. La longitud se escribe con tres dígitos por
 * convenio marino (005° y no 5°), que evita confundirla con la latitud cuando
 * alguien dicta unas coordenadas por radio.
 */
export function formatNautical(lat: number, lon: number): { lat: string; lon: string } {
  const parte = (valor: number, positivo: string, negativo: string, digitos: number) => {
    const hemisferio = valor >= 0 ? positivo : negativo
    const abs = Math.abs(valor)
    let grados = Math.floor(abs)
    let minutos = (abs - grados) * 60
    // 59,9999' redondea a 60,000': hay que subir el grado en vez de escribirlo.
    if (Number(minutos.toFixed(3)) >= 60) { grados += 1; minutos = 0 }
    const min = minutos.toFixed(3).replace('.', ',').padStart(6, '0')
    return `${String(grados).padStart(digitos, '0')}° ${min}' ${hemisferio}`
  }
  return { lat: parte(lat, 'N', 'S', 2), lon: parte(lon, 'E', 'O', 3) }
}

const CABECERAS: Record<string, string[]> = {
  name: ['name', 'nombre', 'waypoint', 'wpt', 'descripcion corta', 'titulo', 'title', 'marca'],
  lat: ['lat', 'latitude', 'latitud', 'y'],
  lon: ['lon', 'long', 'lng', 'longitude', 'longitud', 'x'],
  depth: ['depth', 'sonda', 'profundidad', 'prof', 'ele', 'elevation', 'altitud'],
  notes: ['notes', 'notas', 'desc', 'description', 'descripcion', 'comment', 'comentario', 'cmt'],
  type: ['type', 'tipo', 'sym', 'symbol', 'simbolo', 'icon'],
}

function normaliza(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^"|"$/g, '')
}

/**
 * Parte una línea de CSV respetando las comillas.
 *
 * Las comillas solo cuentan al PRINCIPIO del campo, que es lo que dice el RFC y
 * lo que escriben las hojas de cálculo. Tratarlas en cualquier posición, y
 * rematar quitando las de los extremos, se comía la comilla final de un nombre
 * como `Naufragio "el grande"` — lo cazó la prueba de ida y vuelta.
 */
function partir(linea: string, sep: string): string[] {
  const out: string[] = []
  let i = 0
  for (;;) {
    while (linea[i] === ' ') i += 1
    let valor = ''
    if (linea[i] === '"') {
      i += 1
      while (i < linea.length) {
        if (linea[i] === '"') {
          // Dos comillas seguidas dentro del campo son una comilla literal.
          if (linea[i + 1] === '"') { valor += '"'; i += 2 } else { i += 1; break }
        } else { valor += linea[i]; i += 1 }
      }
      while (i < linea.length && linea[i] !== sep) i += 1
    } else {
      while (i < linea.length && linea[i] !== sep) { valor += linea[i]; i += 1 }
      valor = valor.trim()
    }
    out.push(valor)
    if (i >= linea.length) break
    i += 1
  }
  return out
}

/**
 * Lee un CSV de marcas.
 *
 * El separador se detecta en vez de imponerse: el Excel español escribe con
 * punto y coma, y exigir coma dejaría fuera a media flota.
 */
export function parseCSV(texto: string, max = 5000): ParseResult {
  const warnings: string[] = []
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim())
  if (lineas.length < 2) return { waypoints: [], format: 'csv', warnings: ['El archivo no tiene filas.'] }

  const cabecera = lineas[0]
  const sep = [';', ',', '\t'].reduce((mejor, s) =>
    partir(cabecera, s).length > partir(cabecera, mejor).length ? s : mejor, ',')

  const cols = partir(cabecera, sep).map(normaliza)
  const idx: Record<string, number> = {}
  for (const [campo, alias] of Object.entries(CABECERAS)) {
    idx[campo] = cols.findIndex((c) => alias.includes(c))
  }
  if (idx.lat < 0 || idx.lon < 0) {
    return {
      waypoints: [], format: 'csv',
      warnings: ['No se encuentran las columnas de latitud y longitud. Deben llamarse lat/latitud y lon/longitud.'],
    }
  }

  const out: WaypointInput[] = []
  let descartados = 0
  for (const linea of lineas.slice(1)) {
    if (out.length >= max) break
    const campos = partir(linea, sep)
    const lat = parseCoord(campos[idx.lat] ?? '')
    const lon = parseCoord(campos[idx.lon] ?? '')
    if (!Number.isFinite(lat) || !Number.isFinite(lon)
      || Math.abs(lat) > 90 || Math.abs(lon) > 180) { descartados += 1; continue }

    const sonda = idx.depth >= 0 ? Number((campos[idx.depth] ?? '').replace(',', '.')) : NaN
    out.push({
      name: (idx.name >= 0 ? campos[idx.name] : '') || 'Marca importada',
      type: tipoDe(idx.type >= 0 ? (campos[idx.type] ?? '') : ''),
      lat, lon,
      // Se acepta la sonda tanto positiva como negativa: cada aparato usa un
      // convenio y los dos significan lo mismo bajo el agua.
      depthM: Number.isFinite(sonda) && sonda !== 0 ? Math.abs(sonda) : null,
      notes: idx.notes >= 0 ? (campos[idx.notes] ?? '') : '',
      visibility: 'private',
    })
  }
  if (descartados > 0) warnings.push(`${descartados} filas sin coordenadas utilizables, descartadas.`)
  return { waypoints: out, format: 'csv', warnings }
}

/* ------------------------------------------------------------------ KML --- */

/** Lee los `<Placemark>` con punto de un KML (Google Earth, Navionics). */
export function parseKML(xml: string, max = 5000): ParseResult {
  const out: WaypointInput[] = []
  const warnings: string[] = []
  let descartados = 0

  const re = /<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) && out.length < max) {
    const body = m[1]
    const coords = etiqueta(body, 'coordinates')
    if (!coords) continue
    // KML va lon,lat[,alt] — al revés que casi todo lo demás.
    const [lon, lat, alt] = coords.split(/\s+/)[0].split(',').map(Number)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)
      || Math.abs(lat) > 90 || Math.abs(lon) > 180) { descartados += 1; continue }
    out.push({
      name: etiqueta(body, 'name') || 'Marca importada',
      type: 'otro',
      lat, lon,
      depthM: Number.isFinite(alt) && alt < 0 ? Math.abs(alt) : null,
      notes: etiqueta(body, 'description'),
      visibility: 'private',
    })
  }
  if (descartados > 0) warnings.push(`${descartados} marcas sin coordenadas utilizables, descartadas.`)
  return { waypoints: out, format: 'kml', warnings }
}

/* ------------------------------------------------------- reconocimiento --- */

/**
 * Qué formato es. Se mira el CONTENIDO y no solo la extensión: la gente renombra
 * ficheros, y los aparatos exportan `.txt` que por dentro son CSV.
 */
export function detectFormat(texto: string, nombreArchivo = ''): MarkFormat | null {
  // El BOM de UTF-8 que mete Excel rompe cualquier comparación al principio.
  const t = texto.replace(/^﻿/, '').trimStart().slice(0, 4000).toLowerCase()
  if (t.includes('<gpx') || t.includes('<wpt') || t.includes('<rtept')) return 'gpx'
  if (t.includes('<kml') || t.includes('<placemark')) return 'kml'
  const ext = nombreArchivo.toLowerCase().split('.').pop() ?? ''
  if (['csv', 'txt', 'tsv'].includes(ext)) return 'csv'
  // Sin etiquetas XML pero con separadores y algo que parece una coordenada.
  if (!t.startsWith('<') && /[;,\t]/.test(t) && /\d{1,3}[.,]\d/.test(t)) return 'csv'
  return null
}

/** Lee un fichero de marcas venga en el formato que venga. */
export function parseMarks(texto: string, nombreArchivo = ''): ParseResult {
  const limpio = texto.replace(/^﻿/, '')
  const formato = detectFormat(limpio, nombreArchivo)
  if (formato === 'gpx') return parseGPX(limpio)
  if (formato === 'kml') return parseKML(limpio)
  if (formato === 'csv') return parseCSV(limpio)
  return {
    waypoints: [], format: null,
    warnings: ['No se reconoce el formato. Exporta desde tu sonda o GPS en GPX, o usa un CSV con columnas de latitud y longitud.'],
  }
}

/* -------------------------------------------------------------- salidas --- */

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface ExportMark {
  name: string
  type: string
  lat: number
  lon: number
  depthM: number | null
  notes: string
}

/**
 * CSV de marcas.
 *
 * Se escribe con punto y coma y coma decimal porque el destinatario habitual es
 * un Excel en español, que con comas y puntos mete todo en una columna y deja al
 * usuario peleándose con el asistente de importación.
 */
export function toCSV(marks: ExportMark[]): string {
  const num = (n: number, dec: number) => n.toFixed(dec).replace('.', ',')
  const campo = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const filas = marks.map((w) => [
    campo(w.name), num(w.lat, 6), num(w.lon, 6),
    w.depthM != null ? num(w.depthM, 1) : '',
    campo(w.type), campo(w.notes ?? ''),
  ].join(';'))
  // Con BOM: sin él, Excel abre las tildes como caracteres raros.
  return '﻿' + ['Nombre;Latitud;Longitud;Sonda;Tipo;Notas', ...filas].join('\r\n')
}

/** KML para Google Earth. La sonda va como altitud negativa, como en GPX. */
export function toKML(marks: ExportMark[], nombre = 'Marcas de PescaPlus'): string {
  const sitios = marks.map((w) => `    <Placemark>
      <name>${esc(w.name)}</name>
${w.notes ? `      <description>${esc(w.notes)}</description>\n` : ''}      <Point><coordinates>${w.lon},${w.lat}${w.depthM != null ? `,${-Math.abs(w.depthM)}` : ''}</coordinates></Point>
    </Placemark>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(nombre)}</name>
${sitios}
  </Document>
</kml>`
}

/**
 * Qué aparatos leen cada cosa. Se enseña en la interfaz, porque "exporta en
 * GPX" no le dice nada a quien tiene una sonda delante y ocho menús.
 */
export const COMPATIBILIDAD: { formato: string; aparatos: string; nota?: string }[] = [
  { formato: 'GPX', aparatos: 'Garmin (GPSMAP, echoMAP), Lowrance HDS y Elite, Simrad, B&G, Humminbird HELIX y SOLIX, Raymarine (LightHouse 3+), Furuno TZtouch, Navionics, C-MAP, OpenCPN' },
  { formato: 'CSV', aparatos: 'Hojas de cálculo, programas de PC antiguos y aparatos que solo aceptan texto', nota: 'Con punto y coma y coma decimal, listo para Excel en español' },
  { formato: 'KML', aparatos: 'Google Earth y aplicaciones que lo admiten' },
]

/**
 * Formatos que NO se leen, y por qué. Esto se enseña tal cual: es preferible que
 * alguien sepa que tiene que exportar en GPX desde su aparato a que suba un
 * fichero y no entienda por qué no pasa nada.
 */
export const NO_SOPORTADOS: { ext: string; marca: string }[] = [
  { ext: '.usr', marca: 'Lowrance, Simrad y B&G' },
  { ext: '.fsh', marca: 'Raymarine y archivos de Navionics' },
  { ext: '.gdb', marca: 'Garmin (BaseCamp)' },
  { ext: '.hwr', marca: 'Humminbird (modelos antiguos)' },
]
