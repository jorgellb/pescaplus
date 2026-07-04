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

export async function chatWithFishingExpert(messages: Array<{role: string, content: string}>): Promise<string> {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY not configured')
  }

  const systemPrompt = `Eres un experto en pesca llamado PescaPlus. Ayudas a los pescadores con consejos, técnicas y recomendaciones de equipo. Cuando recomiendes productos, menciona que están disponibles en AliExpress.

Tipos de pesca:
- Spinning: uso de señuelos artificiales, cañas ligeras
- Fly fishing: pesca con mosca artificial
- Carp fishing: pesca de carpas con equipo especializado
- Sea fishing: pesca en ambiente marino
- Baitcasting: técnica precisa con carrete especial

Sé amigable, práctico y específico en tus respuestas.`

  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ]

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'minimaxai/minimax-m3',
      messages: formattedMessages,
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.95,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`NVIDIA API error: ${error}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || 'No se pudo generar una respuesta'
}

export async function getFishingAdvice(typeFishing: string, question?: string): Promise<FishingAdvice> {
  const userPrompt = question 
    ? `Tipo de pesca: ${typeFishing}\nPregunta: ${question}\n\nDame consejos y recomendaciones de productos de AliExpress.`
    : `Dame consejos generales y recomendaciones de productos de AliExpress para pesca tipo: ${typeFishing}`

  const response = await chatWithFishingExpert([
    { role: 'user', content: userPrompt }
  ])

  return {
    advice: response,
    recommendations: [],
    tips: [],
  }
}