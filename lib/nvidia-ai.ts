import { ChatNVIDIA } from '@langchain/core/chat_models'
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY

export interface FishingAdvice {
  advice: string
  recommendations: ProductRecommendation[]
  tips: string[]
}

export interface ProductRecommendation {
  productName: string
  productType: string
  aliexpressKeyword: string
  whyRecommended: string
}

export async function getFishingAdvice(typeFishing: string, question?: string): Promise<FishingAdvice> {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY not configured')
  }

  const chatModel = new ChatNVIDIA({
    model: 'minimaxai/minimax-m3',
    temperature: 0.7,
    max_tokens: 1024,
  })

  const systemPrompt = `Eres un experto en pesca con amplia experiencia en diferentes tipos de pesca. Tu tarea es dar consejos de pesca y recomendar productos de AliExpress.

Tipos de pesca que cubres:
- Spinning: pesca con señuelos artificiales, cañas ligeras, carretes de 2000-4000
- Fly fishing: pesca con mosca, cañas específicas, carretes especializados
- Carp fishing: pesca de carpas, equipo pesado, carnadas especiales
- Sea fishing: pesca en mar, equipo resistente a la sal
- Baitcasting: pesca con carrete de lanzadera, técnica precisa

Para cada tipo de pesca, proporciona:
1. Consejos prácticos sobre técnica, equipo y ubicación
2. Recomendaciones de productos específicos que se pueden encontrar en AliExpress
3. Tips adicionales para principiantes y avanzados

Sé específico y práctico en tus recomendaciones.`

  const userPrompt = question 
    ? `Tipo de pesca: ${typeFishing}\nPregunta: ${question}\n\nDame consejos y recomendaciones de productos de AliExpress.`
    : `Dame consejos generales y recomendaciones de productos de AliExpress para pesca tipo: ${typeFishing}`

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ]

  const response = await chatModel.invoke(messages)
  
  const content = response.content as string
  
  return {
    advice: content,
    recommendations: [],
    tips: [],
  }
}

export async function chatWithFishingExpert(messages: Array<{role: string, content: string}>): Promise<string> {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY not configured')
  }

  const chatModel = new ChatNVIDIA({
    model: 'minimaxai/minimax-m3',
    temperature: 0.7,
    max_tokens: 1024,
  })

  const formattedMessages = messages.map(msg => {
    if (msg.role === 'system') return new SystemMessage(msg.content)
    if (msg.role === 'user') return new HumanMessage(msg.content)
    if (msg.role === 'assistant') return new AIMessage(msg.content)
    return new HumanMessage(msg.content)
  })

  const response = await chatModel.invoke(formattedMessages)
  
  return response.content as string
}