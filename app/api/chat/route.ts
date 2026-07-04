import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { chatWithFishingExpert } from '@/lib/nvidia-ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, typeFishing } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: 'Invalid messages format' },
        { status: 400 }
      )
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
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.role === 'user' 
          ? `${typeFishing ? `[Tipo de pesca: ${typeFishing}] ` : ''}${msg.content}`
          : msg.content
      }))
    ]

    const response = await chatWithFishingExpert(formattedMessages)

    const newMessage = { role: 'assistant', content: response }
    const updatedMessages = [...messages, newMessage]

    return NextResponse.json({
      success: true,
      response,
      messages: updatedMessages
    })
  } catch (error) {
    console.error('Error in chat:', error)
    return NextResponse.json(
      { success: false, error: 'Error processing chat' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const typeFishing = searchParams.get('typeFishing')

    const systemPrompt = `Eres un experto en pesca. Da consejos sobre ${typeFishing || 'pesca en general'} y recomienda productos de AliExpress.`

    const response = await chatWithFishingExpert([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Dame consejos y recomendaciones de productos para ${typeFishing || 'pesca'}` }
    ])

    return NextResponse.json({ success: true, response })
  } catch (error) {
    console.error('Error in chat:', error)
    return NextResponse.json(
      { success: false, error: 'Error processing chat' },
      { status: 500 }
    )
  }
}