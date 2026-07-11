import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { chatWithFishingExpert, streamFishingExpert } from '@/lib/nvidia-ai'
import type { ChatApiResponse, ChatMessage, ChatProductRef, Product } from '@/types'
import { fishingLabel } from '@/lib/fishing'
import { retrieveProducts } from '@/lib/retrieval'

/** Trim retrieved products to the light shape sent to the chat UI (max 3). */
function toRefs(products: Product[]): ChatProductRef[] {
  return products.slice(0, 3).map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    currency: p.currency,
    imageUrl: p.imageUrl,
  }))
}

/**
 * Stream protocol: the first line is a JSON metadata frame ({products}) followed
 * by a single '\n'; everything after is the assistant's answer text, verbatim.
 * The client reads the first newline as the frame boundary, then appends the rest.
 */
function streamChatResponse(messages: ChatMessage[], relevant: Product[]): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(JSON.stringify({ products: toRefs(relevant) }) + '\n'))
      try {
        for await (const chunk of streamFishingExpert(messages, relevant)) {
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (error) {
        console.error('Error streaming chat:', error)
      } finally {
        controller.close()
      }
    },
  })
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}

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
  /** When true, respond with a token stream instead of a single JSON payload. */
  stream: z.boolean().optional(),
})

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const parsed = chatRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request payload' },
        { status: 400 },
      )
    }

    const { messages, typeFishing, stream } = parsed.data

    // Tag the last user message with the selected modality so both the live model
    // and the offline fallback can tailor the answer.
    const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user')
    const formattedMessages = messages.map((msg, index) =>
      index === lastUserIndex && typeFishing
        ? { ...msg, content: `[Modalidad de pesca: ${typeFishing}] ${msg.content}` }
        : msg,
    )

    const lastUser = lastUserIndex >= 0 ? messages[lastUserIndex].content : ''
    const relevant = await retrieveProducts(lastUser, typeFishing)

    if (stream) {
      return streamChatResponse(formattedMessages, relevant)
    }

    const response = await chatWithFishingExpert(formattedMessages, relevant)
    return NextResponse.json({ success: true, response, products: toRefs(relevant) })
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

    const relevant = await retrieveProducts(fishingLabel(typeFishing), typeFishing)
    const response = await chatWithFishingExpert([{ role: 'user', content: prompt }], relevant)
    return NextResponse.json({ success: true, response, products: toRefs(relevant) })
  } catch (error) {
    console.error('Error in chat GET route:', error)
    return NextResponse.json(
      { success: false, error: 'Error processing chat' },
      { status: 500 },
    )
  }
}
