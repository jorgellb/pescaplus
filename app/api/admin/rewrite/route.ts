import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { rewriteProductCopy, rewriteGuideCopy, polishProductSeo } from '@/lib/nvidia-ai'

const schema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('product'),
    instruction: z.string().min(2).max(600),
    title: z.string().max(300),
    description: z.string().max(4000),
    seoDescription: z.string().max(400).optional(),
    typeFishing: z.string().max(40).optional(),
  }),
  z.object({
    kind: z.literal('product-seo'),
    title: z.string().max(300),
    description: z.string().max(4000),
    seoTitle: z.string().max(200).optional(),
    seoDescription: z.string().max(400).optional(),
    typeFishing: z.string().max(40).optional(),
  }),
  z.object({
    kind: z.literal('guide'),
    instruction: z.string().min(2).max(600),
    title: z.string().max(300),
    excerpt: z.string().max(800).optional(),
    content: z.string().max(20000),
    seoDescription: z.string().max(400).optional(),
  }),
])

/** Rewrite existing product/guide copy from a free-form instruction (admin only). */
export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Datos inválidos' }, { status: 400 })
  }

  try {
    if (parsed.data.kind === 'product') {
      const draft = await rewriteProductCopy(parsed.data)
      return NextResponse.json({ success: true, draft })
    }
    if (parsed.data.kind === 'product-seo') {
      const draft = await polishProductSeo(parsed.data)
      return NextResponse.json({ success: true, draft })
    }
    const draft = await rewriteGuideCopy({ ...parsed.data, excerpt: parsed.data.excerpt ?? '' })
    return NextResponse.json({ success: true, draft })
  } catch (error) {
    console.error('Error rewriting copy:', error)
    return NextResponse.json({ success: false, error: 'No se pudo reescribir' }, { status: 500 })
  }
}
