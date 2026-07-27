/**
 * Trae de OpenStreetMap las rampas de varada, los puertos y los pecios del
 * litoral español, y los guarda.
 *
 *   node scripts/create-nautical-pois-table.mjs   (una vez)
 *   node scripts/import-nautical-pois.mjs
 *
 * POR QUÉ SE PREIMPORTA. Overpass es un servicio público y se satura: durante
 * el desarrollo de esto estuvo devolviendo "server too busy" a intervalos
 * durante horas. Una carta que necesita que un tercero conteste cada vez que
 * mueves el mapa no es una carta, es una apuesta.
 *
 * POR QUÉ SE TROCEA. Una sola consulta a todo el litoral se corta a media
 * respuesta: Overpass empieza a mandar JSON válido y deja de hablar. Se pide
 * por cuadrículas, se guarda cada una nada más llegar y se puede reanudar. Es
 * la misma lección que dejó la importación de Natura 2000.
 *
 * Los datos son de OpenStreetMap, ODbL: hay que citarlos, y se citan.
 */
import 'dotenv/config'
import pg from 'pg'
import { pgConfig } from './pg-config.mjs'
import { randomUUID } from 'node:crypto'
import { setDefaultResultOrder } from 'node:dns'

/*
 * Igual que en instrumentation-node.ts, y por lo mismo: overpass-api.de publica
 * AAAA además de A, y donde no hay ruta IPv6 viva el primer intento muere con
 * `TypeError: fetch failed`. Aquí se notaba como cuadrículas "sin respuesta"
 * salteadas, que es un agujero silencioso en los datos: lo peor que puede pasar
 * en una importación.
 */
setDefaultResultOrder('ipv4first')

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL no definida.'); process.exit(1) }

const ENDPOINT = 'https://overpass-api.de/api/interpreter'
const UA = 'PescaPlus/1.0 (+https://pescaplus.es)'
/** Litoral español con Canarias: [sur, oeste, norte, este]. */
const AMBITO = [26.5, -19.5, 44.5, 5.0]
/** Grados por cuadrícula. Más grande = menos consultas pero más cortes. */
const PASO = 4
/**
 * Overpass pide cortesía entre consultas, y no es opcional: con 2,5 s se agota
 * la cuota a mitad de recorrido y empiezan a caer cuadrículas enteras. Con 6 s
 * aguanta el recorrido completo.
 */
const PAUSA_MS = 6000

const CATEGORIAS = [
  { kind: 'rampa', consulta: (bb) => `nwr["leisure"="slipway"](${bb});` },
  { kind: 'puerto', consulta: (bb) => `nwr["seamark:type"="harbour"](${bb});nwr["leisure"="marina"](${bb});` },
  { kind: 'pecio', consulta: (bb) => `nwr["seamark:type"="wreck"](${bb});` },
]

/** Los tags que la ficha sabe contar. El resto no se guarda: sería ruido. */
const TAGS_UTILES = [
  'name', 'operator', 'access', 'fee', 'surface', 'material',
  'seamark:wreck:category', 'seamark:wreck:depth', 'depth',
  'maxdraft', 'seamark:harbour:category', 'website', 'phone',
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function overpass(cuerpo, intentos = 3) {
  for (let i = 0; i < intentos; i++) {
    if (i > 0) await sleep(15000 * i)   // la cuota agotada tarda en soltarse
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: new URLSearchParams({ data: `[out:json][timeout:180];(${cuerpo});out center tags;` }),
        signal: AbortSignal.timeout(200_000),
      })
      if (!res.ok) continue
      const texto = await res.text()
      // Overpass avisa de sus errores en HTML con un 200 delante.
      if (!texto.trimStart().startsWith('{')) continue
      return JSON.parse(texto)
    } catch (error) {
      if (i === intentos - 1) console.warn('  Overpass falló:', String(error).slice(0, 90))
    }
  }
  return null
}

/** Un elemento de OSM a fila. `center` existe en ways y relations. */
function aFila(el, kind, fecha) {
  const lat = el.lat ?? el.center?.lat
  const lon = el.lon ?? el.center?.lon
  if (typeof lat !== 'number' || typeof lon !== 'number') return null
  const tags = el.tags ?? {}
  const details = {}
  for (const t of TAGS_UTILES) if (tags[t] != null && t !== 'name') details[t] = String(tags[t]).slice(0, 120)
  return {
    id: randomUUID(),
    osmType: el.type,
    osmId: String(el.id),
    kind,
    name: String(tags.name ?? '').slice(0, 120),
    lat, lon,
    details: Object.keys(details).length > 0 ? details : null,
    sourceDate: fecha,
  }
}

const client = new pg.Client(pgConfig())
await client.connect()

const fecha = new Date().toISOString().slice(0, 10)
/** Las que no contestaron. Se repescan al final en vez de darlas por vacías. */
const fallidas = []

async function guardar(filas) {
  let n = 0
  for (const f of filas) {
    try {
      const res = await client.query(
        `INSERT INTO "NauticalPoi" ("id","osmType","osmId","kind","name","lat","lon","details","sourceName","sourceDate")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'OpenStreetMap',$9)
         ON CONFLICT ("osmType","osmId") DO UPDATE
           SET "kind"=EXCLUDED."kind", "name"=EXCLUDED."name", "lat"=EXCLUDED."lat",
               "lon"=EXCLUDED."lon", "details"=EXCLUDED."details", "sourceDate"=EXCLUDED."sourceDate"`,
        [f.id, f.osmType, f.osmId, f.kind, f.name, f.lat, f.lon, f.details, f.sourceDate],
      )
      n += res.rowCount ?? 0
    } catch (error) {
      console.warn(`  ${f.osmType}/${f.osmId} no se pudo guardar:`, String(error).slice(0, 80))
    }
  }
  return n
}
const [s0, w0, n0, e0] = AMBITO
let total = 0
let guardadas = 0

for (const { kind, consulta } of CATEGORIAS) {
  console.log(`\n== ${kind} ==`)
  for (let lat = s0; lat < n0; lat += PASO) {
    for (let lon = w0; lon < e0; lon += PASO) {
      const bb = `${lat},${lon},${Math.min(lat + PASO, n0)},${Math.min(lon + PASO, e0)}`
      const data = await overpass(consulta(bb))
      await sleep(PAUSA_MS)
      if (!data) {
        // Una cuadrícula sin respuesta NO es una cuadrícula vacía. Confundirlas
        // deja huecos silenciosos en el mapa, que es el peor resultado posible.
        console.log(`  ${bb}: sin respuesta — al repesque`)
        fallidas.push({ kind, consulta, bb })
        continue
      }
      const filas = (data.elements ?? []).map((el) => aFila(el, kind, fecha)).filter(Boolean)
      if (filas.length === 0) continue
      total += filas.length
      guardadas += await guardar(filas)
      console.log(`  ${bb}: ${filas.length}`)
    }
  }
}

// Repesque: lo que no contestó a la primera suele contestar con calma.
if (fallidas.length > 0) {
  console.log(`\n== repesque de ${fallidas.length} cuadrículas ==`)
  const sinSuerte = []
  for (const { kind, consulta, bb } of fallidas) {
    await sleep(PAUSA_MS * 2)
    const data = await overpass(consulta(bb))
    if (!data) { console.log(`  ${kind} ${bb}: sigue sin responder`); sinSuerte.push(`${kind} ${bb}`); continue }
    const filas = (data.elements ?? []).map((el) => aFila(el, kind, fecha)).filter(Boolean)
    total += filas.length
    guardadas += await guardar(filas)
    console.log(`  ${kind} ${bb}: ${filas.length}`)
  }
  if (sinSuerte.length > 0) {
    console.log('\nSIGUEN SIN TRAERSE (vuelve a ejecutar el script más tarde):')
    for (const x of sinSuerte) console.log(`  ${x}`)
  }
}

const { rows } = await client.query('SELECT kind, COUNT(*)::int AS n FROM "NauticalPoi" GROUP BY kind ORDER BY kind')
console.log(`\nTraídos ${total}, guardados ${guardadas}.`)
for (const r of rows) console.log(`  ${r.kind}: ${r.n}`)
await client.end()
