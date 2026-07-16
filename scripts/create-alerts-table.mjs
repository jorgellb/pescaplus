/**
 * Create the "AlertSubscription" table in Neon (idempotent).
 * Run once: `node scripts/create-alerts-table.mjs`
 */
import 'dotenv/config'
import pg from 'pg'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL no está definida (la app usará memoria).')
  process.exit(0)
}

const ddl = `
CREATE TABLE IF NOT EXISTS "AlertSubscription" (
  "id"        TEXT PRIMARY KEY,
  "email"     TEXT NOT NULL,
  "spotSlug"  TEXT NOT NULL,
  "especie"   TEXT NOT NULL DEFAULT '',
  "threshold" INTEGER NOT NULL DEFAULT 75,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "AlertSubscription_email_spotSlug_key" ON "AlertSubscription" ("email", "spotSlug");
CREATE INDEX IF NOT EXISTS "AlertSubscription_spotSlug_idx" ON "AlertSubscription" ("spotSlug");
`

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 })
try {
  await pool.query(ddl)
  console.log('OK: tabla AlertSubscription lista.')
} finally {
  await pool.end()
}
