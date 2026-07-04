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
  typeFishing: string
  rating: number
  reviews: number
  inStock: boolean
  createdAt: Date
  updatedAt: Date
}

export interface FishingAdvice {
  id: string
  typeFishing: string
  title: string
  content: string
  tags: string[]
  relatedProducts: string[]
  createdAt: Date
  updatedAt: Date
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatSession {
  id: string
  userId: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}