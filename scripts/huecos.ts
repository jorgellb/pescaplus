import 'dotenv/config'
import { SEA_SPECIES } from '@/lib/fishing-species'
import { FRESHWATER_SPECIES } from '@/lib/freshwater-species'
import { getSpeciesGuide } from '@/lib/species-guides'

/**
 * Qué recomendamos que no podemos vender.
 *
 *   npx tsx scripts/huecos.ts
 *
 * Nació de un accidente: probando el registro de búsquedas se vio que «sabiki»
 * devolvía cero resultados, y al mirarlo el catálogo no tenía ni uno — con un
 * panel entero publicado explicando que es lo más eficaz que existe para el
 * jurel. El contenido creaba demanda que la tienda no podía atender, y nadie se
 * habría enterado.
 *
 * Esto lo convierte en algo que se comprueba en treinta segundos: recorre las 44
 * guías y las fichas técnicas, saca los aparejos que se nombran, y los busca en
 * el catálogo. Lo que sale con cero es dinero que se está dejando en la mesa.
 *
 * Se ordena por MENCIONES y no alfabéticamente: un aparejo nombrado en ocho
 * guías y con cero productos vale mucho más que uno nombrado de pasada.
 */

/**
 * Los términos se declaran, no se extraen del texto.
 *
 * Sacarlos automáticamente daría ruido —«agua», «fondo», «pez»— y se perdería lo
 * importante entre cien palabras vacías. Esta lista son cosas que se COMPRAN, y
 * mantenerla a mano cuesta un minuto cada vez que se escribe una guía nueva.
 */
const APAREJOS: string[] = [
  // Señuelos y montajes
  'sabiki', 'plumilla', 'kabura', 'inchiku', 'tenya', 'jig', 'vinilo', 'shad',
  'cabeza plomada', 'paseante', 'jerkbait', 'popper', 'crankbait', 'spinnerbait',
  'cucharilla', 'minnow', 'devón', 'streamer', 'ninfa', 'mosca', 'egi', 'pulpera',
  // Terminal
  'anzuelo circle', 'anzuelo offset', 'fluorocarbono', 'emerillón', 'plomo',
  'bajo de acero', 'boya', 'flotador', 'plomada',
  // Cebos
  'boilie', 'pellet', 'maíz', 'gusana', 'cangrejo', 'lombriz', 'masilla',
  // Equipo y accesorios
  'caña', 'carrete', 'sonda', 'portacañas', 'cesta', 'sacadera', 'bichero',
  'chaleco', 'wader', 'frontal', 'pinza', 'tijera', 'caja de pesca', 'nevera',
]

async function main() {
  const { prisma } = await import('@/lib/prisma')
  const especies = [...SEA_SPECIES, ...FRESHWATER_SPECIES].filter((s) => s.id !== 'general')

  // Dónde se nombra cada aparejo: guía completa + los campos de la ficha, que
  // son los que el visitante lee en la tabla de «Cómo pescarla».
  const menciones = new Map<string, Set<string>>()
  for (const sp of especies) {
    const g = getSpeciesGuide(sp.id)
    const texto = [
      sp.technique, sp.baits, sp.habitat,
      g?.intro, g?.where, g?.techniques, g?.seasons, ...(g?.tips ?? []),
    ].join(' ').toLowerCase()
    for (const a of APAREJOS) {
      if (texto.includes(a.toLowerCase())) {
        if (!menciones.has(a)) menciones.set(a, new Set())
        menciones.get(a)!.add(sp.name)
      }
    }
  }

  const total = await prisma.product.count()
  const filas: { apar: string; especies: string[]; productos: number }[] = []
  for (const [apar, sps] of menciones) {
    const productos = await prisma.product.count({
      where: {
        OR: [
          { title: { contains: apar, mode: 'insensitive' } },
          { description: { contains: apar, mode: 'insensitive' } },
        ],
      },
    })
    filas.push({ apar, especies: [...sps], productos })
  }

  /*
   * Los cebos vivos y perecederos no son un hueco: son cebo de tienda física.
   * Nadie compra gusana o cangrejo por catálogo con envío de semanas, así que
   * listarlos como oportunidad perdida solo tapa las que sí se pueden atender —y
   * eran ocho de los primeros puestos, justo los que más se leen.
   */
  const NO_VENDIBLE = ['gusana', 'lombriz', 'cangrejo', 'masilla', 'maíz', 'pellet', 'boilie']

  filas.sort((a, b) => a.productos - b.productos || b.especies.length - a.especies.length)
  const huecos = filas.filter((f) => f.productos === 0 && !NO_VENDIBLE.includes(f.apar))
  const noVendibles = filas.filter((f) => f.productos === 0 && NO_VENDIBLE.includes(f.apar))
  const flojos = filas.filter((f) => f.productos > 0 && f.productos < 5)

  console.log(`Catálogo: ${total} productos · ${especies.length} especies con contenido\n`)

  if (huecos.length) {
    console.log(`HUECOS — lo recomendamos y NO se puede comprar (${huecos.length}):`)
    for (const f of huecos) {
      console.log(`  ${f.apar.padEnd(18)} 0 productos · lo nombran ${f.especies.length}: ${f.especies.slice(0, 5).join(', ')}${f.especies.length > 5 ? '…' : ''}`)
    }
  } else {
    console.log('Sin huecos: todo lo que se recomienda existe en el catálogo.')
  }

  if (flojos.length) {
    console.log(`\nFLOJOS — menos de 5 productos (${flojos.length}):`)
    for (const f of flojos) {
      console.log(`  ${f.apar.padEnd(18)} ${f.productos} · lo nombran ${f.especies.length} especies`)
    }
  }

  if (noVendibles.length) {
    console.log(`\nAparte — cebo vivo y perecedero, que no se vende por catálogo (${noVendibles.length}):`)
    console.log(`  ${noVendibles.map((f) => f.apar).join(', ')}`)
  }

  const perdidas = huecos.reduce((a, f) => a + f.especies.length, 0)
  console.log(`\n${perdidas} recomendaciones apuntan a algo VENDIBLE que no está en el catálogo.`)
  console.log('Cada una es un visitante convencido que no encuentra dónde comprar.')
}

main().catch((e) => {
  console.error('FALLÓ:', e instanceof Error ? e.message : e)
  process.exit(1)
})
