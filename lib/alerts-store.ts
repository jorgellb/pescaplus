import { isDatabaseConfigured } from '@/lib/products-store'

/**
 * Window-alert subscriptions ("avísame cuando haya ventana excelente en X").
 * Database when configured, in-memory otherwise (demo). Sending happens in the
 * cron route and requires RESEND_API_KEY; storage works without it, so signups
 * are never lost while the email provider is being set up.
 */
export interface AlertSubscription {
  id: string
  email: string
  spotSlug: string
  especie: string
  threshold: number
}

const globalForAlerts = globalThis as unknown as { __pescaplusAlerts?: AlertSubscription[] }
function memory() {
  if (!globalForAlerts.__pescaplusAlerts) globalForAlerts.__pescaplusAlerts = []
  return globalForAlerts.__pescaplusAlerts
}

export async function subscribeAlert(input: { email: string; spotSlug: string; especie?: string; threshold?: number }): Promise<void> {
  const data = {
    email: input.email.trim().toLowerCase().slice(0, 160),
    spotSlug: input.spotSlug.slice(0, 80),
    especie: (input.especie ?? '').slice(0, 40),
    threshold: Math.min(95, Math.max(50, input.threshold ?? 75)),
  }
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.alertSubscription.upsert({
        where: { email_spotSlug: { email: data.email, spotSlug: data.spotSlug } },
        update: { especie: data.especie, threshold: data.threshold },
        create: data,
      })
      return
    } catch (error) {
      console.warn('Alert DB write failed, using memory:', error)
    }
  }
  const store = memory()
  const existing = store.find((s) => s.email === data.email && s.spotSlug === data.spotSlug)
  if (existing) Object.assign(existing, data)
  else store.push({ id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...data })
}

export async function listAlerts(): Promise<AlertSubscription[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      return await prisma.alertSubscription.findMany({ take: 5000 })
    } catch (error) {
      console.warn('Alert DB read failed, using memory:', error)
    }
  }
  return [...memory()]
}

export async function removeAlert(id: string): Promise<boolean> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.alertSubscription.delete({ where: { id } })
      return true
    } catch {
      return false
    }
  }
  const store = memory()
  const idx = store.findIndex((s) => s.id === id)
  if (idx === -1) return false
  store.splice(idx, 1)
  return true
}
