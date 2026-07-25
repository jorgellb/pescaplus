import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getOperatorByUser } from '@/lib/operators-store'
import { getThread, markThreadRead, roleInThread } from '@/lib/messages-store'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false }, { status: 401 })
  const { id } = await params
  const thread = await getThread(id)
  if (!thread) return NextResponse.json({ success: false }, { status: 404 })
  const owned = await getOperatorByUser(user.id)
  const role = roleInThread(thread, user.id, owned?.id)
  if (!role) return NextResponse.json({ success: false }, { status: 403 })
  await markThreadRead(id, role)
  return NextResponse.json({ success: true })
}
