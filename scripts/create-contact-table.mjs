/**
 * Create the "ContactMessage" table in Neon (idempotent).
 * Run once after deploying the contact form: `node scripts/create-contact-table.mjs`
 */
import 'dotenv/config'
import pg from 'pg'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL no está definida. Nada que hacer (la app usará el store en memoria).')
  process.exit(0)
}

const ddl = `
CREATE TABLE IF NOT EXISTS "ContactMessage" (
  "id"        TEXT PRIMARY KEY,
  "name"      TEXT NOT NULL DEFAULT '',
  "email"     TEXT NOT NULL DEFAULT '',
  "subject"   TEXT NOT NULL DEFAULT '',
  "message"   TEXT NOT NULL,
  "handled"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ContactMessage_createdAt_idx" ON "ContactMessage" ("createdAt");
`

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 })
  const client = await pool.connect()
  try {
    await client.query(ddl)
    console.log('OK: tabla ContactMessage lista.')
  } finally {
    client.release()
    await pool.end()
  }
}

for (let i = 1; i <= 3; i++) {
  try { await run(); process.exit(0) }
  catch (e) { console.log(`intento ${i} falló: ${e.message}`); await new Promise((r) => setTimeout(r, 2000)) }
}
process.exit(1)
