import axios from 'axios'

const ALIEXPRESS_APP_KEY = process.env.ALIEXPRESS_APP_KEY
const ALIEXPRESS_APP_SECRET = process.env.ALIEXPRESS_APP_SECRET
const ALIEXPRESS_BASE_URL = 'https://api.aliexpress.com'

export interface AliExpressProduct {
  productId: string
  title: string
  imageUrl: string
  price: number
  currency: string
  affiliateUrl: string
  rating: number
  reviews: number
  category: string
}

export async function searchProducts(keyword: string, page: number = 1, pageSize: number = 20) {
  try {
    const response = await axios.get(`${ALIEXPRESS_BASE_URL}/rest/gateway/promote/v2/product/search`, {
      params: {
        appKey: ALIEXPRESS_APP_KEY,
        keyword,
        page,
        pageSize,
      },
      headers: {
        'x-eop-accelerator-id': '1',
      },
    })
    return response.data
  } catch (error) {
    console.error('Error searching AliExpress products:', error)
    throw error
  }
}

export async function getProductDetails(productId: string) {
  try {
    const response = await axios.get(`${ALIEXPRESS_BASE_URL}/rest/gateway/promote/v2/product/detail`, {
      params: {
        appKey: ALIEXPRESS_APP_KEY,
        productId,
      },
    })
    return response.data
  } catch (error) {
    console.error('Error getting product details:', error)
    throw error
  }
}

export async function getAffiliateLink(productId: string) {
  try {
    const response = await axios.get(`${ALIEXPRESS_BASE_URL}/rest/gateway/promote/v2/advlink/create`, {
      params: {
        appKey: ALIEXPRESS_APP_KEY,
        productId,
      },
    })
    return response.data?.data?.advUrl
  } catch (error) {
    console.error('Error getting affiliate link:', error)
    throw error
  }
}

export async function getFishingProducts(typeFishing: string, page: number = 1) {
  const keywords = {
    spinning: 'spinning fishing rod reel',
    flyfishing: 'fly fishing rod reel',
    carp: 'carp fishing gear',
    sea: 'sea fishing rod',
    baitcasting: 'baitcasting reel',
    accessories: 'fishing accessories',
  }

  const keyword = keywords[typeFishing as keyof typeof keywords] || 'fishing gear'
  return searchProducts(keyword, page, 20)
}