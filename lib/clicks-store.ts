import { isDatabaseConfigured } from '@/lib/products-store'

/**
 * Affiliate click tracking. Every visit to /go/[id] records a click so the admin
 * can see what actually converts. Uses the database when configured, otherwise an
 * in-memory ring buffer (fine for local/demo; resets with the server process).
 */

export interface ClickInput {
  productId: string
  productTitle: string
  typeFishing: string
}

interface ClickEvent extends ClickInput {
  at: number
}

export interface ClickStats {
  total: number
  last7: number
  windowDays: number
  byProduct: { productId: string; title: string; count: number }[]
  byCategory: { typeFishing: string; count: number }[]
  byDay: { date: string; count: number }[]
}

const WINDOW_DAYS = 30
const DAY = 86_400_000

const globalForClicks = globalThis as unknown as {
  __pescaplusClicks?: { events: ClickEvent[]; total: number }
}
function memory() {
  if (!globalForClicks.__pescaplusClicks) globalForClicks.__pescaplusClicks = { events: [], total: 0 }
  return globalForClicks.__pescaplusClicks
}

export async function recordClick(input: ClickInput): Promise<void> {
  const clean: ClickInput = {
    productId: input.productId.slice(0, 120),
    productTitle: (input.productTitle || '').slice(0, 200),
    typeFishing: (input.typeFishing || '').slice(0, 40),
  }
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.productClick.create({ data: clean })
      return
    } catch (error) {
      console.warn('Click DB write failed, using in-memory store:', error)
    }
  }
  const store = memory()
  store.events.push({ ...clean, at: Date.now() })
  store.total++
  if (store.events.length > 5000) store.events.splice(0, store.events.length - 5000)
}

function aggregate(events: ClickEvent[], total: number): ClickStats {
  const now = Date.now()
  const since7 = now - 7 * DAY

  const products = new Map<string, { title: string; count: number }>()
  const categories = new Map<string, number>()
  const days = new Map<string, number>()
  let last7 = 0

  for (const e of events) {
    if (e.at >= since7) last7++
    const p = products.get(e.productId) ?? { title: e.productTitle, count: 0 }
    p.count++
    if (e.productTitle) p.title = e.productTitle
    products.set(e.productId, p)
    categories.set(e.typeFishing, (categories.get(e.typeFishing) ?? 0) + 1)
    const key = new Date(e.at).toISOString().slice(0, 10)
    days.set(key, (days.get(key) ?? 0) + 1)
  }

  const byProduct = [...products.entries()]
    .map(([productId, v]) => ({ productId, title: v.title, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const byCategory = [...categories.entries()]
    .map(([typeFishing, count]) => ({ typeFishing, count }))
    .sort((a, b) => b.count - a.count)

  const byDay: ClickStats['byDay'] = []
  for (let i = 13; i >= 0; i--) {
    const key = new Date(now - i * DAY).toISOString().slice(0, 10)
    byDay.push({ date: key, count: days.get(key) ?? 0 })
  }

  return { total, last7, windowDays: WINDOW_DAYS, byProduct, byCategory, byDay }
}

export async function getClickStats(): Promise<ClickStats> {
  const since = new Date(Date.now() - WINDOW_DAYS * DAY)
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const total = await prisma.productClick.count()
      const rows = await prisma.productClick.findMany({
        where: { createdAt: { gte: since } },
        select: { productId: true, productTitle: true, typeFishing: true, createdAt: true },
        take: 20000,
      })
      const events = rows.map((r) => ({
        productId: r.productId,
        productTitle: r.productTitle,
        typeFishing: r.typeFishing,
        at: r.createdAt.getTime(),
      }))
      return aggregate(events, total)
    } catch (error) {
      console.warn('Click stats DB read failed, using in-memory store:', error)
    }
  }
  const store = memory()
  const events = store.events.filter((e) => e.at >= since.getTime())
  return aggregate(events, store.total)
}
