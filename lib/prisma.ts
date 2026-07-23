import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool, type PoolConfig } from 'pg'

const connectionString = process.env.DATABASE_URL

/**
 * TLS for the Postgres connection. Managed Postgres (Aiven, Neon, Supabase…)
 * requires SSL. Aiven signs its certificates with its OWN CA, so the strict
 * `verify-full` that node-postgres applies for `sslmode=require` would reject
 * the connection ("self-signed certificate in certificate chain"). Two options:
 *   - Set DATABASE_CA_CERT to the Aiven CA (PEM) → we verify properly (secure).
 *   - Leave it unset → we connect over TLS without verifying the cert (simple).
 * Local Postgres (localhost) needs no SSL.
 */
const isLocal = !!connectionString && /@(localhost|127\.0\.0\.1)/.test(connectionString)

function sslConfig(): PoolConfig['ssl'] {
  if (!connectionString || isLocal) return undefined
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n')
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
  max: Number(process.env.DATABASE_POOL_MAX ?? 5),
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
