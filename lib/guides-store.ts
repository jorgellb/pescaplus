import type { Guide } from '@/types'
import { GUIDE_SEED } from '@/lib/guides-data'
import { slugify } from '@/lib/catalog'
import { isDatabaseConfigured } from '@/lib/products-store'

/**
 * Blog / buying guides store. Same dual backend as the product store: database
 * when configured, otherwise an in-memory copy seeded from guides-data.ts.
 */

export type GuideInput = {
  title: string
  excerpt?: string
  content: string
  coverImage?: string
  coverImageAlt?: string
  typeFishing?: string
  seoTitle?: string
  seoDescription?: string
  aiOptimized?: boolean
  published?: boolean
}

const globalForGuides = globalThis as unknown as { __pescaplusGuides?: Map<string, Guide> }
function memory(): Map<string, Guide> {
  if (!globalForGuides.__pescaplusGuides) {
    globalForGuides.__pescaplusGuides = new Map(GUIDE_SEED.map((g) => [g.id, { ...g }]))
  }
  return globalForGuides.__pescaplusGuides
}

function uniqueId(base: string, exists: (id: string) => boolean): string {
  let id = base
  let n = 2
  while (exists(id)) id = `${base}-${n++}`
  return id
}

function applyInput(input: GuideInput, id: string, createdAt: string): Guide {
  const content = input.content.trim()
  return {
    id,
    title: input.title.trim(),
    excerpt: input.excerpt?.trim() || content.replace(/[#*_>-]/g, '').slice(0, 160).trim(),
    content,
    coverImage: input.coverImage?.trim() || '',
    coverImageAlt: input.coverImageAlt?.trim() || '',
    typeFishing: input.typeFishing?.trim() || '',
    seoTitle: input.seoTitle?.trim() || '',
    seoDescription: input.seoDescription?.trim() || content.slice(0, 160),
    aiOptimized: input.aiOptimized ?? false,
    published: input.published ?? true,
    createdAt,
    updatedAt: new Date().toISOString(),
  }
}

let guidesSeeded = false
async function ensureSeeded(prisma: any): Promise<void> {
  if (guidesSeeded) return
  if ((await prisma.guide.count()) === 0) {
    for (const g of GUIDE_SEED) {
      await prisma.guide.create({
        data: { ...g, createdAt: new Date(g.createdAt), updatedAt: new Date(g.updatedAt) },
      })
    }
  }
  guidesSeeded = true
}

async function withDb<T>(op: (prisma: any) => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  if (!isDatabaseConfigured()) return fallback()
  try {
    const { prisma } = await import('@/lib/prisma')
    await ensureSeeded(prisma)
    return await op(prisma)
  } catch (error) {
    console.warn('Guides DB op failed, using in-memory store:', error)
    return fallback()
  }
}

function toGuide(row: any): Guide {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    coverImage: row.coverImage,
    coverImageAlt: row.coverImageAlt ?? '',
    typeFishing: row.typeFishing,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    aiOptimized: row.aiOptimized,
    published: row.published,
    createdAt: (row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)).toISOString(),
    updatedAt: (row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt)).toISOString(),
  }
}

export async function listGuides(opts: { publishedOnly?: boolean } = {}): Promise<Guide[]> {
  const all = await withDb<Guide[]>(
    async (prisma) => (await prisma.guide.findMany({ orderBy: { createdAt: 'desc' } })).map(toGuide),
    () => Array.from(memory().values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  )
  return opts.publishedOnly ? all.filter((g) => g.published) : all
}

export async function getGuide(id: string): Promise<Guide | undefined> {
  return withDb(
    async (prisma) => {
      const row = await prisma.guide.findUnique({ where: { id } })
      return row ? toGuide(row) : undefined
    },
    () => memory().get(id),
  )
}

export async function createGuide(input: GuideInput): Promise<Guide> {
  const now = new Date().toISOString()
  return withDb(
    async (prisma) => {
      const base = uniqueId(slugify(input.title), () => false)
      let guide = applyInput(input, base, now)
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const row = await prisma.guide.create({ data: { ...guide, createdAt: new Date(now) } })
          return toGuide(row)
        } catch {
          guide = applyInput(input, `${base}-${Date.now().toString(36)}`, now)
        }
      }
      throw new Error('Could not create guide')
    },
    () => {
      const store = memory()
      const id = uniqueId(slugify(input.title), (c) => store.has(c))
      const guide = applyInput(input, id, now)
      store.set(id, guide)
      return guide
    },
  )
}

export async function updateGuide(id: string, patch: Partial<GuideInput>): Promise<Guide | undefined> {
  return withDb(
    async (prisma) => {
      const existing = await prisma.guide.findUnique({ where: { id } })
      if (!existing) return undefined
      const merged = applyInput({ ...toGuide(existing), ...patch } as GuideInput, id, toGuide(existing).createdAt)
      const row = await prisma.guide.update({ where: { id }, data: { ...merged, createdAt: new Date(merged.createdAt) } })
      return toGuide(row)
    },
    () => {
      const store = memory()
      const existing = store.get(id)
      if (!existing) return undefined
      const merged = applyInput({ ...existing, ...patch } as GuideInput, id, existing.createdAt)
      store.set(id, merged)
      return merged
    },
  )
}

export async function deleteGuide(id: string): Promise<boolean> {
  return withDb(
    async (prisma) => {
      try {
        await prisma.guide.delete({ where: { id } })
        return true
      } catch {
        return false
      }
    },
    () => memory().delete(id),
  )
}
