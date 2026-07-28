import { isDatabaseConfigured } from '@/lib/products-store'

/**
 * Rastro de acciones del panel de admin. Ver AdminAuditLog en el esquema: la
 * contraseña es única y compartida, así que esto no distingue "quién" —
 * distingue "qué, cuándo y desde qué IP", que ya es lo que se necesita para
 * reconstruir un incidente ("¿de dónde salió este borrado?").
 *
 * NUNCA debe tumbar la mutación real: registrar es un efecto secundario, no
 * una condición de éxito. Un fallo aquí se registra en consola y se sigue.
 */
export type AuditAction = 'create' | 'update' | 'delete' | 'verify' | 'unverify'

export interface AuditEntry {
  action: AuditAction
  entity: string
  entityId: string
  /** Línea legible para el listado, p.ej. "Chárter de TEST Charters (2026-09-15)". */
  summary?: string
  ip?: string
}

export interface AuditLogEntry {
  id: string
  action: AuditAction
  entity: string
  entityId: string
  summary: string
  ip: string
  createdAt: number
}

interface StoredAudit extends AuditLogEntry {}
const g = globalThis as unknown as { __pescaplusAudit?: StoredAudit[] }
function mem(): StoredAudit[] {
  if (!g.__pescaplusAudit) g.__pescaplusAudit = []
  return g.__pescaplusAudit
}

export async function logAdminAction(entry: AuditEntry): Promise<void> {
  const summary = (entry.summary ?? '').slice(0, 300)
  const ip = (entry.ip ?? '').slice(0, 80)
  try {
    if (isDatabaseConfigured()) {
      const { prisma } = await import('@/lib/prisma')
      await prisma.adminAuditLog.create({ data: { action: entry.action, entity: entry.entity, entityId: entry.entityId, summary, ip } })
      return
    }
    mem().unshift({ id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, action: entry.action, entity: entry.entity, entityId: entry.entityId, summary, ip, createdAt: Date.now() })
    if (mem().length > 2000) mem().length = 2000
  } catch (error) {
    console.warn('Admin audit log write failed (non-fatal):', error)
  }
}

export async function listAuditLog(limit = 300): Promise<AuditLogEntry[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.adminAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
      return rows.map((r) => ({ id: r.id, action: r.action as AuditAction, entity: r.entity, entityId: r.entityId, summary: r.summary, ip: r.ip, createdAt: r.createdAt.getTime() }))
    } catch (error) {
      console.warn('Admin audit log read failed:', error)
      return []
    }
  }
  return mem().slice(0, limit)
}
