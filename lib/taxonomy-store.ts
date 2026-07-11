import { FISHING_TYPE_IDS, FISHING_TYPES, SUBCATEGORIES, type Subcategory } from '@/lib/fishing'
import { isDatabaseConfigured } from '@/lib/products-store'

/**
 * Editable taxonomy overrides (server-only). The 11 main category *ids* are fixed
 * (their URLs/icons/ISR depend on them), but their display NAMES can be renamed
 * and their SUBCATEGORIES can be created/renamed/deleted from the admin. Overrides
 * are persisted as a single JSON blob in the `Setting` table (key "taxonomy"),
 * with an in-memory fallback, and merged on top of the code defaults.
 */

const KEY = 'taxonomy'

export interface TaxonomyOverride {
  /** category id -> renamed display name */
  names: Record<string, string>
  /** category id -> subcategory list (replaces the default list for that category) */
  subs: Record<string, Subcategory[]>
}

export interface ResolvedCategory {
  id: string
  name: string
  subcategories: Subcategory[]
}

export type ResolvedTaxonomy = ResolvedCategory[]

const EMPTY: TaxonomyOverride = { names: {}, subs: {} }

const globalForTaxonomy = globalThis as unknown as { __pescaplusTaxonomy?: TaxonomyOverride }

function slugify(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40)
}

/** Validate + normalize an incoming override so we never persist junk. */
export function sanitizeOverride(raw: unknown): TaxonomyOverride {
  const input = (raw ?? {}) as Partial<TaxonomyOverride>
  const names: Record<string, string> = {}
  const subs: Record<string, Subcategory[]> = {}
  for (const id of FISHING_TYPE_IDS) {
    const name = input.names?.[id]
    if (typeof name === 'string' && name.trim() && name.trim() !== defaultName(id)) {
      names[id] = name.trim().slice(0, 60)
    }
    const list = input.subs?.[id]
    if (Array.isArray(list)) {
      const seen = new Set<string>()
      const clean: Subcategory[] = []
      for (const s of list) {
        const nm = typeof s?.name === 'string' ? s.name.trim().slice(0, 60) : ''
        if (!nm) continue
        let sid = typeof s?.id === 'string' && s.id.trim() ? slugify(s.id) : slugify(nm)
        if (!sid) continue
        while (seen.has(sid)) sid = `${sid}-2`
        seen.add(sid)
        clean.push({ id: sid, name: nm })
      }
      // Only store when it actually differs from the default list.
      if (JSON.stringify(clean) !== JSON.stringify(SUBCATEGORIES[id] ?? [])) subs[id] = clean
    }
  }
  return { names, subs }
}

function defaultName(id: string): string {
  return FISHING_TYPES.find((t) => t.id === id)?.name ?? id
}

async function readOverride(): Promise<TaxonomyOverride> {
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const row = await prisma.setting.findUnique({ where: { key: KEY } })
      if (row?.value) return { ...EMPTY, ...(JSON.parse(row.value) as TaxonomyOverride) }
      return EMPTY
    } catch (error) {
      console.warn('Taxonomy DB read failed, using in-memory/defaults:', error)
    }
  }
  return globalForTaxonomy.__pescaplusTaxonomy ?? EMPTY
}

/** Resolve the full taxonomy (defaults merged with overrides), in category order. */
export async function getTaxonomy(): Promise<ResolvedTaxonomy> {
  const override = await readOverride()
  return FISHING_TYPE_IDS.map((id) => ({
    id,
    name: override.names[id] ?? defaultName(id),
    subcategories: override.subs[id] ?? SUBCATEGORIES[id] ?? [],
  }))
}

export async function saveTaxonomy(raw: unknown): Promise<ResolvedTaxonomy> {
  const clean = sanitizeOverride(raw)
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.setting.upsert({
        where: { key: KEY },
        update: { value: JSON.stringify(clean) },
        create: { key: KEY, value: JSON.stringify(clean) },
      })
      return getTaxonomy()
    } catch (error) {
      console.warn('Taxonomy DB write failed, using in-memory store:', error)
    }
  }
  globalForTaxonomy.__pescaplusTaxonomy = clean
  return getTaxonomy()
}

/** Convenience lookups built on top of a resolved taxonomy. */
export function categoryName(tax: ResolvedTaxonomy, id: string): string {
  return tax.find((c) => c.id === id)?.name ?? defaultName(id)
}
export function subcategoriesOf(tax: ResolvedTaxonomy, id: string): Subcategory[] {
  return tax.find((c) => c.id === id)?.subcategories ?? []
}
