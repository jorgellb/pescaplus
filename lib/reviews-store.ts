import { isDatabaseConfigured } from '@/lib/products-store'
import { getUserById } from '@/lib/users-store'

/**
 * Reviews — the trust layer of the marketplace, in BOTH directions:
 *   · 'toOperator': a pescador rates the patrón after a trip.
 *   · 'toAngler':   the patrón rates each pescador who came aboard.
 *
 * DOUBLE BLIND: a review stays hidden until the other party has also reviewed
 * that trip, or REVIEW_BLIND_DAYS pass — so nobody can retaliate after reading
 * what was said about them. Hidden reviews are excluded from listings AND from
 * the denormalized averages (otherwise a moving average would leak them).
 * Authors always see their own review, published or not.
 *
 * Averages live on Operator.avgRating / User.avgRating so listings stay fast.
 * Eligibility (real customers, past trips) is enforced by the caller. One
 * review per (charter, author, subject).
 */
export type ReviewDirection = 'toOperator' | 'toAngler'

/** Days after which an unanswered review is published anyway. */
export const REVIEW_BLIND_DAYS = 14
const BLIND_MS = REVIEW_BLIND_DAYS * 24 * 60 * 60 * 1000

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
  /** When it became public; null while still blind. */
  publishedAt: number | null
  /** True while hidden from the other party (double blind). */
  pending: boolean
  createdAt: number
}

const WRITE_FAIL = 'No se ha podido guardar tu reseña ahora mismo. Inténtalo de nuevo en unos minutos.'

interface StoredReview {
  id: string; operatorId: string; charterId: string; authorUserId: string
  direction: ReviewDirection; subjectUserId: string; rating: number; text: string
  publishedAt: number | null; createdAt: number
}
const g = globalThis as unknown as { __pescaplusReviews?: StoredReview[] }
function mem(): StoredReview[] { return (g.__pescaplusReviews ??= []) }

export function validateReview(rating: number): string | null {
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return 'La valoración debe ser de 1 a 5 estrellas.'
  return null
}

/** Prisma filter for reviews the public may see (published or past the deadline). */
function visibleWhere() {
  return { OR: [{ publishedAt: { not: null } }, { createdAt: { lte: new Date(Date.now() - BLIND_MS) } }] }
}
function isVisible(r: { publishedAt: number | null; createdAt: number }): boolean {
  return r.publishedAt !== null || r.createdAt <= Date.now() - BLIND_MS
}

async function withAuthor(r: StoredReview): Promise<Review> {
  const author = await getUserById(r.authorUserId)
  const fallbackName = r.direction === 'toAngler' ? 'Patrón' : 'Pescador'
  const fallbackAvatar = r.direction === 'toAngler' ? '⚓' : '🎣'
  return {
    ...r,
    authorName: author?.name || fallbackName,
    authorAvatar: author?.avatar || fallbackAvatar,
    pending: !isVisible(r),
  }
}

/**
 * Recompute a denormalized average from VISIBLE reviews only. Counting hidden
 * ones would betray the blind: the rated party would see their average move.
 */
async function recomputeAverage(direction: ReviewDirection, operatorId: string, subjectUserId: string): Promise<void> {
  if (!isDatabaseConfigured()) return // memory: nothing denormalized to persist
  const { prisma } = await import('@/lib/prisma')
  if (direction === 'toOperator') {
    const agg = await prisma.review.aggregate({ where: { operatorId, direction: 'toOperator', ...visibleWhere() }, _avg: { rating: true }, _count: true })
    await prisma.operator.update({
      where: { id: operatorId },
      data: { avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count },
    })
    return
  }
  if (!subjectUserId) return
  const agg = await prisma.review.aggregate({ where: { subjectUserId, direction: 'toAngler', ...visibleWhere() }, _avg: { rating: true }, _count: true })
  await prisma.user.update({
    where: { id: subjectUserId },
    data: { avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count },
  })
}

/**
 * The counterpart of a review about the same trip: the pescador's review of the
 * patrón pairs with the patrón's review of that same pescador.
 */
function counterpartKey(r: { direction: ReviewDirection; authorUserId: string; subjectUserId: string }) {
  return r.direction === 'toOperator'
    ? { direction: 'toAngler' as const, subjectUserId: r.authorUserId }
    : { direction: 'toOperator' as const, authorUserId: r.subjectUserId }
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
  const anglerId = direction === 'toAngler' ? subjectUserId : input.authorUserId

  if (isDatabaseConfigured()) {
    const { prisma } = await import('@/lib/prisma')
    try {
      const row = await prisma.review.upsert({
        where: { charterId_authorUserId_subjectUserId: { charterId: input.charterId, authorUserId: input.authorUserId, subjectUserId } },
        update: { rating, text, operatorId: input.operatorId, direction },
        create: { operatorId: input.operatorId, charterId: input.charterId, authorUserId: input.authorUserId, direction, subjectUserId, rating, text },
      })

      // ¿Ya valoró la otra parte esta salida? Entonces se publican las dos.
      const cp = counterpartKey({ direction, authorUserId: input.authorUserId, subjectUserId })
      const counterpart = await prisma.review.findFirst({ where: { charterId: input.charterId, ...cp } })
      let publishedAt = row.publishedAt
      if (counterpart) {
        const now = new Date()
        await prisma.review.updateMany({ where: { id: { in: [row.id, counterpart.id] }, publishedAt: null }, data: { publishedAt: now } })
        publishedAt = row.publishedAt ?? now
      }

      // Solo cambian medias visibles: la propia y, si se publicó el par, la otra.
      await recomputeAverage(direction, input.operatorId, subjectUserId)
      if (counterpart) await recomputeAverage(cp.direction, input.operatorId, anglerId)

      return withAuthor({ id: row.id, operatorId: input.operatorId, charterId: input.charterId, authorUserId: input.authorUserId, direction, subjectUserId, rating, text, publishedAt: publishedAt ? publishedAt.getTime() : null, createdAt: row.createdAt.getTime() })
    } catch (error) {
      console.error('Review write failed:', error)
      throw new Error(WRITE_FAIL)
    }
  }

  const existing = mem().find((r) => r.charterId === input.charterId && r.authorUserId === input.authorUserId && r.subjectUserId === subjectUserId)
  const stored: StoredReview = existing ?? {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    operatorId: input.operatorId, charterId: input.charterId, authorUserId: input.authorUserId,
    direction, subjectUserId, rating, text, publishedAt: null, createdAt: Date.now(),
  }
  stored.rating = rating
  stored.text = text
  if (!existing) mem().push(stored)

  const cp = counterpartKey({ direction, authorUserId: input.authorUserId, subjectUserId })
  const counterpart = mem().find((r) => r.charterId === input.charterId && r.direction === cp.direction
    && ('subjectUserId' in cp ? r.subjectUserId === cp.subjectUserId : r.authorUserId === cp.authorUserId))
  if (counterpart) {
    const now = Date.now()
    stored.publishedAt ??= now
    counterpart.publishedAt ??= now
  }
  return withAuthor(stored)
}

/** Public reviews of a patrón (pescador→patrón), blind ones excluded. */
export async function listReviewsForOperator(operatorId: string, limit = 20): Promise<Review[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.review.findMany({ where: { operatorId, direction: 'toOperator', ...visibleWhere() }, orderBy: { createdAt: 'desc' }, take: limit, include: { author: true } })
      return rows.map((r) => ({
        id: r.id, operatorId: r.operatorId, charterId: r.charterId, authorUserId: r.authorUserId,
        direction: 'toOperator' as const, subjectUserId: '',
        authorName: r.author?.name || 'Pescador', authorAvatar: r.author?.avatar || '🎣',
        rating: r.rating, text: r.text,
        publishedAt: r.publishedAt ? r.publishedAt.getTime() : null, pending: false,
        createdAt: r.createdAt.getTime(),
      }))
    } catch (error) { console.warn('Reviews read failed:', error) }
  }
  const rows = mem().filter((r) => r.operatorId === operatorId && r.direction === 'toOperator' && isVisible(r)).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
  return Promise.all(rows.map(withAuthor))
}

/** Reviews a pescador has received from patrones, blind ones excluded. */
export async function listReviewsForUser(subjectUserId: string, limit = 20): Promise<Review[]> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.review.findMany({ where: { subjectUserId, direction: 'toAngler', ...visibleWhere() }, orderBy: { createdAt: 'desc' }, take: limit, include: { author: true } })
      return rows.map((r) => ({
        id: r.id, operatorId: r.operatorId, charterId: r.charterId, authorUserId: r.authorUserId,
        direction: 'toAngler' as const, subjectUserId,
        authorName: r.author?.name || 'Patrón', authorAvatar: r.author?.avatar || '⚓',
        rating: r.rating, text: r.text,
        publishedAt: r.publishedAt ? r.publishedAt.getTime() : null, pending: false,
        createdAt: r.createdAt.getTime(),
      }))
    } catch (error) { console.warn('User reviews read failed:', error) }
  }
  const rows = mem().filter((r) => r.subjectUserId === subjectUserId && r.direction === 'toAngler' && isVisible(r)).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
  return Promise.all(rows.map(withAuthor))
}

/**
 * An author's own review for a charter+subject (to prefill their form). NOT
 * filtered by visibility — you can always see what you wrote.
 */
export async function getReview(charterId: string, authorUserId: string, subjectUserId = ''): Promise<Review | null> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const r = await prisma.review.findUnique({ where: { charterId_authorUserId_subjectUserId: { charterId, authorUserId, subjectUserId } } })
      if (!r) return null
      return withAuthor({ id: r.id, operatorId: r.operatorId, charterId: r.charterId, authorUserId, direction: r.direction as ReviewDirection, subjectUserId, rating: r.rating, text: r.text, publishedAt: r.publishedAt ? r.publishedAt.getTime() : null, createdAt: r.createdAt.getTime() })
    } catch { return null }
  }
  const r = mem().find((x) => x.charterId === charterId && x.authorUserId === authorUserId && x.subjectUserId === subjectUserId)
  return r ? withAuthor(r) : null
}

/** Back-compat alias: the pescador's own review of the patrón for a charter. */
export async function getUserReviewForCharter(charterId: string, authorUserId: string): Promise<Review | null> {
  return getReview(charterId, authorUserId, '')
}

export interface GivenRating { rating: number; pending: boolean }

/** Ratings the patrón already gave on a charter, keyed by pescador id (own view). */
export async function anglerRatingsForCharter(charterId: string, authorUserId: string): Promise<Record<string, GivenRating>> {
  const out: Record<string, GivenRating> = {}
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const rows = await prisma.review.findMany({ where: { charterId, authorUserId, direction: 'toAngler' } })
      for (const r of rows) {
        out[r.subjectUserId] = { rating: r.rating, pending: !isVisible({ publishedAt: r.publishedAt ? r.publishedAt.getTime() : null, createdAt: r.createdAt.getTime() }) }
      }
      return out
    } catch (error) { console.warn('Angler ratings read failed:', error) }
  }
  for (const r of mem()) {
    if (r.charterId === charterId && r.authorUserId === authorUserId && r.direction === 'toAngler') out[r.subjectUserId] = { rating: r.rating, pending: !isVisible(r) }
  }
  return out
}

/**
 * Publish reviews whose blind period expired without an answer, and refresh the
 * averages they now affect. Runs from the daily cron: visibility itself is
 * computed on read, so this only keeps the denormalized averages in step.
 */
export async function publishDueReviews(): Promise<number> {
  if (!isDatabaseConfigured()) {
    let n = 0
    for (const r of mem()) if (r.publishedAt === null && r.createdAt <= Date.now() - BLIND_MS) { r.publishedAt = Date.now(); n += 1 }
    return n
  }
  const { prisma } = await import('@/lib/prisma')
  const cutoff = new Date(Date.now() - BLIND_MS)
  const due = await prisma.review.findMany({ where: { publishedAt: null, createdAt: { lte: cutoff } }, take: 500 })
  if (due.length === 0) return 0
  await prisma.review.updateMany({ where: { id: { in: due.map((r) => r.id) } }, data: { publishedAt: new Date() } })

  // Recalcular solo lo afectado (operadores y pescadores distintos).
  const operators = new Set<string>()
  const anglers = new Set<string>()
  for (const r of due) {
    if (r.direction === 'toAngler') anglers.add(r.subjectUserId)
    else operators.add(r.operatorId)
  }
  for (const id of operators) await recomputeAverage('toOperator', id, '')
  for (const id of anglers) await recomputeAverage('toAngler', '', id)
  return due.length
}
