import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserFromRequest } from '@/lib/auth'
import { updateUserProfile } from '@/lib/users-store'

const schema = z.object({
  name: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  bio: z.string().max(600).optional(),
  avatar: z.string().max(8).optional(),
})

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Debes iniciar sesión.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Revisa los datos.' }, { status: 400 })
  try {
    const updated = await updateUserProfile(user.id, parsed.data)
    return NextResponse.json({ success: true, user: updated })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
