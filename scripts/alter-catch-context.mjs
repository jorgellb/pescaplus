/** Añade a "CatchReport" el punto, la hora y el sello de condiciones (idempotente).
 *  node scripts/alter-catch-context.mjs */
import 'dotenv/config'
import pg from 'pg'
import { pgConfig } from './pg-config.mjs'

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL no definida.'); process.exit(0) }

const ddl = `
ALTER TABLE "CatchReport" ADD COLUMN IF NOT EXISTS "lat"     DOUBLE PRECISION;
ALTER TABLE "CatchReport" ADD COLUMN IF NOT EXISTS "lon"     DOUBLE PRECISION;
ALTER TABLE "CatchReport" ADD COLUMN IF NOT EXISTS "timeISO" TEXT;
ALTER TABLE "CatchReport" ADD COLUMN IF NOT EXISTS "context" JSONB;
CREATE INDEX IF NOT EXISTS "CatchReport_userId_dateISO_idx" ON "CatchReport"("userId", "dateISO");
`
const client = new pg.Client(pgConfig())
await client.connect()
await client.query(ddl)
const { rows } = await client.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_name='CatchReport' ORDER BY ordinal_position`)
console.log('Columnas de "CatchReport":', rows.map((r) => r.column_name).join(', '))
await client.end()
