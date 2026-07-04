import { NextRequest, NextResponse } from 'next/server'
import { searchProducts, getAffiliateLink } from '@/lib/aliexpress'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword')
    const page = parseInt(searchParams.get('page') || '1')

    if (!keyword) {
      return NextResponse.json(
        { success: false, error: 'Keyword required' },
        { status: 400 }
      )
    }

    const results = await searchProducts(keyword, page, 20)
    
    const products = await Promise.all(
      results?.data?.productList?.slice(0, 10).map(async (product: any) => {
        const affiliateUrl = await getAffiliateLink(product.productId)
        return {
          id: product.productId,
          title: product.productTitle,
          imageUrl: product.productImage,
          price: product.minPrice,
          currency: product.currency,
          affiliateUrl: affiliateUrl || '',
          rating: product.avgRating,
          reviews: product.totalReviews,
        }
      }) || []
    )

    return NextResponse.json({ success: true, products })
  } catch (error) {
    console.error('Error in AliExpress API:', error)
    return NextResponse.json(
      { success: false, error: 'Error connecting to AliExpress' },
      { status: 500 }
    )
  }
}