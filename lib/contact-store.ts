import { isDatabaseConfigured } from '@/lib/products-store'

/**
 * Contact form messages. Persists to the database when configured, otherwise an
 * in-memory buffer (fine for local/demo; resets with the server process).
 */
export interface ContactInput {
  name: string
  email: string
  subject: string
  message: string
}

export interface ContactMessage extends ContactInput {
  id: string
  handled: boolean
  createdAt: number
}

const globalForContact = globalThis as unknown as {
  __pescaplusContact?: ContactMessage[]
}
function memory() {
  if (!globalForContact.__pescaplusContact) globalForContact.__pescaplusContact = []
  return globalForContact.__pescaplusContact
}

function clean(input: ContactInput): ContactInput {
  return {
    name: (input.name || '').trim().slice(0, 120),
    email: (input.email || '').trim().slice(0, 160),
    subject: (input.subject || '').trim().slice(0, 160),
    message: (input.message || '').trim().slice(0, 4000),
  }
}

export async function saveContactMessage(input: ContactInput): Promise<void> {
  const data = clean(input)
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.contactMessage.create({ data })
      return
    } catch (error) {
      console.warn('Contact DB write failed, using in-memory store:', error)
    }
  }
  const store = memory()
  store.push({ ...data, id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, handled: false, createdAt: Date.now() })
  if (store.length > 2000) store.splice(0, store.length - 2000)
}

export async function listContactMessages(limit = 200): Promise<ContactMessage[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        subject: r.subject,
        message: r.message,
        handled: r.handled,
        createdAt: r.createdAt.getTime(),
      }))
    } catch (error) {
      console.warn('Contact DB read failed, using in-memory store:', error)
    }
  }
  return [...memory()].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
}
