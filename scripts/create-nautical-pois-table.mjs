/** Crea la tabla "NauticalPoi" (idempotente).
 *  node scripts/create-nautical-pois-table.mjs */
import 'dotenv/config'
import pg from 'pg'
import { pgConfig } from './pg-config.mjs'

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL no definida.'); process.exit(0) }

const ddl = `
CREATE TABLE IF NOT EXISTS "NauticalPoi" (
  "id"         TEXT PRIMARY KEY,
  "osmType"    TEXT NOT NULL,
  "osmId"      TEXT NOT NULL,
  "kind"       TEXT NOT NULL,
  "name"       TEXT NOT NULL DEFAULT '',
  "lat"        DOUBLE PRECISION NOT NULL,
  "lon"        DOUBLE PRECISION NOT NULL,
  "details"    JSONB,
  "sourceName" TEXT NOT NULL DEFAULT 'OpenStreetMap',
  "sourceDate" TEXT NOT NULL DEFAULT '',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Reimportar es reejecutar: la clave natural es el objeto de OSM.
CREATE UNIQUE INDEX IF NOT EXISTS "NauticalPoi_osmType_osmId_key" ON "NauticalPoi"("osmType", "osmId");
CREATE INDEX IF NOT EXISTS "NauticalPoi_kind_idx" ON "NauticalPoi"("kind");
CREATE INDEX IF NOT EXISTS "NauticalPoi_lat_lon_idx" ON "NauticalPoi"("lat", "lon");
`

const client = new pg.Client(pgConfig())
await client.connect()
await client.query(ddl)
const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM "NauticalPoi"')
console.log(`Tabla "NauticalPoi" lista. Filas actuales: ${rows[0].n}`)
await client.end()
