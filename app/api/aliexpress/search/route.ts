import { NextRequest, NextResponse } from 'next/server'
import { isAliExpressConfigured, searchAliExpressProducts } from '@/lib/aliexpress'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword')?.trim()
    const page = Number.parseInt(searchParams.get('page') || '1', 10)
    const typeFishing = searchParams.get('typeFishing') || 'general'

    if (!keyword) {
      return NextResponse.json(
        { success: false, error: 'Keyword required' },
        { status: 400 },
      )
    }

    if (!isAliExpressConfigured()) {
      return NextResponse.json(
        { success: false, error: 'AliExpress API is not configured' },
        { status: 503 },
      )
    }

    const products = await searchAliExpressProducts(keyword, typeFishing, page)
    return NextResponse.json({ success: true, products })
  } catch (error) {
    console.error('Error in AliExpress API:', error)
    return NextResponse.json(
      { success: false, error: 'Error connecting to AliExpress' },
      { status: 500 },
    )
  }
}
