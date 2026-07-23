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
function sslConfig(): PoolConfig['ssl'] {
  if (!connectionString || /@(localhost|127\.0\.0\.1)/.test(connectionString)) return undefined
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n')
  return ca ? { ca } : { rejectUnauthorized: false }
}

const pool = new Pool({ connectionString, ssl: sslConfig() })
const adapter = new PrismaPg(pool)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
