import { getTrendingRanked } from '@/lib/trending'
import type { SpeciesProfile } from '@/lib/fishing-species'
import type { Product } from '@/types'

/**
 * Qué aparejo concreto proponer en una página de herramienta (previsión de zona,
 * ficha de especie, "pescar X en Y").
 *
 * El sitio ya decía "para este mar, mira los señuelos" con un enlace a la
 * categoría. Eso deja al pescador a mitad de camino: le hemos dicho QUÉ
 * necesita y le mandamos a buscarlo. Aquí se cierra el círculo con productos
 * reales del catálogo.
 *
 * De dónde salen las categorías, por orden de prioridad:
 *  1. Las que ya recomiendan los consejos de condiciones (mar movido → plomos,
 *     agua clara → líneas finas…), que son las más pegadas a HOY.
 *  2. Las `gearCats` de la especie, que la ficha ya declaraba.
 * Se mezclan sin repetir y se toma un producto de cada una, para que la
 * selección sea variada (una caña, un carrete, un señuelo) en vez de tres
 * señuelos casi iguales.
 */
export interface GearPick {
  product: Product
  /** Por qué se propone, en una línea. Se enseña junto al producto. */
  reason: string
}

/** Extrae el id de categoría de una ruta `/categories/<id>`. */
function categoryFromHref(href: string): string | null {
  const m = href.match(/^\/categories\/([a-z0-9-]+)$/)
  return m ? m[1] : null
}

const CATEGORY_REASON: Record<string, string> = {
  senuelos: 'Para presentar donde está comiendo',
  canas: 'La caña que pide esta pesca',
  carretes: 'Carrete acorde al montaje',
  lineas: 'La línea marca la diferencia con agua clara',
  plomos: 'Para aguantar el fondo con corriente',
  anzuelos: 'El anzuelo correcto para su boca',
  minuteria: 'Los herrajes que sostienen el montaje',
  herramientas: 'Para manipular la captura sin dañarla',
  equipo: 'Lo que se agradece en una jornada larga',
  electronica: 'Para leer el fondo antes de tirar',
  embarcaciones: 'Si sales del agua a flote',
}

/**
 * Un producto por categoría relevante, hasta `max`.
 *
 * Se apoya en `getTrendingRanked`, que ya ordena por interés real (clics), así
 * que lo que se propone es lo que de verdad funciona en la tienda, no el
 * primero por orden alfabético.
 */
export async function gearPicks(
  species: SpeciesProfile | null,
  conditionHrefs: string[] = [],
  max = 3,
): Promise<GearPick[]> {
  const fromConditions = conditionHrefs.map(categoryFromHref).filter((c): c is string => Boolean(c))
  const fromSpecies = species && species.id !== 'general' ? species.gearCats : []

  const cats: string[] = []
  for (const c of [...fromConditions, ...fromSpecies]) {
    if (!cats.includes(c)) cats.push(c)
  }
  if (cats.length === 0) return []

  const picks: GearPick[] = []
  for (const cat of cats) {
    if (picks.length >= max) break
    try {
      const [best] = await getTrendingRanked(cat)
      // Una categoría vacía no es un error: el catálogo crece por partes.
      if (best && !picks.some((p) => p.product.id === best.id)) {
        picks.push({ product: best, reason: CATEGORY_REASON[cat] ?? 'Encaja con esta pesca' })
      }
    } catch {
      // Si el catálogo no responde, la herramienta debe seguir funcionando:
      // esta sección es un extra, nunca el motivo de que la página caiga.
    }
  }
  return picks
}
