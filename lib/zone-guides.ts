import guides from '@/content/zone-guides.json'
import type { ZoneGuideContent } from '@/lib/nvidia-ai'

/**
 * Local zone guides, generated in batch (scripts + admin route) and shipped as
 * static content with the build — zero runtime cost, versioned in git.
 */
export interface ZoneGuide extends ZoneGuideContent {
  generatedAt: string
}

const ALL = guides as Record<string, ZoneGuide>

export function getZoneGuide(slug: string): ZoneGuide | null {
  const g = ALL[slug]
  return g && g.intro ? g : null
}

export function zoneGuideCount(): number {
  return Object.keys(ALL).length
}
