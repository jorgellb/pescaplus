import 'dotenv/config'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { SEA_SPECIES, MONTHS_SHORT } from '@/lib/fishing-species'
import { zonesForSpecies } from '@/lib/species-zones'
import { generateSpeciesGuide, type SpeciesGuideContent } from '@/lib/openrouter-ai'

/**
 * Genera content/species-guides.json: la prosa que a las fichas de especie les
 * faltaba.
 *
 *   npx tsx scripts/gen-species-guides.ts            todas las que falten
 *   npx tsx scripts/gen-species-guides.ts dorada     solo una
 *   npx tsx scripts/gen-species-guides.ts --forzar   regenera también las hechas
 *
 * REANUDABLE A PROPÓSITO. Escribe el fichero después de CADA especie y salta las
 * que ya están. Las cuotas gratuitas de IA se agotan a media tarea —ya pasó con
 * el detector de especies— y sin esto un corte a la vigésima obligaría a repetir
 * las diecinueve buenas, quemando cuota para reescribir lo que ya estaba bien.
 *
 * Entre llamadas hay una pausa: el Llama grande de Groq va con 12.000 tokens por
 * MINUTO, y una guía ronda los 1.500. Sin pausa, a la octava salta el 429.
 */

const OUT = join(process.cwd(), 'content', 'species-guides.json')

interface Guardada extends SpeciesGuideContent {
  generatedAt: string
}

function leer(): Record<string, Guardada> {
  if (!existsSync(OUT)) return {}
  try {
    return JSON.parse(readFileSync(OUT, 'utf8')) as Record<string, Guardada>
  } catch {
    console.warn('El JSON existente no se puede leer; se empieza de cero.')
    return {}
  }
}

function mesesEnPalabras(meses: number[]): string {
  if (meses.length >= 11) return 'todo el año'
  return meses.map((m) => MONTHS_SHORT[m - 1].toLowerCase()).join(', ')
}

async function main() {
  const args = process.argv.slice(2)
  const forzar = args.includes('--forzar')
  const solo = args.filter((a) => !a.startsWith('--'))

  const hechas = leer()
  const objetivo = SEA_SPECIES.filter((s) => s.id !== 'general')
    .filter((s) => (solo.length ? solo.includes(s.id) : true))
    .filter((s) => forzar || !hechas[s.id])

  if (!objetivo.length) {
    console.log(`Nada que hacer. Guías guardadas: ${Object.keys(hechas).length}.`)
    return
  }
  console.log(`Por generar: ${objetivo.length} (ya hechas: ${Object.keys(hechas).length})`)

  mkdirSync(join(process.cwd(), 'content'), { recursive: true })
  let ok = 0
  let fallos = 0

  for (const [i, sp] of objetivo.entries()) {
    const zonas = zonesForSpecies(sp.id).slice(0, 8).map((z) => z.name)
    process.stdout.write(`[${i + 1}/${objetivo.length}] ${sp.name}… `)

    // Dos intentos: los modelos fallan de vez en cuando y regenerar una guía
    // cuesta menos que volver a lanzar el script entero.
    let guia: SpeciesGuideContent | null = null
    for (let intento = 0; intento < 2 && !guia; intento++) {
      if (intento) await new Promise((r) => setTimeout(r, 4000))
      guia = await generateSpeciesGuide({
        name: sp.name,
        article: sp.article,
        habitat: sp.habitat,
        depth: sp.depth,
        hours: sp.hours,
        technique: sp.technique,
        baits: sp.baits,
        minSizeNote: sp.minSizeNote,
        seaTempC: sp.seaTempC,
        monthsPhrase: mesesEnPalabras(sp.bestMonths),
        zones: zonas,
      })
    }

    if (!guia) {
      fallos++
      console.log('FALLÓ (se reintenta en la próxima pasada)')
    } else {
      hechas[sp.id] = { ...guia, generatedAt: new Date().toISOString() }
      writeFileSync(OUT, JSON.stringify(hechas, null, 2) + '\n')
      ok++
      console.log(`ok · ${guia.intro.split(' ').length + guia.where.split(' ').length} palabras`)
    }

    // Respeta el tope por minuto de Groq.
    if (i < objetivo.length - 1) await new Promise((r) => setTimeout(r, 6000))
  }

  console.log(`\nHechas: ${ok} · fallidas: ${fallos} · total en fichero: ${Object.keys(hechas).length}`)
  if (fallos) console.log('Vuelve a lanzar el script: solo intentará las que faltan.')
}

main()
