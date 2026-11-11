/**
 * Borra de producción las filas que dejaron las pruebas el 2026-11-10.
 *
 * Aquel día un hook lanzó las pruebas con el `.env` cargado, y su
 * DATABASE_URL es la de PRODUCCIÓN. Escribieron en tres tandas (18:40, 18:57 y
 * 19:01 UTC) usuarios `@x.es`, quedadas, operadores verificados, chárters,
 * reseñas, capturas en Tarifa y comprobaciones de previsión, y parte se veía en
 * la web. La causa ya está corregida (tests/sin-servicios-reales.ts).
 *
 *   node --env-file=.env scripts/limpiar-restos-pruebas.mjs           solo cuenta y enseña
 *   npx tsx scripts/backup.ts                                          copia antes de borrar
 *   node --env-file=.env scripts/limpiar-restos-pruebas.mjs --borrar  borra
 *
 * Seguridades:
 *  - Solo filas de esos minutos exactos (o con correo `@x.es`, un dominio
 *    inventado que usan las pruebas), nunca «lo de hoy».
 *  - Cada tabla tiene que dar EXACTAMENTE lo que se contó el 2026-11-10. Si una
 *    sola no cuadra, no se borra nada: algo ha cambiado y hay que mirarlo.
 *  - Con --borrar exige una copia en copias/ de menos de 2 horas.
 *  - Todo va en una transacción: o se borra todo o nada.
 */
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import { pgConfig } from './pg-config.mjs'

const BORRAR = process.argv.includes('--borrar')

const VENTANAS = `(
  ("createdAt" >= '2026-11-10 18:40:00+00' AND "createdAt" < '2026-11-10 18:42:00+00') OR
  ("createdAt" >= '2026-11-10 18:57:00+00' AND "createdAt" < '2026-11-10 18:59:00+00') OR
  ("createdAt" >= '2026-11-10 19:01:00+00' AND "createdAt" < '2026-11-10 19:02:00+00')
)`
const USUARIOS = `SELECT id FROM "User" WHERE email LIKE '%@x.es'`

/** En orden de borrado: primero lo que cuelga de lo demás. `esperadas` = lo contado el 2026-11-10. */
const TABLAS = [
  { tabla: 'Review', donde: `${VENTANAS} AND "authorUserId" IN (${USUARIOS})`, esperadas: 3, muestra: `"operatorId", rating, "publishedAt"` },
  { tabla: 'Charter', donde: `${VENTANAS} AND "operatorId" IN (SELECT id FROM "Operator" WHERE ${VENTANAS})`, esperadas: 18, muestra: `"spotSlug", "dateISO", status` },
  { tabla: 'Operator', donde: VENTANAS, esperadas: 14, muestra: `name, email, "spotSlug", verified` },
  { tabla: 'Meetup', donde: VENTANAS, esperadas: 49, muestra: `"hostName", "hostContact", "spotSlug", "dateISO", status` },
  { tabla: 'CatchReport', donde: `${VENTANAS} AND "spotSlug" = 'tarifa'`, esperadas: 79, muestra: `"spotSlug", "speciesId", "dateISO", qty` },
  { tabla: 'ForecastCheck', donde: VENTANAS, esperadas: 11, muestra: `"spotSlug", "dateISO", "predWindKmh"` },
  { tabla: 'LoginToken', donde: `email LIKE '%@x.es'`, esperadas: null, muestra: `email` },
  { tabla: 'User', donde: `email LIKE '%@x.es'`, esperadas: 14, muestra: `email, "createdAt"` },
]

/** Lo que cae solo por ON DELETE CASCADE; se cuenta para que no haya sorpresas. */
const EN_CASCADA = [
  { tabla: 'CharterBooking', donde: `"charterId" IN (SELECT id FROM "Charter" WHERE ${VENTANAS})` },
  { tabla: 'Rsvp', donde: `"meetupId" IN (SELECT id FROM "Meetup" WHERE ${VENTANAS})` },
  { tabla: 'Session', donde: `"userId" IN (${USUARIOS})` },
]

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

if (BORRAR) {
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
let cuadra = true
try {
  await db.query(BORRAR ? 'BEGIN' : 'BEGIN READ ONLY')

  console.log('\nFilas de las pruebas del 2026-11-10:')
  for (const t of TABLAS) {
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM "${t.tabla}" WHERE ${t.donde}`)
    const n = rows[0].n
    const ok = t.esperadas === null || n === t.esperadas
    if (!ok) cuadra = false
    console.log(`  ${ok ? '✓' : '✗'} ${t.tabla.padEnd(14)} ${String(n).padStart(3)}${t.esperadas === null ? '' : `  (esperadas ${t.esperadas})`}`)
    const { rows: m } = await db.query(`SELECT ${t.muestra} FROM "${t.tabla}" WHERE ${t.donde} LIMIT 3`)
    for (const fila of m) console.log(`        ${JSON.stringify(fila)}`)
  }
  console.log('\nCaen en cascada al borrar lo anterior:')
  for (const t of EN_CASCADA) {
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM "${t.tabla}" WHERE ${t.donde}`)
    console.log(`    ${t.tabla.padEnd(14)} ${String(rows[0].n).padStart(3)}`)
  }

  if (!cuadra) {
    console.error('\n❌ Alguna tabla no da lo esperado. No se borra nada: hay que mirar qué ha cambiado.')
    await db.query('ROLLBACK')
    process.exitCode = 1
  } else if (!BORRAR) {
    console.log('\nTodo cuadra. Para borrar: copia con `npx tsx scripts/backup.ts` y repite con --borrar.')
    await db.query('ROLLBACK')
  } else {
    for (const t of TABLAS) {
      const r = await db.query(`DELETE FROM "${t.tabla}" WHERE ${t.donde}`)
      if (t.esperadas !== null && r.rowCount !== t.esperadas) {
        throw new Error(`${t.tabla}: se iban a borrar ${r.rowCount} y se esperaban ${t.esperadas}`)
      }
      console.log(`  borradas ${String(r.rowCount).padStart(3)} de ${t.tabla}`)
    }
    await db.query('COMMIT')
    console.log('\n✅ Hecho.')
  }
} catch (error) {
  await db.query('ROLLBACK').catch(() => {})
  console.error('\n❌ Error, no se ha borrado nada:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  db.release()
  await pool.end()
}
