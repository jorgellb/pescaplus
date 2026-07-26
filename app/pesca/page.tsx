import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { SEA_SPECIES, MONTHS_SHORT } from '@/lib/fishing-species'
import { zonesForSpecies, allSpeciesZonePairs } from '@/lib/species-zones'
import { FISHING_SPOTS } from '@/lib/fishing-spots'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'

export const revalidate = 86400

/**
 * Hub for the species × zone mesh (~1.100 pages).
 *
 * It existed only as leaves: /pesca/<especie>/<zona> resolved, but /pesca was a
 * 404 — so trimming the URL broke, and the mesh hung two clicks deep off
 * /especies with nothing consolidating it. A hub gives the cluster a root for
 * internal linking, and a page that can compete for the broad head terms the
 * leaves are too specific to win.
 */
const FAQS = [
  {
    q: '¿Qué se pesca en cada zona de España?',
    a: 'Cada zona del litoral tiene sus especies típicas según el fondo, la corriente y la temperatura del agua: lubina y dorada en casi toda la costa, atún y bonito en el Estrecho y el Mediterráneo, merluza y abadejo en el Cantábrico, o dentón y mero en el sureste. En cada ficha de especie y zona encontrarás la mejor época, la técnica y los cebos que funcionan allí.',
  },
  {
    q: '¿Cuál es la mejor época para pescar cada especie?',
    a: 'Depende de la especie y de la latitud. La lubina se pesca todo el año pero rinde más en los meses fríos; la dorada aprieta de primavera a otoño; los túnidos son de verano. En cada página te indicamos los meses buenos de esa especie en esa zona concreta, con la climatología real de los últimos años.',
  },
  {
    q: '¿Necesito licencia para pescar en el mar en España?',
    a: 'Sí. La pesca marítima recreativa exige licencia, que expide cada comunidad autónoma y suele tramitarse por internet. Además hay tallas mínimas y cupos por especie. En cada ficha te enlazamos la normativa de la comunidad correspondiente.',
  },
  {
    q: '¿Cómo sé cuándo salir a pescar?',
    a: 'Además de la temporada, el día concreto importa: viento, oleaje, mareas, presión y actividad solunar. En PescaPlus cada zona tiene una previsión hora a hora con las mejores ventanas del día, gratis y actualizada a diario.',
  },
]

export const metadata: Metadata = {
  title: 'Qué pescar en España: guía por especie y zona',
  description:
    'Guía de pesca por especie y zona en España: dónde y cuándo pescar lubina, dorada, atún, corvina o dentón en cada punto del litoral, con mejor época, técnica, cebos, talla mínima y previsión de mejores horas.',
  alternates: { canonical: '/pesca' },
}

function monthsPhrase(months: number[]): string {
  if (months.length >= 11) return 'todo el año'
  return months.map((m) => MONTHS_SHORT[m - 1].toLowerCase()).join(', ')
}

/**
 * Pick a geographically spread sample of zones instead of the first N.
 * Taking them in list order would link the same handful of Galician ports for
 * every species, concentrating the hub's internal links on a corner of the
 * coast; round-robin across regions spreads them over the whole litoral.
 */
function spreadZones<T extends { slug: string; name: string; region: string }>(zones: T[], limit: number): T[] {
  const byRegion = new Map<string, T[]>()
  for (const z of zones) {
    const list = byRegion.get(z.region) ?? []
    list.push(z)
    byRegion.set(z.region, list)
  }
  const queues = [...byRegion.values()]
  const out: T[] = []
  let i = 0
  while (out.length < limit && queues.some((q) => q.length > 0)) {
    const q = queues[i % queues.length]
    const next = q.shift()
    if (next) out.push(next)
    i += 1
  }
  return out
}

export default function PescaHub() {
  const pairs = allSpeciesZonePairs()
  // Solo las especies que realmente tienen zonas en la malla.
  const species = SEA_SPECIES
    .map((sp) => ({ sp, zones: zonesForSpecies(sp.id) }))
    .filter((x) => x.zones.length > 0)

  const seaRegions = [...new Set(FISHING_SPOTS.filter((s) => s.type === 'mar').map((s) => s.region))].sort()

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  // Un ItemList declara la colección: le dice al buscador que esto es el índice
  // de un conjunto, no una página suelta.
  const listLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Especies de pesca en España',
    numberOfItems: species.length,
    itemListElement: species.map((x, i) => ({
      '@type': 'ListItem', position: i + 1,
      name: x.sp.name, url: `${SITE_URL}/especies/${x.sp.id}`,
    })),
  }

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(breadcrumbJsonLd([
          { name: 'Inicio', url: SITE_URL },
          { name: 'Qué pescar', url: `${SITE_URL}/pesca` },
        ])),
      }} />

      <section className="bg-paper border-b border-ink/[0.07]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <nav className="text-[13px] text-ink/60 mb-4">
            <Link href="/" className="hover:text-accent">Inicio</Link>
            <span className="mx-2">/</span><span className="text-ink">Qué pescar</span>
          </nav>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-ink">
            Qué pescar en España, especie por especie y zona por zona
          </h1>
          <p className="text-ink/65 text-[17px] max-w-3xl mt-4 leading-relaxed">
            {species.length} especies × {seaRegions.length} regiones del litoral:{' '}
            <strong className="text-ink/80 font-semibold">{pairs.length} guías</strong> con la mejor época,
            la técnica que funciona, los cebos, la talla mínima legal y la previsión de mejores horas
            de esa zona. Elige por lo que quieres pescar o por dónde vas a pescar.
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <Link href="/donde-pescar" className="bg-accent text-paper px-5 py-3 text-[15px] font-semibold rounded-full hover:brightness-110 transition-all">
              Ver el mapa del día
            </Link>
            <Link href="/mejores-horas" className="bg-paper text-ink px-5 py-3 text-[15px] font-semibold rounded-full border border-ink/12 hover:border-accent hover:text-accent transition-colors">
              Previsión por zona
            </Link>
          </div>
        </div>
      </section>

      {/* Por especie: el eje que más se busca ("dónde pescar lubina"). */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="font-display text-2xl md:text-3xl text-ink">Por especie</h2>
        <p className="text-ink/60 mt-2 mb-7">Cada especie, con las zonas donde de verdad se pesca en España.</p>

        <div className="space-y-3">
          {species.map(({ sp, zones }) => (
            <article key={sp.id} className="border border-ink/[0.07] rounded-2xl bg-paper p-5 shadow-hard">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="font-display text-xl text-ink">
                  <Link href={`/especies/${sp.id}`} className="hover:text-accent transition-colors">{sp.name}</Link>
                </h3>
                <p className="text-[13px] text-ink/60">
                  Mejor época: <span className="text-ink/70">{monthsPhrase(sp.bestMonths)}</span> · {zones.length} zonas
                </p>
              </div>
              <ul className="flex flex-wrap gap-1.5 mt-3">
                {spreadZones(zones, 14).map((z) => (
                  <li key={z.slug}>
                    <Link href={`/pesca/${sp.id}/${z.slug}`}
                      className="inline-block px-3 py-1.5 text-[13.5px] text-ink/80 border border-ink/[0.09] rounded-full hover:border-accent hover:text-accent transition-colors">
                      {sp.name} en {z.name}
                    </Link>
                  </li>
                ))}
                {zones.length > 14 && (
                  <li>
                    <Link href={`/especies/${sp.id}`} className="inline-block px-3 py-1.5 text-[13.5px] font-semibold text-accent hover:underline">
                      +{zones.length - 14} zonas →
                    </Link>
                  </li>
                )}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Por zona: el otro eje de búsqueda ("qué se pesca en Tarifa"). */}
      <section className="bg-paper border-y border-ink/[0.07]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="font-display text-2xl md:text-3xl text-ink">Por zona del litoral</h2>
          <p className="text-ink/60 mt-2 mb-7">Elige tu costa y mira qué se pesca allí y cuándo.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-7">
            {seaRegions.map((region) => {
              const spots = FISHING_SPOTS.filter((s) => s.type === 'mar' && s.region === region)
              return (
                <div key={region}>
                  <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink/60 mb-2.5">{region}</h3>
                  <ul className="space-y-1.5">
                    {spots.map((s) => (
                      <li key={s.slug}>
                        <Link href={`/mejores-horas/${s.slug}`} className="text-[14.5px] text-ink/75 hover:text-accent transition-colors">
                          Pesca en {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="font-display text-2xl md:text-3xl text-ink mb-6">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group border border-ink/[0.07] rounded-2xl bg-paper p-5">
              <summary className="font-semibold text-ink cursor-pointer list-none flex items-start justify-between gap-4">
                {f.q}
                <span className="text-accent text-xl leading-none group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-[15px] text-ink/70 leading-relaxed mt-3">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </Layout>
  )
}
