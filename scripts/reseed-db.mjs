/**
 * Replace all rows in the Neon "Product" table with the current catalog
 * (lib/catalog-data.ts). Run: `node scripts/reseed-db.mjs`
 */
import 'dotenv/config'
import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(__dirname, '..', 'lib', 'catalog-data.ts'), 'utf8')
const m = src.match(/CatalogSeed\[\]\s*=\s*(\[[\s\S]*\])\s*$/)
if (!m) throw new Error('No se pudo leer CATALOG_SEED')
const products = JSON.parse(m[1])

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM "Product"')
    for (const p of products) {
      await client.query(
        `INSERT INTO "Product"
          (id,"aliexpressId",title,description,"imageUrl",images,"videoUrl",price,currency,"affiliateUrl",category,"typeFishing",rating,reviews,"inStock","seoDescription","aiOptimized","subcategory","categories","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,now())`,
        [
          p.id, p.aliexpressId, p.title, p.description, p.imageUrl,
          p.images ?? [], p.videoUrl ?? '', p.price, p.currency, p.affiliateUrl,
          p.category ?? 'fishing', p.typeFishing, p.rating ?? 0, p.reviews ?? 0,
          p.inStock ?? true, p.seoDescription ?? '', p.aiOptimized ?? false, p.subcategory ?? '',
          (p.categories?.length ? p.categories : [p.typeFishing]),
        ],
      )
    }
    await client.query('COMMIT')
    const c = await client.query('select "typeFishing", count(*)::int n from "Product" group by "typeFishing" order by 1')
    console.log('Reseed OK. Reparto:', c.rows.map((r) => `${r.typeFishing}:${r.n}`).join('  '))
    const t = await client.query('select count(*)::int n from "Product"')
    console.log('Total:', t.rows[0].n)
    return true
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
    await pool.end()
  }
}

for (let i = 1; i <= 4; i++) {
  try { await run(); process.exit(0) }
  catch (e) { console.log(`intento ${i} falló: ${e.message}`); await new Promise((r) => setTimeout(r, 2000)) }
}
process.exit(1)
