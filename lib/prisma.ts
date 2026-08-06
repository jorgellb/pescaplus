import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool, type PoolConfig } from 'pg'
import { normalizeCaCert } from './db-ca'

const connectionString = process.env.DATABASE_URL

/**
 * TLS for the Postgres connection. Managed Postgres (Aiven, Neon, Supabase…)
 * requires SSL. Aiven signs its certificates with its OWN CA, so the strict
 * `verify-full` that node-postgres applies for `sslmode=require` would reject
 * the connection ("self-signed certificate in certificate chain"). Two options:
 *   - Set DATABASE_CA_CERT to the Aiven CA (PEM) → we verify properly (secure).
 *   - Leave it unset → we connect over TLS without verifying the cert (simple).
 * Local Postgres (localhost) needs no SSL.
 *
 * The value goes through `normalizeCaCert` because how it survives the trip
 * depends on who injects it — a Dockerfile parser eats the backslashes and
 * turns the PEM into something Node silently ignores. See lib/db-ca.ts.
 */
const isLocal = !!connectionString && /@(localhost|127\.0\.0\.1)/.test(connectionString)

function sslConfig(): PoolConfig['ssl'] {
  if (!connectionString || isLocal) return undefined
  const ca = normalizeCaCert(process.env.DATABASE_CA_CERT)
  return ca ? { ca } : { rejectUnauthorized: false }
}

// `sslmode=require` in the URL makes node-postgres apply its own verify-full
// against the system CA store, which OVERRIDES our explicit `ssl` object and
// rejects Aiven's own-CA certificate. Strip it so our `ssl` config wins.
const cleanConnectionString = connectionString?.replace(/([?&])ssl(mode)?=[^&]*/gi, '$1').replace(/[?&]$/, '')

// Aiven's plan caps total connections (e.g. 20). Each warm serverless instance
// keeps its own pool, so cap it low per instance and release idle connections
// quickly to avoid exhausting the limit under concurrency.
const pool = new Pool({
  connectionString: cleanConnectionString,
  ssl: sslConfig(),
  /*
   * Una sola conexión por proceso durante el build.
   *
   * El plan de Aiven da 20 conexiones en total (medido: `SHOW max_connections`
   * = 20). Next levanta un proceso por núcleo para generar las páginas
   * estáticas —16 en esta máquina— y cada uno abría su propio pool de 5: hasta
   * 80 conexiones peleándose por 20. De ahí los cientos de `TooManyConnections`
   * del build, y de ahí que la lectura del catálogo cayera al semilla.
   *
   * En caliente es al revés: un contenedor atendiendo muchas peticiones a la
   * vez, y ahí 5 es lo razonable.
   */
  max: Number(process.env.DATABASE_POOL_MAX ?? (process.env.NEXT_PHASE === 'phase-production-build' ? 1 : 5)),
  idleTimeoutMillis: 10_000,
})
const adapter = new PrismaPg(pool)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
