import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { isRequestAuthenticated } from '@/lib/admin-auth'
import { getSpot } from '@/lib/fishing-spots'
import { buildZoneFacts } from '@/lib/zone-facts'
import { generateZoneGuide } from '@/lib/nvidia-ai'

export const maxDuration = 120

const schema = z.object({ slug: z.string().min(2).max(80) })

/**
 * Generate the local guide for one zone (admin only). Writes the result to
 * content/zone-guides/{slug}.json — a local/dev workflow; the merged file is
 * committed and shipped with the build.
 */
export async function POST(request: NextRequest) {
  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Datos inválidos' }, { status: 400 })

  const spot = getSpot(parsed.data.slug)
  if (!spot) return NextResponse.json({ success: false, error: 'Zona no encontrada' }, { status: 404 })

  const facts = buildZoneFacts(spot)
  const guide = await generateZoneGuide(facts)
  if (!guide) return NextResponse.json({ success: false, error: 'Generación no válida (reintenta)' }, { status: 502 })

  try {
    const dir = path.join(process.cwd(), 'content', 'zone-guides')
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, `${spot.slug}.json`), JSON.stringify({ ...guide, generatedAt: new Date().toISOString() }, null, 2))
  } catch {
    /* read-only fs in prod — the response still carries the guide */
  }
  return NextResponse.json({ success: true, slug: spot.slug, guide })
}
