import { NextRequest, NextResponse } from 'next/server'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { adminListMeetups } from '@/lib/meetups-store'

export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const { searchParams } = request.nextUrl
  const q = searchParams.get('q') ?? undefined
  const offset = Number(searchParams.get('offset')) || 0
  const limit = Number(searchParams.get('limit')) || undefined
  const { meetups, total, hasMore } = await adminListMeetups({ q, offset, limit })
  return NextResponse.json({ success: true, meetups, total, hasMore })
}
