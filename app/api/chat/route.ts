import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { chatWithFishingExpert } from '@/lib/nvidia-ai'
import type { ChatApiResponse } from '@/types'
import { fishingLabel } from '@/lib/fishing'

const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(50),
  typeFishing: z.string().max(40).optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse<ChatApiResponse>> {
  try {
    const parsed = chatRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request payload' },
        { status: 400 },
      )
    }

    const { messages, typeFishing } = parsed.data

    // Tag the last user message with the selected modality so both the live model
    // and the offline fallback can tailor the answer.
    const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user')
    const formattedMessages = messages.map((msg, index) =>
      index === lastUserIndex && typeFishing
        ? { ...msg, content: `[Modalidad de pesca: ${typeFishing}] ${msg.content}` }
        : msg,
    )

    const response = await chatWithFishingExpert(formattedMessages)
    return NextResponse.json({ success: true, response })
  } catch (error) {
    console.error('Error in chat route:', error)
    return NextResponse.json(
      { success: false, error: 'Error processing chat' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<ChatApiResponse>> {
  try {
    const typeFishing = new URL(request.url).searchParams.get('typeFishing') || 'general'
    const prompt = `Dame consejos para empezar en la modalidad de ${fishingLabel(
      typeFishing,
    )} (${typeFishing}) y qué equipo básico necesito.`

    const response = await chatWithFishingExpert([{ role: 'user', content: prompt }])
    return NextResponse.json({ success: true, response })
  } catch (error) {
    console.error('Error in chat GET route:', error)
    return NextResponse.json(
      { success: false, error: 'Error processing chat' },
      { status: 500 },
    )
  }
}
