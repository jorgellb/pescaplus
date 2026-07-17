/** Create the "ForecastCheck" table in Neon (idempotent). Run: node scripts/create-verification-table.mjs */
import 'dotenv/config'
import pg from 'pg'

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL no definida.'); process.exit(0) }
const ddl = `
CREATE TABLE IF NOT EXISTS "ForecastCheck" (
  "id"          TEXT PRIMARY KEY,
  "spotSlug"    TEXT NOT NULL,
  "dateISO"     TEXT NOT NULL,
  "targetUtc"   TEXT NOT NULL,
  "idema"       TEXT NOT NULL,
  "predWindKmh" DOUBLE PRECISION NOT NULL,
  "obsWindKmh"  DOUBLE PRECISION,
  "errorKmh"    DOUBLE PRECISION,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt"  TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "ForecastCheck_spotSlug_dateISO_key" ON "ForecastCheck" ("spotSlug","dateISO");
CREATE INDEX IF NOT EXISTS "ForecastCheck_spotSlug_resolvedAt_idx" ON "ForecastCheck" ("spotSlug","resolvedAt");
`
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 })
try { await pool.query(ddl); console.log('OK: tabla ForecastCheck lista.') } finally { await pool.end() }
