/** Create the "Meetup" + "Rsvp" tables in Neon (idempotent).
 *  Run once the Neon quota is available: node scripts/create-meetups-tables.mjs */
import 'dotenv/config'
import pg from 'pg'

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL no definida.'); process.exit(0) }

const ddl = `
CREATE TABLE IF NOT EXISTS "Meetup" (
  "id"            TEXT PRIMARY KEY,
  "manageToken"   TEXT NOT NULL,
  "hostName"      TEXT NOT NULL,
  "hostContact"   TEXT NOT NULL,
  "spotSlug"      TEXT NOT NULL,
  "meetingPoint"  TEXT NOT NULL DEFAULT '',
  "dateISO"       TEXT NOT NULL,
  "timeStart"     TEXT NOT NULL,
  "durationH"     DOUBLE PRECISION,
  "modality"      TEXT NOT NULL,
  "targetSpecies" TEXT NOT NULL DEFAULT '',
  "level"         TEXT NOT NULL DEFAULT 'cualquiera',
  "maxPlaces"     INTEGER NOT NULL DEFAULT 4,
  "minToConfirm"  INTEGER NOT NULL DEFAULT 1,
  "costShare"     DOUBLE PRECISION,
  "notes"         TEXT NOT NULL DEFAULT '',
  "status"        TEXT NOT NULL DEFAULT 'open',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Meetup_manageToken_key" ON "Meetup" ("manageToken");
CREATE INDEX IF NOT EXISTS "Meetup_spotSlug_dateISO_idx" ON "Meetup" ("spotSlug","dateISO");
CREATE INDEX IF NOT EXISTS "Meetup_dateISO_idx" ON "Meetup" ("dateISO");

CREATE TABLE IF NOT EXISTS "Rsvp" (
  "id"        TEXT PRIMARY KEY,
  "meetupId"  TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "contact"   TEXT NOT NULL DEFAULT '',
  "places"    INTEGER NOT NULL DEFAULT 1,
  "status"    TEXT NOT NULL DEFAULT 'in',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Rsvp_meetupId_fkey" FOREIGN KEY ("meetupId") REFERENCES "Meetup"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Rsvp_meetupId_idx" ON "Rsvp" ("meetupId");
`

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 })
try {
  await pool.query(ddl)
  console.log('OK: tablas Meetup y Rsvp listas.')
} catch (e) {
  console.error('ERROR (¿cuota de Neon agotada?):', e.message)
} finally {
  await pool.end()
}
