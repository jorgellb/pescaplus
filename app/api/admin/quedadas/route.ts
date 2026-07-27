import { NextRequest, NextResponse } from 'next/server'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { adminListMeetups } from '@/lib/meetups-store'

export async function GET(request: NextRequest) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const meetups = await adminListMeetups()
  return NextResponse.json({ success: true, meetups })
}
