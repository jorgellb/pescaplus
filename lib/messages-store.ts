import { isDatabaseConfigured } from '@/lib/products-store'

/**
 * In-app messaging between a pescador and a patrón about a specific charter.
 * One thread per (charter, pescador). Each side has an unread counter for the
 * inbox badge. Messaging is an account feature: both parties act while logged
 * in (the patrón through their linked Operator). DB-backed with a memory
 * fallback; writes never silently fall back to memory when a DB is configured.
 */
export type Role = 'user' | 'operator'

export interface Message {
  id: string
  threadId: string
  sender: Role
  body: string
  createdAt: number
}

export interface Thread {
  id: string
  charterId: string
  operatorId: string
  userId: string
  lastMessageAt: number
  unreadUser: number
  unreadOperator: number
  createdAt: number
}

/** A thread as seen from one account's perspective (for the inbox). */
export interface InboxThread {
  id: string
  charterId: string
  role: Role
  otherId: string
  lastBody: string
  lastAt: number
  unread: number
}

const WRITE_FAIL = 'No se ha podido enviar el mensaje ahora mismo. Inténtalo de nuevo en unos minutos.'

const g = globalThis as unknown as { __pescaplusThreads?: Thread[]; __pescaplusMessages?: Message[] }
function memT(): Thread[] { return (g.__pescaplusThreads ??= []) }
function memM(): Message[] { return (g.__pescaplusMessages ??= []) }

function threadFromRow(row: any): Thread {
  return {
    id: row.id,
    charterId: row.charterId,
    operatorId: row.operatorId,
    userId: row.userId,
    lastMessageAt: row.lastMessageAt instanceof Date ? row.lastMessageAt.getTime() : row.lastMessageAt,
    unreadUser: row.unreadUser ?? 0,
    unreadOperator: row.unreadOperator ?? 0,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt,
  }
}
function messageFromRow(row: any): Message {
  return { id: row.id, threadId: row.threadId, sender: row.sender, body: row.body, createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt }
}

/** Find or create the thread for (charter, pescador). operatorId comes from the charter. */
export async function getOrCreateThread(charterId: string, operatorId: string, userId: string): Promise<Thread> {
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const row = await prisma.thread.upsert({
        where: { charterId_userId: { charterId, userId } },
        update: {},
        create: { charterId, operatorId, userId },
      })
      return threadFromRow(row)
    } catch (error) {
      console.error('Thread upsert failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const existing = memT().find((t) => t.charterId === charterId && t.userId === userId)
  if (existing) return existing
  const now = Date.now()
  const t: Thread = { id: `th-${now}-${Math.random().toString(36).slice(2, 8)}`, charterId, operatorId, userId, lastMessageAt: now, unreadUser: 0, unreadOperator: 0, createdAt: now }
  memT().unshift(t)
  return t
}

export async function getThread(threadId: string): Promise<Thread | null> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.thread.findUnique({ where: { id: threadId } })
      return row ? threadFromRow(row) : null
    } catch (error) { console.warn('Thread read failed:', error) }
  }
  return memT().find((t) => t.id === threadId) ?? null
}

export async function listMessages(threadId: string, limit = 200): Promise<Message[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.message.findMany({ where: { threadId }, orderBy: { createdAt: 'asc' }, take: limit })
      return rows.map(messageFromRow)
    } catch (error) { console.warn('Messages read failed:', error) }
  }
  return memM().filter((m) => m.threadId === threadId).sort((a, b) => a.createdAt - b.createdAt).slice(0, limit)
}

/** Resolve this account's role in a thread (or null if it isn't a party). */
export function roleInThread(thread: Thread, userId: string, ownedOperatorId?: string | null): Role | null {
  if (thread.userId === userId) return 'user'
  if (ownedOperatorId && thread.operatorId === ownedOperatorId) return 'operator'
  return null
}

export async function postMessage(threadId: string, sender: Role, body: string): Promise<Message> {
  const text = (body ?? '').trim().slice(0, 2000)
  if (!text) throw new Error('El mensaje está vacío.')
  const now = Date.now()
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const [msg] = await prisma.$transaction([
        prisma.message.create({ data: { threadId, sender, body: text } }),
        prisma.thread.update({
          where: { id: threadId },
          data: { lastMessageAt: new Date(now), ...(sender === 'user' ? { unreadOperator: { increment: 1 } } : { unreadUser: { increment: 1 } }) },
        }),
      ])
      return messageFromRow(msg)
    } catch (error) {
      console.error('Message write failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const m: Message = { id: `msg-${now}-${Math.random().toString(36).slice(2, 6)}`, threadId, sender, body: text, createdAt: now }
  memM().push(m)
  const t = memT().find((x) => x.id === threadId)
  if (t) { t.lastMessageAt = now; if (sender === 'user') t.unreadOperator += 1; else t.unreadUser += 1 }
  return m
}

/** Mark a thread read for one side (resets its unread counter). */
export async function markThreadRead(threadId: string, side: Role): Promise<void> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.thread.update({ where: { id: threadId }, data: side === 'user' ? { unreadUser: 0 } : { unreadOperator: 0 } })
      return
    } catch (error) { console.warn('Mark read failed:', error) }
  }
  const t = memT().find((x) => x.id === threadId)
  if (t) { if (side === 'user') t.unreadUser = 0; else t.unreadOperator = 0 }
}

/** Combined inbox for an account: its pescador threads + (if patrón) its operator threads. */
export async function listInbox(userId: string, ownedOperatorId?: string | null): Promise<InboxThread[]> {
  let threads: Thread[] = []
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.thread.findMany({
        where: { OR: [{ userId }, ...(ownedOperatorId ? [{ operatorId: ownedOperatorId }] : [])] },
        orderBy: { lastMessageAt: 'desc' },
        take: 100,
      })
      threads = rows.map(threadFromRow)
    } catch (error) { console.warn('Inbox read failed:', error) }
  } else {
    threads = memT().filter((t) => t.userId === userId || (ownedOperatorId && t.operatorId === ownedOperatorId)).sort((a, b) => b.lastMessageAt - a.lastMessageAt)
  }
  const out: InboxThread[] = []
  for (const t of threads) {
    const role: Role = t.userId === userId ? 'user' : 'operator'
    const msgs = await listMessages(t.id)
    const last = msgs[msgs.length - 1]
    out.push({
      id: t.id,
      charterId: t.charterId,
      role,
      otherId: role === 'user' ? t.operatorId : t.userId,
      lastBody: last?.body ?? '',
      lastAt: last?.createdAt ?? t.createdAt,
      unread: role === 'user' ? t.unreadUser : t.unreadOperator,
    })
  }
  return out
}

/** Total unread messages across an account's threads (for the nav badge). */
export async function unreadCount(userId: string, ownedOperatorId?: string | null): Promise<number> {
  const inbox = await listInbox(userId, ownedOperatorId)
  return inbox.reduce((s, t) => s + t.unread, 0)
}
