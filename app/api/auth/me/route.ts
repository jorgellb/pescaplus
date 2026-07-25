import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ user: null })
  return NextResponse.json({ user: { name: user.name, avatar: user.avatar || '🎣' } })
}
