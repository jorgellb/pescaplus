import { NextRequest, NextResponse } from 'next/server'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { adminListReviews } from '@/lib/reviews-store'
import { listOperators } from '@/lib/operators-store'
import { getUserById } from '@/lib/users-store'

export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const reviews = await adminListReviews()

  const operators = await listOperators()
  const opNames = new Map(operators.map((o) => [o.id, o.businessName || o.name]))

  const subjectIds = [...new Set(reviews.filter((r) => r.direction === 'toAngler' && r.subjectUserId).map((r) => r.subjectUserId))]
  const subjects = await Promise.all(subjectIds.map((id) => getUserById(id)))
  const subjectNames = new Map(subjectIds.map((id, i) => [id, subjects[i]?.name || subjects[i]?.email || id]))

  const enriched = reviews.map((r) => ({
    ...r,
    operatorName: opNames.get(r.operatorId) || r.operatorId,
    subjectName: r.direction === 'toAngler' ? (subjectNames.get(r.subjectUserId) || r.subjectUserId) : '',
  }))
  return NextResponse.json({ success: true, reviews: enriched })
}
