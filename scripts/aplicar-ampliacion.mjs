/**
 * Da de alta los productos que preparó scripts/ampliar-catalogo.ts.
 *
 *   node --env-file=.env scripts/aplicar-ampliacion.mjs            solo enseña lo que haría
 *   npx tsx scripts/backup.ts                                      copia antes de tocar nada
 *   node --env-file=.env scripts/aplicar-ampliacion.mjs --aplicar  los da de alta
 *
 * Toma de scripts/datos/ampliacion-catalogo.json, por categoría, los titulares
 * que tienen SEO y enlace, y completa con reservas si a alguno le faltó. Antes
 * de dar de alta vuelve a mirar la base de datos: si un artículo ya existe (o
 * hay un producto con el mismo título), se salta. Todo en una transacción; con
 * --aplicar exige una copia en copias/ de menos de 2 horas.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import { pgConfig } from './pg-config.mjs'

const APLICAR = process.argv.includes('--aplicar')
const ARCHIVO = join('scripts', 'datos', 'ampliacion-catalogo.json')

if (!existsSync(ARCHIVO)) {
  console.error(`❌ No está ${ARCHIVO}. Prepáralo con scripts/ampliar-catalogo.ts.`)
  process.exit(1)
}
const { porCategoria, propuestas } = JSON.parse(readFileSync(ARCHIVO, 'utf8'))

const normal = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

/** Igual que slugify() de lib/catalog.ts, sin dejar un guion al final. */
function slug(titulo) {
  const s = normal(titulo).replace(/ /g, '-').slice(0, 60).replace(/-+$/, '')
  return s || 'producto'
}

function copiaReciente() {
  const dir = 'copias'
  if (!existsSync(dir)) return null
  const limite = Date.now() - 2 * 60 * 60 * 1000
  return readdirSync(dir)
    .map((d) => join(dir, d))
    .filter((d) => existsSync(join(d, 'manifiesto.json')) && statSync(join(d, 'manifiesto.json')).mtimeMs > limite)
    .sort()
    .pop() ?? null
}

// Por categoría: titulares listos y, si faltan, reservas listas.
const listas = propuestas.filter((p) => p.seo && p.enlace)
const elegidas = []
for (const categoria of [...new Set(propuestas.map((p) => p.categoria))]) {
  const deAqui = listas.filter((p) => p.categoria === categoria).sort((a, b) => Number(a.reserva) - Number(b.reserva))
  elegidas.push(...deAqui.slice(0, porCategoria))
}

if (APLICAR) {
  const copia = copiaReciente()
  if (!copia) {
    console.error('❌ No hay una copia de menos de 2 horas en copias/. Haz antes: npx tsx scripts/backup.ts')
    process.exit(1)
  }
  console.log(`Copia encontrada: ${copia}`)
}

const pool = new pg.Pool(pgConfig(process.env.DATABASE_URL))
let db
try {
  db = await pool.connect()
} catch (error) {
  console.error('❌ No se puede conectar a la base de datos:', error instanceof Error ? error.message : error)
  await pool.end()
  process.exit(1)
}

try {
  await db.query(APLICAR ? 'BEGIN' : 'BEGIN READ ONLY')
  const { rows } = await db.query(`SELECT id, "aliexpressId" AS sku, title FROM "Product"`)
  const ids = new Set(rows.map((r) => r.id))
  const skus = new Set(rows.map((r) => r.sku))
  const titulos = new Set(rows.map((r) => normal(r.title)))

  let altas = 0
  let saltadas = 0
  let categoriaActual = ''
  for (const p of elegidas) {
    if (p.categoria !== categoriaActual) {
      categoriaActual = p.categoria
      console.log(`\n${categoriaActual}:`)
    }
    if (skus.has(p.sku)) {
      console.log(`  - ya existe el artículo ${p.sku}: ${p.seo.title}`)
      saltadas++
      continue
    }
    if (titulos.has(normal(p.seo.title))) {
      console.log(`  - ya hay un producto con este título: ${p.seo.title}`)
      saltadas++
      continue
    }
    let id = slug(p.seo.title)
    for (let n = 2; ids.has(id); n++) id = `${slug(p.seo.title)}-${n}`
    ids.add(id)
    skus.add(p.sku)
    titulos.add(normal(p.seo.title))

    console.log(`  + ${p.seo.title} · ${Number(p.precio).toFixed(2)} € · ${p.subcategoria}${p.reserva ? ' (reserva)' : ''}`)
    if (APLICAR) {
      await db.query(
        `INSERT INTO "Product" (id, "aliexpressId", title, description, "imageUrl", images, "imageAlts", "videoUrl", price, currency,
           "affiliateUrl", category, "typeFishing", categories, subcategory, subcategories, rating, reviews, "inStock",
           "seoTitle", "seoDescription", "aiOptimized", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'EUR', $10, 'fishing', $11, $12, $13, $14, $15, $16, true, $17, $18, true, now(), now())`,
        [
          id,
          p.sku,
          p.seo.title,
          p.seo.description,
          p.imagenes[0],
          p.imagenes,
          p.seo.imageAlts ?? [],
          p.video ?? '',
          p.precio,
          p.enlace,
          p.categoria,
          [p.categoria],
          p.subcategoria,
          [p.subcategoria],
          Math.min(5, Math.round((p.valoracion / 20) * 10) / 10),
          p.vendidos,
          p.seo.seoTitle,
          p.seo.seoDescription,
        ],
      )
    }
    altas++
  }

  if (APLICAR) {
    await db.query('COMMIT')
    console.log(`\n✅ ${altas} productos dados de alta, ${saltadas} saltados. La web los enseña en menos de una hora.`)
  } else {
    await db.query('ROLLBACK')
    console.log(`\nSe darían de alta ${altas} productos (${saltadas} saltados). No se ha cambiado nada.`)
    console.log('Para hacerlo: copia con `npx tsx scripts/backup.ts` y repite con --aplicar.')
  }
} catch (error) {
  await db.query('ROLLBACK').catch(() => {})
  console.error('\n❌ Error, no se ha dado de alta nada:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  db.release()
  await pool.end()
}
