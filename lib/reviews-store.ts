import { isDatabaseConfigured } from '@/lib/products-store'
import { getUserById } from '@/lib/users-store'

/**
 * Reviews — the trust layer of the marketplace, in BOTH directions:
 *   · 'toOperator': a pescador rates the patrón after a trip.
 *   · 'toAngler':   the patrón rates each pescador who came aboard.
 * Averages are denormalized (Operator.avgRating / User.avgRating) so listings
 * and dashboards stay fast. Eligibility (real customers, past trips) is
 * enforced by the caller. One review per (charter, author, subject).
 */
export type ReviewDirection = 'toOperator' | 'toAngler'

export interface Review {
  id: string
  operatorId: string
  charterId: string
  authorUserId: string
  direction: ReviewDirection
  /** The rated pescador ('toAngler' only); '' when the patrón is rated. */
  subjectUserId: string
  authorName: string
  authorAvatar: string
  rating: number
  text: string
  createdAt: number
}

const WRITE_FAIL = 'No se ha podido guardar tu reseña ahora mismo. Inténtalo de nuevo en unos minutos.'

interface StoredReview {
  id: string; operatorId: string; charterId: string; authorUserId: string
  direction: ReviewDirection; subjectUserId: string; rating: number; text: string; createdAt: number
}
const g = globalThis as unknown as { __pescaplusReviews?: StoredReview[] }
function mem(): StoredReview[] { return (g.__pescaplusReviews ??= []) }

export function validateReview(rating: number): string | null {
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return 'La valoración debe ser de 1 a 5 estrellas.'
  return null
}

async function withAuthor(r: StoredReview): Promise<Review> {
  const author = await getUserById(r.authorUserId)
  return { ...r, authorName: author?.name || 'Pescador', authorAvatar: author?.avatar || '🎣' }
}

/** Recompute the denormalized average for whoever was rated. */
async function recomputeAverage(direction: ReviewDirection, operatorId: string, subjectUserId: string): Promise<void> {
  if (!isDatabaseConfigured()) return // memory: nothing denormalized to persist
  const { prisma } = await import('@/lib/prisma')
  if (direction === 'toOperator') {
    const agg = await prisma.review.aggregate({ where: { operatorId, direction: 'toOperator' }, _avg: { rating: true }, _count: true })
    await prisma.operator.update({
      where: { id: operatorId },
      data: { avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count },
    })
    return
  }
  const agg = await prisma.review.aggregate({ where: { subjectUserId, direction: 'toAngler' }, _avg: { rating: true }, _count: true })
  await prisma.user.update({
    where: { id: subjectUserId },
    data: { avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count },
  })
}

export async function createReview(input: {
  operatorId: string
  charterId: string
  authorUserId: string
  rating: number
  text?: string
  direction?: ReviewDirection
  subjectUserId?: string
}): Promise<Review> {
  const rating = Math.round(input.rating)
  const err = validateReview(rating)
  if (err) throw new Error(err)
  const text = (input.text ?? '').trim().slice(0, 800)
  const direction: ReviewDirection = input.direction === 'toAngler' ? 'toAngler' : 'toOperator'
  const subjectUserId = direction === 'toAngler' ? (input.subjectUserId ?? '') : ''
  if (direction === 'toAngler' && !subjectUserId) throw new Error('Falta el pescador a valorar.')

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const row = await prisma.review.upsert({
        where: { charterId_authorUserId_subjectUserId: { charterId: input.charterId, authorUserId: input.authorUserId, subjectUserId } },
        update: { rating, text, operatorId: input.operatorId, direction },
        create: { operatorId: input.operatorId, charterId: input.charterId, authorUserId: input.authorUserId, direction, subjectUserId, rating, text },
      })
      await recomputeAverage(direction, input.operatorId, subjectUserId)
      return withAuthor({ id: row.id, operatorId: input.operatorId, charterId: input.charterId, authorUserId: input.authorUserId, direction, subjectUserId, rating, text, createdAt: row.createdAt.getTime() })
    } catch (error) {
      console.error('Review write failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const existing = mem().find((r) => r.charterId === input.charterId && r.authorUserId === input.authorUserId && r.subjectUserId === subjectUserId)
  if (existing) { existing.rating = rating; existing.text = text; return withAuthor(existing) }
  const created: StoredReview = { id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, operatorId: input.operatorId, charterId: input.charterId, authorUserId: input.authorUserId, direction, subjectUserId, rating, text, createdAt: Date.now() }
  mem().push(created)
  return withAuthor(created)
}

/** Public reviews of a patrón (pescador→patrón). */
export async function listReviewsForOperator(operatorId: string, limit = 20): Promise<Review[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.review.findMany({ where: { operatorId, direction: 'toOperator' }, orderBy: { createdAt: 'desc' }, take: limit, include: { author: true } })
      return rows.map((r) => ({
        id: r.id, operatorId: r.operatorId, charterId: r.charterId, authorUserId: r.authorUserId,
        direction: 'toOperator' as const, subjectUserId: '',
        authorName: r.author?.name || 'Pescador', authorAvatar: r.author?.avatar || '🎣',
        rating: r.rating, text: r.text, createdAt: r.createdAt.getTime(),
      }))
    } catch (error) { console.warn('Reviews read failed:', error) }
  }
  const rows = mem().filter((r) => r.operatorId === operatorId && r.direction === 'toOperator').sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
  return Promise.all(rows.map(withAuthor))
}

/** Reviews a pescador has received from patrones (their reputation aboard). */
export async function listReviewsForUser(subjectUserId: string, limit = 20): Promise<Review[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.review.findMany({ where: { subjectUserId, direction: 'toAngler' }, orderBy: { createdAt: 'desc' }, take: limit, include: { author: true } })
      return rows.map((r) => ({
        id: r.id, operatorId: r.operatorId, charterId: r.charterId, authorUserId: r.authorUserId,
        direction: 'toAngler' as const, subjectUserId,
        authorName: r.author?.name || 'Patrón', authorAvatar: r.author?.avatar || '⚓',
        rating: r.rating, text: r.text, createdAt: r.createdAt.getTime(),
      }))
    } catch (error) { console.warn('User reviews read failed:', error) }
  }
  const rows = mem().filter((r) => r.subjectUserId === subjectUserId && r.direction === 'toAngler').sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
  return Promise.all(rows.map(withAuthor))
}

/** An author's existing review for a charter+subject (to prefill the form). */
export async function getReview(charterId: string, authorUserId: string, subjectUserId = ''): Promise<Review | null> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const r = await prisma.review.findUnique({ where: { charterId_authorUserId_subjectUserId: { charterId, authorUserId, subjectUserId } } })
      if (!r) return null
      return withAuthor({ id: r.id, operatorId: r.operatorId, charterId: r.charterId, authorUserId, direction: r.direction as ReviewDirection, subjectUserId, rating: r.rating, text: r.text, createdAt: r.createdAt.getTime() })
    } catch { return null }
  }
  const r = mem().find((x) => x.charterId === charterId && x.authorUserId === authorUserId && x.subjectUserId === subjectUserId)
  return r ? withAuthor(r) : null
}

/** Back-compat alias: the pescador's review of the patrón for a charter. */
export async function getUserReviewForCharter(charterId: string, authorUserId: string): Promise<Review | null> {
  return getReview(charterId, authorUserId, '')
}

/** Ratings the patrón already gave on a charter, keyed by pescador id. */
export async function anglerRatingsForCharter(charterId: string, authorUserId: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.review.findMany({ where: { charterId, authorUserId, direction: 'toAngler' } })
      for (const r of rows) out[r.subjectUserId] = r.rating
      return out
    } catch (error) { console.warn('Angler ratings read failed:', error) }
  }
  for (const r of mem()) {
    if (r.charterId === charterId && r.authorUserId === authorUserId && r.direction === 'toAngler') out[r.subjectUserId] = r.rating
  }
  return out
}
