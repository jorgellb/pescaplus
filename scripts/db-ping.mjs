/**
 * Comprueba la conexión a la base de datos (Aiven/Neon/Supabase) y lista las
 * tablas con su número de filas. Úsalo tras configurar DATABASE_URL para
 * verificar que todo conecta y que las tablas existen.
 *
 *   node scripts/db-ping.mjs
 *
 * SSL: si DATABASE_CA_CERT está definida, verifica el certificado; si no,
 * conecta por TLS sin verificarlo (igual que la app en lib/prisma.ts).
 */
import 'dotenv/config'
import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('❌ DATABASE_URL no está definida en .env')
  process.exit(1)
}

const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n')
const ssl = /@(localhost|127\.0\.0\.1)/.test(url) ? undefined : ca ? { ca } : { rejectUnauthorized: false }

const host = (url.match(/@([^/:]+)/) || [])[1] || '—'
console.log(`⏳ Conectando a ${host} ${ca ? '(CA verificada)' : '(TLS sin verificar)'}…`)

const pool = new pg.Pool({ connectionString: url, ssl, connectionTimeoutMillis: 15000 })
try {
  const { rows: tables } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' ORDER BY table_name`,
  )
  if (tables.length === 0) {
    console.log('✅ Conexión OK, pero NO hay tablas todavía.')
    console.log('   Crea el esquema con:  npx prisma db push')
  } else {
    console.log(`✅ Conexión OK · ${tables.length} tablas:\n`)
    for (const { table_name } of tables) {
      try {
        const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "${table_name}"`)
        console.log(`   ${table_name.padEnd(22)} ${rows[0].n} filas`)
      } catch {
        console.log(`   ${table_name.padEnd(22)} (no se pudo contar)`)
      }
    }
  }
} catch (e) {
  console.error('❌ Error de conexión:', e.message)
  console.error('   Revisa la DATABASE_URL (¿lleva ?sslmode=require?) y que la IP esté permitida en Aiven.')
  process.exit(1)
} finally {
  await pool.end()
}
