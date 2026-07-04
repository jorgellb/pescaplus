import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { searchProducts, getAffiliateLink } from '@/lib/aliexpress'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const typeFishing = searchParams.get('typeFishing')
    const page = parseInt(searchParams.get('page') || '1')
    const search = searchParams.get('search')

    if (search) {
      const aliexpressProducts = await searchProducts(search, page, 20)
      
      const products = await Promise.all(
        aliexpressProducts?.data?.productList?.slice(0, 10).map(async (product: any) => {
          const affiliateUrl = await getAffiliateLink(product.productId)
          
          const existingProduct = await prisma.product.findUnique({
            where: { aliexpressId: product.productId }
          })

          if (existingProduct) {
            return existingProduct
          }

          return await prisma.product.create({
            data: {
              aliexpressId: product.productId,
              title: product.productTitle,
              description: product.productTitle,
              imageUrl: product.productImage,
              price: product.minPrice,
              currency: 'EUR',
              affiliateUrl: affiliateUrl || '',
              category: 'fishing',
              typeFishing: typeFishing || 'general',
              rating: product.avgRating || 0,
              reviews: product.totalReviews || 0,
            }
          })
        }) || []
      )

      return NextResponse.json({ success: true, products })
    }

    if (typeFishing) {
      const aliexpressProducts = await searchProducts(
        getFishingKeyword(typeFishing),
        page,
        20
      )

      const products = await Promise.all(
        aliexpressProducts?.data?.productList?.slice(0, 10).map(async (product: any) => {
          const affiliateUrl = await getAffiliateLink(product.productId)
          
          const existingProduct = await prisma.product.findUnique({
            where: { aliexpressId: product.productId }
          })

          if (existingProduct) {
            return existingProduct
          }

          return await prisma.product.create({
            data: {
              aliexpressId: product.productId,
              title: product.productTitle,
              description: product.productTitle,
              imageUrl: product.productImage,
              price: product.minPrice,
              currency: 'EUR',
              affiliateUrl: affiliateUrl || '',
              category: 'fishing',
              typeFishing: typeFishing,
              rating: product.avgRating || 0,
              reviews: product.totalReviews || 0,
            }
          })
        }) || []
      )

      return NextResponse.json({ success: true, products })
    }

    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      skip: (page - 1) * 20,
    })

    return NextResponse.json({ success: true, products })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching products' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const product = await prisma.product.create({
      data: {
        aliexpressId: body.aliexpressId,
        title: body.title,
        description: body.description,
        imageUrl: body.imageUrl,
        price: body.price,
        currency: body.currency || 'EUR',
        affiliateUrl: body.affiliateUrl,
        category: body.category,
        typeFishing: body.typeFishing,
        rating: body.rating || 0,
        reviews: body.reviews || 0,
        inStock: body.inStock !== false,
      }
    })

    return NextResponse.json({ success: true, product })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { success: false, error: 'Error creating product' },
      { status: 500 }
    )
  }
}

function getFishingKeyword(typeFishing: string): string {
  const keywords: Record<string, string> = {
    spinning: 'spinning fishing rod reel',
    flyfishing: 'fly fishing rod reel set',
    carp: 'carp fishing gear accessories',
    sea: 'sea fishing rod reel',
    baitcasting: 'baitcasting reel fishing',
    accessories: 'fishing accessories tackle',
  }
  return keywords[typeFishing] || 'fishing gear'
}