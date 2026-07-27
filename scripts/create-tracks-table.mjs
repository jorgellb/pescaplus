/** Crea la tabla "Track" (idempotente).
 *  node scripts/create-tracks-table.mjs */
import 'dotenv/config'
import pg from 'pg'
import { pgConfig } from './pg-config.mjs'

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL no definida.'); process.exit(0) }

const ddl = `
CREATE TABLE IF NOT EXISTS "Track" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "notes"      TEXT NOT NULL DEFAULT '',
  "points"     JSONB NOT NULL,
  "distanceM"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "durationS"  INTEGER NOT NULL DEFAULT 0,
  "startedAt"  TIMESTAMP(3) NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'private',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Track_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Track_userId_startedAt_idx" ON "Track"("userId", "startedAt");
`

const client = new pg.Client(pgConfig())
await client.connect()
await client.query(ddl)
const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM "Track"')
console.log(`Tabla "Track" lista. Filas actuales: ${rows[0].n}`)
await client.end()
