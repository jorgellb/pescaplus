import guides from '@/content/species-guides.json'
import type { SpeciesGuideContent } from '@/lib/openrouter-ai'

/**
 * Guías de especie generadas en lote (scripts/gen-species-guides.ts) y servidas
 * como contenido estático con el build: coste cero en ejecución y versionadas
 * en git, igual que las de zona.
 *
 * El fichero puede estar vacío —hoy lo está, porque la cuota de IA se agotó
 * antes de poder generarlas— y eso NO es un fallo: la ficha se pinta igual sin
 * la guía. Así el día que se generen aparecen solas, sin tocar código.
 */
export interface SpeciesGuide extends SpeciesGuideContent {
  generatedAt: string
}

const ALL = guides as Record<string, SpeciesGuide>

export function getSpeciesGuide(id: string): SpeciesGuide | null {
  const g = ALL[id]
  return g && g.intro ? g : null
}

export function speciesGuideCount(): number {
  return Object.keys(ALL).length
}
