/**
 * Check which catalog products no longer exist on AliExpress and (optionally)
 * remove them from lib/catalog-data.ts and the database.
 *
 *   node scripts/check-dead-products.mjs           # report only (safe)
 *   node scripts/check-dead-products.mjs --remove  # also delete the dead ones
 *
 * A product is only flagged as DEAD when its batch call to AliExpress succeeded
 * and the product id was NOT in the response — transient API errors never delete
 * anything.
 */
import 'dotenv/config'
import crypto from 'crypto'
import pg from 'pg'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'catalog-data.ts')
const REMOVE = process.argv.includes('--remove')

const APP_KEY = process.env.ALIEXPRESS_APP_KEY
const APP_SECRET = process.env.ALIEXPRESS_APP_SECRET
const TRACKING_ID = process.env.ALIEXPRESS_TRACKING_ID ?? 'pescaplus'
const GATEWAY = process.env.ALIEXPRESS_GATEWAY ?? 'https://api-sg.aliexpress.com/sync'

function sign(params, secret) {
  const base = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join('')
  return crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex').toUpperCase()
}
async function aliCall(method, business) {
  const params = { method, app_key: APP_KEY, sign_method: 'sha256', timestamp: Date.now().toString(), format: 'json', v: '2.0', ...business }
  params.sign = sign(params, APP_SECRET)
  const res = await fetch(`${GATEWAY}?${new URLSearchParams(params)}`, { method: 'POST', headers: { Accept: 'application/json' } })
  const json = await res.json()
  return json[`${method.replace(/\./g, '_')}_response`] ?? json
}

/** Returns the set of product_ids AliExpress confirms exist for the given ids. */
async function liveIds(ids) {
  const data = await aliCall('aliexpress.affiliate.productdetail.get', {
    product_ids: ids.join(','),
    target_currency: 'EUR',
    target_language: 'ES',
    tracking_id: TRACKING_ID,
  })
  const products = data?.resp_result?.result?.products?.product ?? []
  return new Set(products.map((p) => String(p.product_id)))
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  if (!APP_KEY || !APP_SECRET) throw new Error('Faltan credenciales de AliExpress')

  const src = readFileSync(OUT, 'utf8')
  const m = src.match(/CatalogSeed\[\]\s*=\s*(\[[\s\S]*\])\s*$/)
  if (!m) throw new Error('No se pudo leer CATALOG_SEED')
  const products = JSON.parse(m[1])
  console.log(`Catálogo: ${products.length} productos. Comprobando en AliExpress…`)

  const dead = []
  const BATCH = 20
  for (let i = 0; i < products.length; i += BATCH) {
    const chunk = products.slice(i, i + BATCH)
    const ids = chunk.map((p) => String(p.sku)).filter(Boolean)
    let live
    try {
      live = await liveIds(ids)
    } catch (e) {
      console.log(`  ⚠️  lote ${i / BATCH + 1} falló (${e.message}); se omite (no se marca nada)`)
      await sleep(1500)
      continue
    }
    // If the API returned nothing for a full batch, treat it as a transient/quirk
    // and skip — never delete a whole batch on an empty response.
    if (live.size === 0) {
      console.log(`  ⚠️  lote ${i / BATCH + 1}: respuesta vacía; se omite por seguridad`)
      await sleep(1500)
      continue
    }
    for (const p of chunk) if (!live.has(String(p.sku))) dead.push(p)
    process.stdout.write(`  lote ${i / BATCH + 1}: ${live.size}/${ids.length} vivos\n`)
    await sleep(1200)
  }

  console.log(`\n=== RESULTADO: ${dead.length} producto(s) ya no disponibles en AliExpress ===`)
  for (const p of dead) console.log(`  ✗ [${p.typeFishing}] ${p.title.slice(0, 60)}  (sku ${p.sku}, id ${p.id})`)

  if (dead.length === 0) return
  if (!REMOVE) {
    console.log(`\nSolo informe. Para eliminarlos: node scripts/check-dead-products.mjs --remove`)
    return
  }

  // --- Remove from catalog-data.ts ---
  const deadIds = new Set(dead.map((p) => p.id))
  const kept = products.filter((p) => !deadIds.has(p.id))
  const start = src.indexOf('[', src.indexOf('= [', src.indexOf('CATALOG_SEED')))
  const end = src.lastIndexOf(']')
  writeFileSync(OUT, src.slice(0, start) + JSON.stringify(kept, null, 2) + src.slice(end + 1))
  console.log(`\n✅ Eliminados de catalog-data.ts (${kept.length} quedan).`)

  // --- Remove from DB ---
  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 })
    const client = await pool.connect()
    try {
      const res = await client.query('DELETE FROM "Product" WHERE id = ANY($1)', [[...deadIds]])
      console.log(`✅ Eliminados de la base de datos: ${res.rowCount} filas.`)
    } finally {
      client.release()
      await pool.end()
    }
  }
}

main().catch((e) => { console.error('\n❌', e.message); process.exit(1) })
