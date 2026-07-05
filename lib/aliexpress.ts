import crypto from 'crypto'
import type { Product } from '@/types'

/**
 * Minimal client for the AliExpress affiliate open platform (TOP "system"
 * gateway). Requests must be signed: parameters are sorted, concatenated as
 * `k1v1k2v2…` and HMAC-SHA256'd with the app secret. The previous version sent
 * an unsigned request, which the gateway always rejects — so it never returned
 * real data.
 *
 * This integration is entirely OPTIONAL. The product API works from the local
 * catalog without it; when credentials are present it is used as a best-effort
 * enhancement, and every failure degrades gracefully to an empty result.
 */

const APP_KEY = process.env.ALIEXPRESS_APP_KEY
const APP_SECRET = process.env.ALIEXPRESS_APP_SECRET
const TRACKING_ID = process.env.ALIEXPRESS_TRACKING_ID ?? 'pescaplus'
const GATEWAY = process.env.ALIEXPRESS_GATEWAY ?? 'https://api-sg.aliexpress.com/sync'

export function isAliExpressConfigured(): boolean {
  return Boolean(
    APP_KEY &&
      APP_SECRET &&
      APP_KEY !== 'your_app_key' &&
      APP_SECRET !== 'your_app_secret',
  )
}

function signParams(params: Record<string, string>, secret: string): string {
  const base = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join('')
  return crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex').toUpperCase()
}

async function callApi(
  method: string,
  businessParams: Record<string, string>,
): Promise<unknown> {
  if (!isAliExpressConfigured()) {
    throw new Error('AliExpress API is not configured')
  }

  const params: Record<string, string> = {
    method,
    app_key: APP_KEY!,
    sign_method: 'sha256',
    timestamp: Date.now().toString(),
    format: 'json',
    v: '2.0',
    ...businessParams,
  }
  params.sign = signParams(params, APP_SECRET!)

  const url = `${GATEWAY}?${new URLSearchParams(params).toString()}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    // AliExpress responses change slowly; cache briefly to avoid rate limits.
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`AliExpress gateway responded ${response.status}`)
  }
  return response.json()
}

/** Raw product shape as returned by aliexpress.affiliate.product.query. */
interface RawAliProduct {
  product_id?: number | string
  product_title?: string
  product_main_image_url?: string
  target_sale_price?: string
  target_sale_price_currency?: string
  promotion_link?: string
  product_detail_url?: string
  evaluate_rate?: string
  lastest_volume?: number
  first_level_category_name?: string
}

function normalize(raw: RawAliProduct, typeFishing: string): Product {
  const id = String(raw.product_id ?? '')
  return {
    id,
    aliexpressId: id,
    title: raw.product_title ?? 'Producto AliExpress',
    description: raw.product_title ?? '',
    imageUrl: raw.product_main_image_url ?? '',
    price: Number(raw.target_sale_price ?? 0),
    currency: raw.target_sale_price_currency ?? 'EUR',
    affiliateUrl: raw.promotion_link ?? raw.product_detail_url ?? '',
    category: raw.first_level_category_name ?? 'fishing',
    typeFishing,
    rating: parseFloat((raw.evaluate_rate ?? '0').replace('%', '')) / 20 || 0,
    reviews: raw.lastest_volume ?? 0,
    inStock: true,
  }
}

/**
 * Search affiliate products by keyword. Returns a normalized, UI-ready list, or
 * an empty array if the API is unavailable or returns nothing.
 */
export async function searchAliExpressProducts(
  keyword: string,
  typeFishing: string,
  page = 1,
  pageSize = 20,
): Promise<Product[]> {
  try {
    const data = (await callApi('aliexpress.affiliate.product.query', {
      keywords: keyword,
      page_no: String(page),
      page_size: String(pageSize),
      target_currency: 'EUR',
      target_language: 'ES',
      tracking_id: TRACKING_ID,
    })) as {
      resp_result?: { result?: { products?: { product?: RawAliProduct[] } } }
    }

    const products = data.resp_result?.result?.products?.product ?? []
    return products
      .map((p) => normalize(p, typeFishing))
      .filter((p) => p.id && p.imageUrl)
  } catch (error) {
    console.warn('AliExpress search failed, using local catalog instead:', error)
    return []
  }
}
