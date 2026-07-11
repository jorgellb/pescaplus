import crypto from 'crypto'
import type { Product } from '@/types'

/**
 * Client for the AliExpress affiliate open platform (TOP "system" gateway).
 * Requests are signed: parameters are sorted, concatenated as `k1v1k2v2…` and
 * HMAC-SHA256'd with the app secret.
 *
 * This integration is OPTIONAL. The product API works from the local catalog
 * without it; when credentials are present it is used as a best-effort
 * enhancement, and every failure degrades gracefully.
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

/**
 * Perform a signed call and unwrap the `<method>_response` envelope that the
 * gateway wraps every successful response in. Returns the envelope body (which
 * contains `resp_result`), or the raw JSON for error responses.
 */
async function callApi(
  method: string,
  businessParams: Record<string, string>,
): Promise<Record<string, unknown>> {
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
    // AliExpress data changes slowly; cache briefly to avoid rate limits.
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`AliExpress gateway responded ${response.status}`)
  }

  const json = (await response.json()) as Record<string, unknown>
  const envelopeKey = `${method.replace(/\./g, '_')}_response`
  return (json[envelopeKey] as Record<string, unknown>) ?? json
}

/** Raw product shape returned by aliexpress.affiliate.* endpoints. */
export interface RawAliProduct {
  product_id?: number | string
  product_title?: string
  product_main_image_url?: string
  product_small_image_urls?: { string?: string[] }
  product_video_url?: string
  target_sale_price?: string
  target_sale_price_currency?: string
  promotion_link?: string
  product_detail_url?: string
  evaluate_rate?: string
  lastest_volume?: number
  first_level_category_name?: string
}

interface ProductListResult {
  resp_result?: {
    resp_code?: number
    result?: { products?: { product?: RawAliProduct[] } }
  }
}

export function aliImages(raw: RawAliProduct): string[] {
  const main = raw.product_main_image_url ? [raw.product_main_image_url] : []
  const gallery = raw.product_small_image_urls?.string ?? []
  return Array.from(new Set([...main, ...gallery].filter(Boolean)))
}

/** AliExpress returns protocol-relative or http video urls; normalize to https. */
export function aliVideo(raw: RawAliProduct): string {
  const v = raw.product_video_url?.trim()
  if (!v) return ''
  if (v.startsWith('//')) return `https:${v}`
  return v.replace(/^http:/, 'https:')
}

function normalize(raw: RawAliProduct, typeFishing: string): Product {
  const id = String(raw.product_id ?? '')
  const rate = parseFloat((raw.evaluate_rate ?? '').replace('%', ''))
  const title = raw.product_title ?? 'Producto AliExpress'
  return {
    id,
    aliexpressId: id,
    title,
    description: title,
    imageUrl: raw.product_main_image_url ?? '',
    images: aliImages(raw),
    imageAlts: [],
    videoUrl: aliVideo(raw),
    price: Number(raw.target_sale_price ?? 0),
    currency: raw.target_sale_price_currency ?? 'EUR',
    // Prefer the affiliate promotion link (earns commission) over the plain URL.
    affiliateUrl: raw.promotion_link || raw.product_detail_url || '',
    category: raw.first_level_category_name ?? 'fishing',
    typeFishing,
    categories: [typeFishing],
    subcategory: '',
    rating: Number.isFinite(rate) ? Math.min(rate / 20, 5) : 0,
    reviews: raw.lastest_volume ?? 0,
    inStock: true,
    seoTitle: '',
    seoDescription: title.slice(0, 160),
    aiOptimized: false,
  }
}

function extractProducts(data: ProductListResult): RawAliProduct[] {
  return data.resp_result?.result?.products?.product ?? []
}

/**
 * Search affiliate products by keyword, sorted by sales volume for relevance.
 * Returns a normalized, UI-ready list, or an empty array on any failure.
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
      sort: 'LAST_VOLUME_DESC',
      target_currency: 'EUR',
      target_language: 'ES',
      tracking_id: TRACKING_ID,
    })) as ProductListResult

    return extractProducts(data)
      .map((p) => normalize(p, typeFishing))
      .filter((p) => p.id && p.imageUrl)
  } catch (error) {
    console.warn('AliExpress search failed, using local catalog instead:', error)
    return []
  }
}

/**
 * Fetch a single affiliate product by its AliExpress product id. Used by the
 * product detail page to resolve live products that aren't in the local store.
 */
export async function getAliExpressProductDetail(
  productId: string,
  typeFishing = 'general',
): Promise<Product | undefined> {
  try {
    const data = (await callApi('aliexpress.affiliate.productdetail.get', {
      product_ids: productId,
      target_currency: 'EUR',
      target_language: 'ES',
      tracking_id: TRACKING_ID,
    })) as ProductListResult

    const raw = extractProducts(data)[0]
    return raw ? normalize(raw, typeFishing) : undefined
  } catch (error) {
    console.warn('AliExpress product detail failed:', error)
    return undefined
  }
}

/**
 * Batch-fetch several products by id (aliexpress.affiliate.productdetail.get
 * accepts a comma-separated list). Used by the price/link refresh job.
 */
export async function getAliExpressProductsByIds(
  productIds: string[],
  typeFishing = 'general',
): Promise<Product[]> {
  if (productIds.length === 0) return []
  try {
    const data = (await callApi('aliexpress.affiliate.productdetail.get', {
      product_ids: productIds.join(','),
      target_currency: 'EUR',
      target_language: 'ES',
      tracking_id: TRACKING_ID,
    })) as ProductListResult
    return extractProducts(data).map((p) => normalize(p, typeFishing))
  } catch (error) {
    console.warn('AliExpress batch detail failed:', error)
    return []
  }
}
