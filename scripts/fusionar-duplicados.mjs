/**
 * Quita los productos duplicados y da título propio a los que lo compartían.
 *
 *   node --env-file=.env scripts/fusionar-duplicados.mjs            solo enseña lo que haría
 *   npx tsx scripts/backup.ts                                       copia antes de tocar nada
 *   node --env-file=.env scripts/fusionar-duplicados.mjs --aplicar  lo hace
 *
 * Revisado el 2026-11-11 producto a producto, con las fotos de la web pública:
 *
 *  1. FUSIONES (lib/productos-fusionados.json). Tres artículos dados de alta dos
 *     veces desde dos vendedores, con la foto idéntica. Se queda la ficha
 *     original y se borra la copia; los clics de la copia pasan a la original y,
 *     si la original está agotada y la copia no, la original se queda con la
 *     oferta (precio, enlace y disponibilidad) de la copia. next.config.ts
 *     redirige la copia a la original.
 *
 *  2. TÍTULOS. Dieciséis productos DISTINTOS que compartían título («carrete de
 *     pesca giratorio» era a la vez un Shimano Sienna y un KastKing Kestrel). No
 *     son duplicados y no se borran: cada uno recibe un título que dice qué es.
 *     Se borra su meta título para que la ficha use el nuevo. Un título que ya
 *     no es el que había el 2026-11-11 se respeta: alguien lo cambió a mano.
 *
 * Seguridades: todo en una transacción; con --aplicar exige una copia en
 * copias/ de menos de 2 horas; si una ficha original falta, no se toca nada.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import { pgConfig } from './pg-config.mjs'

const APLICAR = process.argv.includes('--aplicar')
const { fusionados } = JSON.parse(readFileSync(new URL('../lib/productos-fusionados.json', import.meta.url), 'utf8'))

const TITULOS = [
  { id: '9km-giratorios-de-3-vias-5-15-uds-rodamiento-minuteria', antes: 'Giratorios de 3 vías para minutería', despues: 'Giratorios de 3 vías con rodamiento de bolas, 50-250 lb' },
  { id: 'giratorios-de-3-vias-15-60-uds-aparejos-minuteria', antes: 'Giratorios de 3 vías para minutería', despues: 'Giratorios de 3 vías con perlas luminosas' },
  { id: 'giratorios-de-3-vias-15-60-uds-aparejos-minuteria-msfrjejj', antes: 'Giratorios de 3 vías para minutería', despues: 'Giratorio en T con brazo de alambre y perlas luminosas' },
  { id: 'giratorios-de-3-vias-25-50-uds-aparejos-de-minuteria', antes: 'Giratorios de 3 vías para minutería', despues: 'Giratorios de 3 vías clásicos, packs de 25 y 50 uds' },
  { id: '9km-rodamiento-de-bolas-giratorio-snap-5-uds-minuteria', antes: 'Roddamiento de bolas giratorio para minutería', despues: 'Emerillón de triple rodamiento con grapa, 5 uds' },
  { id: '9km-rodamiento-de-bolas-giratorio-snap-50-uds-minuteria', antes: 'Roddamiento de bolas giratorio para minutería', despues: 'Emerillón de rodamiento con grapa, negro, 50 uds' },
  { id: 'carrete-de-pesca-giratorio-shimano-sienna-ar-c-carretes-de-p', antes: 'carrete de pesca giratorio', despues: 'Carrete de spinning Shimano Sienna' },
  { id: 'kastking-carrete-de-pesca-giratorio-kestrel-carretes-de-pesc', antes: 'carrete de pesca giratorio', despues: 'Carrete de spinning KastKing Kestrel' },
  { id: 'fishtrip-rodamiento-de-bolas-giratorio-de-minuteria', antes: 'Rodamiento de bolas giratorio para minutería', despues: 'Emerillón de rodamiento con grapa coastlock, 15-240 lb' },
  { id: 'rodamiento-de-bolas-de-pesca-giratorio-snap-minuteria', antes: 'Rodamiento de bolas giratorio para minutería', despues: 'Emerillón de rodamiento con grapa de acero inoxidable' },
  { id: 'sougayilang-juego-de-8-plomos-de-pesca-de-70g-plomos', antes: 'Juego de 8 plomos de pesca de 70g', despues: 'Juego de 8 plomos de pesca con caja' },
  { id: 'sougayilang-juego-de-8-plomos-de-pesca-de-70g-plomos-ms7c52ch', antes: 'Juego de 8 plomos de pesca de 70g', despues: 'Plomos alargados de 70, 95 y 115 g' },
  { id: 'noeby-senuelo-de-pesca-con-lapiz-que-se-hunde-senuelos', antes: 'señuelo de pesca con lápiz que se hunde', despues: 'Stickbait hundido de lance largo, 150 mm' },
  { id: 'noeby-senuelo-de-pesca-con-lapiz-que-se-hunde-senuelos-ms4x1flw', antes: 'señuelo lápiz hundible', despues: 'Lápiz hundido para agua salada, de 115 a 185 mm' },
  { id: 'linea-de-pesca-de-fluorocarbono-zukibo-lineas-de-pesca', antes: 'Línea de pesca de fluorocarbono', despues: 'Línea recubierta de fluorocarbono, bobina de 500 m' },
  { id: 'zukibo-linea-de-pesca-de-fluorocarbono-hilo-de-lineas-de-pes', antes: 'Línea de pesca de fluorocarbono', despues: 'Fluorocarbono 100 % ultrasuave, 50 m' },
]

/** Para comparar títulos: sin entidades HTML, sin espacios raros, sin mayúsculas. */
function clave(texto) {
  return String(texto ?? '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

const COLUMNAS = `id, title, price, "inStock", "affiliateUrl"`
const fila = async (id) => (await db.query(`SELECT ${COLUMNAS} FROM "Product" WHERE id = $1`, [id])).rows[0] ?? null
const resumen = (p) => `${p.title} · ${Number(p.price).toFixed(2)} € · ${p.inStock ? 'disponible' : 'AGOTADO'}`

try {
  await db.query(APLICAR ? 'BEGIN' : 'BEGIN READ ONLY')

  console.log('\n1. Duplicados (mismo artículo, foto idéntica):')
  const fusiones = []
  for (const [copiaId, originalId] of Object.entries(fusionados)) {
    const [copia, original] = [await fila(copiaId), await fila(originalId)]
    if (!copia) {
      console.log(original ? `  ✓ ya hecho: ${copiaId}` : `  - no existe ninguna de las dos: ${originalId}`)
      continue
    }
    // Borrar la copia sin la original haría desaparecer el producto.
    if (!original) throw new Error(`Falta la ficha original ${originalId}: no se toca nada.`)
    const tomaOferta = !original.inStock && copia.inStock
    const clics = (await db.query(`SELECT count(*)::int AS n FROM "ProductClick" WHERE "productId" = $1`, [copiaId])).rows[0].n
    console.log(`  · se queda  ${originalId}\n      ${resumen(original)}`)
    console.log(`    se borra  ${copiaId}\n      ${resumen(copia)}`)
    console.log(`      ${clics} clics pasan a la original${tomaOferta ? '; la original toma la oferta de la copia (estaba agotada)' : ''}`)
    fusiones.push({ copia, originalId, tomaOferta })
  }

  console.log('\n2. Títulos repetidos en productos distintos:')
  const cambios = []
  for (const t of TITULOS) {
    const p = await fila(t.id)
    if (!p) {
      console.log(`  - no existe: ${t.id}`)
    } else if (clave(p.title) === clave(t.despues)) {
      console.log(`  ✓ ya hecho: ${t.despues}`)
    } else if (clave(p.title) !== clave(t.antes)) {
      console.log(`  - se respeta (cambiado a mano): «${p.title}» (${t.id})`)
    } else {
      console.log(`  · «${p.title}» → «${t.despues}»`)
      cambios.push(t)
    }
  }

  if (!APLICAR) {
    await db.query('ROLLBACK')
  } else {
    for (const { copia, originalId, tomaOferta } of fusiones) {
      if (tomaOferta) {
        await db.query(
          `UPDATE "Product" SET price = $2, "affiliateUrl" = $3, "inStock" = true, "updatedAt" = now() WHERE id = $1`,
          [originalId, copia.price, copia.affiliateUrl],
        )
      }
      await db.query(`UPDATE "ProductClick" SET "productId" = $2 WHERE "productId" = $1`, [copia.id, originalId])
      const r = await db.query(`DELETE FROM "Product" WHERE id = $1`, [copia.id])
      if (r.rowCount !== 1) throw new Error(`${copia.id}: se iba a borrar 1 y salen ${r.rowCount}`)
    }
    for (const t of cambios) {
      const r = await db.query(`UPDATE "Product" SET title = $2, "seoTitle" = '', "updatedAt" = now() WHERE id = $1`, [t.id, t.despues])
      if (r.rowCount !== 1) throw new Error(`${t.id}: se iba a cambiar 1 y salen ${r.rowCount}`)
    }
  }

  // Lo que siga repetido después de esto (también lo que llegue en el futuro):
  // volver a lanzar el script sin --aplicar sirve de revisión.
  // Sin --aplicar se simulan los cambios de arriba, para que la lista diga lo
  // que quedaría y no lo que hay ahora.
  const borradas = new Set(fusiones.map((f) => f.copia.id))
  const nuevos = new Map(cambios.map((t) => [t.id, t.despues]))
  const { rows } = await db.query(`SELECT id, title FROM "Product"`)
  const grupos = new Map()
  for (const p of rows) {
    if (borradas.has(p.id)) continue
    const titulo = nuevos.get(p.id) ?? p.title
    grupos.set(clave(titulo), [...(grupos.get(clave(titulo)) ?? []), { id: p.id, title: titulo }])
  }
  const repetidos = [...grupos.values()].filter((g) => g.length > 1)
  console.log(`\n3. Títulos que ${APLICAR ? 'siguen' : 'seguirían'} repetidos después: ${repetidos.length}`)
  for (const g of repetidos) console.log(`  · «${g[0].title}»: ${g.map((p) => p.id).join(', ')}`)

  if (APLICAR) {
    await db.query('COMMIT')
    console.log(`\n✅ Hecho: ${fusiones.length} duplicados quitados y ${cambios.length} títulos nuevos. La web lo refleja en menos de una hora.`)
  } else {
    console.log('\nNo se ha cambiado nada. Para aplicarlo: copia con `npx tsx scripts/backup.ts` y repite con --aplicar.')
  }
} catch (error) {
  await db.query('ROLLBACK').catch(() => {})
  console.error('\n❌ Error, no se ha cambiado nada:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  db.release()
  await pool.end()
}
