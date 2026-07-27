import { NextRequest, NextResponse } from 'next/server'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { adminDeleteReview } from '@/lib/reviews-store'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isRequestAuthenticated(request)) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const removed = await adminDeleteReview(id)
  if (!removed) return NextResponse.json({ success: false, error: 'Reseña no encontrada.' }, { status: 404 })
  return NextResponse.json({ success: true })
}
