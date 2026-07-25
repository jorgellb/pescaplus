import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getOperatorByUser } from '@/lib/operators-store'
import { unreadCount } from '@/lib/messages-store'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ user: null })
  const owned = await getOperatorByUser(user.id)
  const unread = await unreadCount(user.id, owned?.id)
  return NextResponse.json({ user: { name: user.name, avatar: user.avatar || '🎣', unread } })
}
