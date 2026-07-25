import { isDatabaseConfigured } from '@/lib/products-store'
import { getUserById } from '@/lib/users-store'

/**
 * Reviews — a pescador rates a patrón after a completed charter (1–5 ★ + text).
 * This is the trust layer of the marketplace. The operator's average is
 * denormalized onto Operator (avgRating/reviewCount) so listings stay fast.
 * Eligibility (only real customers, only past trips) is enforced by the caller.
 */
export interface Review {
  id: string
  operatorId: string
  charterId: string
  authorUserId: string
  authorName: string
  authorAvatar: string
  rating: number
  text: string
  createdAt: number
}

const WRITE_FAIL = 'No se ha podido guardar tu reseña ahora mismo. Inténtalo de nuevo en unos minutos.'

interface StoredReview { id: string; operatorId: string; charterId: string; authorUserId: string; rating: number; text: string; createdAt: number }
const g = globalThis as unknown as { __pescaplusReviews?: StoredReview[] }
function mem(): StoredReview[] { return (g.__pescaplusReviews ??= []) }

export function validateReview(rating: number): string | null {
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return 'La valoración debe ser de 1 a 5 estrellas.'
  return null
}

async function recomputeOperatorRating(operatorId: string): Promise<void> {
  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    const agg = await prisma.review.aggregate({ where: { operatorId }, _avg: { rating: true }, _count: true })
    await prisma.operator.update({
      where: { id: operatorId },
      data: { avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count },
    })
    return
  }
  // memory: nothing denormalized to persist beyond the review list.
}

export async function createReview(input: { operatorId: string; charterId: string; authorUserId: string; rating: number; text?: string }): Promise<Review> {
  const rating = Math.round(input.rating)
  const err = validateReview(rating)
  if (err) throw new Error(err)
  const text = (input.text ?? '').trim().slice(0, 800)

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const row = await prisma.review.upsert({
        where: { charterId_authorUserId: { charterId: input.charterId, authorUserId: input.authorUserId } },
        update: { rating, text, operatorId: input.operatorId },
        create: { operatorId: input.operatorId, charterId: input.charterId, authorUserId: input.authorUserId, rating, text },
      })
      await recomputeOperatorRating(input.operatorId)
      const author = await getUserById(input.authorUserId)
      return { id: row.id, operatorId: input.operatorId, charterId: input.charterId, authorUserId: input.authorUserId, authorName: author?.name || 'Pescador', authorAvatar: author?.avatar || '🎣', rating, text, createdAt: row.createdAt.getTime() }
    } catch (error) {
      console.error('Review write failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }
  const existing = mem().find((r) => r.charterId === input.charterId && r.authorUserId === input.authorUserId)
  if (existing) { existing.rating = rating; existing.text = text }
  else mem().push({ id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, operatorId: input.operatorId, charterId: input.charterId, authorUserId: input.authorUserId, rating, text, createdAt: Date.now() })
  const author = await getUserById(input.authorUserId)
  const r = mem().find((x) => x.charterId === input.charterId && x.authorUserId === input.authorUserId)!
  return { ...r, authorName: author?.name || 'Pescador', authorAvatar: author?.avatar || '🎣' }
}

export async function listReviewsForOperator(operatorId: string, limit = 20): Promise<Review[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.review.findMany({ where: { operatorId }, orderBy: { createdAt: 'desc' }, take: limit, include: { author: true } })
      return rows.map((r) => ({ id: r.id, operatorId: r.operatorId, charterId: r.charterId, authorUserId: r.authorUserId, authorName: r.author?.name || 'Pescador', authorAvatar: r.author?.avatar || '🎣', rating: r.rating, text: r.text, createdAt: r.createdAt.getTime() }))
    } catch (error) {
      console.warn('Reviews read failed:', error)
    }
  }
  const rows = mem().filter((r) => r.operatorId === operatorId).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
  return Promise.all(rows.map(async (r) => {
    const author = await getUserById(r.authorUserId)
    return { ...r, authorName: author?.name || 'Pescador', authorAvatar: author?.avatar || '🎣' }
  }))
}

/** The review this user already left for a charter (to prefill the form), if any. */
export async function getUserReviewForCharter(charterId: string, authorUserId: string): Promise<Review | null> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const r = await prisma.review.findUnique({ where: { charterId_authorUserId: { charterId, authorUserId } } })
      if (!r) return null
      const author = await getUserById(authorUserId)
      return { id: r.id, operatorId: r.operatorId, charterId: r.charterId, authorUserId, authorName: author?.name || 'Pescador', authorAvatar: author?.avatar || '🎣', rating: r.rating, text: r.text, createdAt: r.createdAt.getTime() }
    } catch { return null }
  }
  const r = mem().find((x) => x.charterId === charterId && x.authorUserId === authorUserId)
  if (!r) return null
  const author = await getUserById(authorUserId)
  return { ...r, authorName: author?.name || 'Pescador', authorAvatar: author?.avatar || '🎣' }
}
