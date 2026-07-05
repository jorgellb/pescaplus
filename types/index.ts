import type { FishingTypeId } from '@/lib/fishing'

/**
 * Canonical product shape used across the UI and API responses. It intentionally
 * omits DB-only bookkeeping (createdAt/updatedAt) so the same type describes both
 * static catalog entries and rows fetched from Postgres.
 */
export interface Product {
  id: string
  aliexpressId: string
  title: string
  description: string
  imageUrl: string
  price: number
  currency: string
  affiliateUrl: string
  category: string
  typeFishing: FishingTypeId | string
  rating: number
  reviews: number
  inStock: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatApiResponse {
  success: boolean
  response?: string
  error?: string
}

export interface ProductsApiResponse {
  success: boolean
  products?: Product[]
  source?: 'catalog' | 'aliexpress' | 'database'
  error?: string
}

export interface ProductApiResponse {
  success: boolean
  product?: Product
  error?: string
}
