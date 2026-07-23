import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import { getSpot } from '@/lib/fishing-spots'
import { SEA_SPECIES, MONTHS_SHORT } from '@/lib/fishing-species'
import { speciesForZone, zonesForSpecies, isSpeciesZone } from '@/lib/species-zones'
import { buildZoneFacts } from '@/lib/zone-facts'
import { getZoneClimate, CLIMATE_YEARS } from '@/lib/zone-climate'
import { getRegulation, NATIONAL_SIZES_URL } from '@/lib/fishing-regulations'
import { getTaxonomy, categoryName } from '@/lib/taxonomy-store'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'

export const revalidate = 86400

type Params = { params: Promise<{ especie: string; zona: string }> }

// On-demand ISR for the whole mesh (~1.1k pages): first hit generates + caches,
// the sitemap makes them discoverable. Keeps the build fast.
export function generateStaticParams() {
  return [] as { especie: string; zona: string }[]
}

function monthsPhrase(months: number[]): string {
  if (months.length >= 11) return 'todo el año'
  return months.map((m) => MONTHS_SHORT[m - 1].toLowerCase()).join(', ')
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { especie, zona } = await params
  const sp = SEA_SPECIES.find((s) => s.id === especie)
  const spot = getSpot(zona)
  if (!sp || !spot || !isSpeciesZone(especie, zona)) return { title: 'Página no encontrada' }
  const n = sp.name.toLowerCase()
  return {
    title: `Cómo pescar ${n} en ${spot.name}: temporada, cebo y mejores horas`,
    description: `Guía para pescar ${n} en ${spot.name} (${spot.region}): mejor época (${monthsPhrase(sp.bestMonths)}), técnica, cebos, talla mínima y previsión de mejores horas hora a hora. Todo lo que necesitas para tu próxima salida.`,
    alternates: { canonical: `/pesca/${sp.id}/${spot.slug}` },
  }
}

export default async function SpeciesZonePage({ params }: Params) {
  const { especie, zona } = await params
  const sp = SEA_SPECIES.find((s) => s.id === especie)
  const spot = getSpot(zona)
  if (!sp || !spot || !isSpeciesZone(especie, zona)) notFound()

  const facts = buildZoneFacts(spot)
  const climate = getZoneClimate(spot.slug)
  const regulation = getRegulation(spot.region)
  const taxonomy = await getTaxonomy()
  const n = sp.name.toLowerCase()

  // The calmest of the species' best months here (from real ERA5 climatology).
  const bestCalmMonth =
    climate
      ? sp.bestMonths
          .map((m) => ({ m, ok: climate[m - 1]?.ok ?? 0 }))
          .sort((a, b) => b.ok - a.ok)[0]
      : null

  const otherSpecies = speciesForZone(spot).filter((x) => x.id !== sp.id)
  const otherZones = zonesForSpecies(sp.id, spot, 9).filter((z) => z.slug !== spot.slug).slice(0, 8)

  const waveWord = sp.wavePref === 'rough' ? 'con mar movida y algo de rompiente' : sp.wavePref === 'calm' ? 'con mar tranquila y poca ola' : 'con mar moderada'
  const windWord = `viento flojo o moderado (${sp.windSweet[0]}–${sp.windSweet[1]} km/h la mueven bien)`

  const faqs: { q: string; a: string }[] = [
    {
      q: `¿Cuándo es la mejor época para pescar ${n} en ${spot.name}?`,
      a: `Los mejores meses para la ${n} en ${spot.name} son ${monthsPhrase(sp.bestMonths)}, cuando el agua ronda los ${sp.seaTempC[0]}–${sp.seaTempC[1]} °C.${bestCalmMonth ? ` Según el histórico de la zona, ${MONTHS_SHORT[bestCalmMonth.m - 1].toLowerCase()} suele ser el más apacible (${bestCalmMonth.ok}% de días de mar tratable).` : ''}`,
    },
    {
      q: `¿Qué cebo o técnica funciona mejor con la ${n}?`,
      a: `${sp.technique}. Cebos que dan resultado: ${sp.baits}. Busca ${sp.habitat.toLowerCase()}, a ${sp.depth}.`,
    },
    {
      q: `¿Cuáles son las mejores horas del día?`,
      a: `${sp.hours}. Afínalo con el calendario solunar y la previsión de ${spot.name}, que marca las ventanas hora a hora para ${n}.`,
    },
    {
      q: `¿Cuál es la talla mínima de la ${n}?`,
      a: `${sp.minSizeNote}. La talla legal la fija ${regulation ? regulation.authority : 'la comunidad autónoma'}; confírmala siempre antes de salir.`,
    },
  ]

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: 'Especies', url: `${SITE_URL}/especies` },
    { name: sp.name, url: `${SITE_URL}/especies/${sp.id}` },
    { name: spot.name, url: `${SITE_URL}/pesca/${sp.id}/${spot.slug}` },
  ])

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
            <Link href={`/especies/${sp.id}`} className="hover:text-accent">{sp.name}</Link> <span className="mx-1">/</span>{' '}
            <span className="text-ink">{spot.name}</span>
          </nav>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">🎣 Guía de pesca · {sp.name}</p>
          <h1 className="font-display uppercase text-3xl sm:text-4xl md:text-5xl leading-[1.02] text-ink">
            Pesca de {n} en {spot.name}
          </h1>
          <p className="text-ink/70 text-[15px] max-w-2xl mt-4 leading-relaxed">
            {sp.name} en {spot.name} ({spot.region}), sobre {facts.sea}
            {facts.orientation ? `, costa orientada al ${facts.orientation}` : ''}. {sp.tagline}. Su temporada fuerte aquí va de{' '}
            <strong className="text-ink">{monthsPhrase(sp.bestMonths)}</strong>, con el agua entre {sp.seaTempC[0]} y {sp.seaTempC[1]} °C.
            Aquí tienes cuándo, cómo y con qué buscarla, más la previsión de mejores horas de la zona.
          </p>

          {/* Quick facts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
            {[
              { k: 'Mejor época', v: monthsPhrase(sp.bestMonths) },
              { k: 'Talla orientativa', v: sp.minSizeNote.split('(')[0].trim() },
              { k: 'Técnica', v: sp.technique.split(';')[0] },
              { k: 'Mejores horas', v: sp.hours.split(';')[0] },
            ].map((f) => (
              <div key={f.k} className="border border-ink/12 rounded-xl bg-paper px-3 py-2.5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">{f.k}</p>
                <p className="text-sm font-bold text-ink mt-1 leading-tight capitalize">{f.v}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href={`/mejores-horas/${spot.slug}?especie=${sp.id}`}
              className="inline-flex items-center gap-2 bg-accent text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide border border-accent rounded-xl shadow-hard hover-shift hover:bg-ink hover:border-ink"
            >
              📈 Ver mejores horas para {n} en {spot.name}
            </Link>
            <Link
              href={`/mejores-horas/${spot.slug}/planificador`}
              className="inline-flex items-center gap-2 bg-paper text-ink px-5 py-2.5 text-xs font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift hover:bg-ink hover:text-paper"
            >
              📅 Planificador anual
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* CUÁNDO */}
        <div className="space-y-3">
          <h2 className="font-display uppercase text-2xl md:text-3xl text-ink border-b border-ink/12 pb-3">¿Cuándo pescar {n} en {spot.name}?</h2>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const on = sp.bestMonths.includes(m)
              return (
                <span key={m} className={`font-mono text-[11px] font-bold uppercase tracking-wide rounded-lg px-2.5 py-1.5 border ${on ? 'bg-accent text-paper border-accent' : 'bg-paper text-ink/40 border-ink/12'}`}>
                  {MONTHS_SHORT[m - 1]}
                </span>
              )
            })}
          </div>
          <p className="text-[15px] text-ink/80 leading-relaxed">
            La {n} entra mejor de <strong className="text-ink">{monthsPhrase(sp.bestMonths)}</strong>, con el agua entre {sp.seaTempC[0]} y {sp.seaTempC[1]} °C.
            {bestCalmMonth && (
              <> En {spot.name}, de esos meses <strong className="text-ink">{MONTHS_SHORT[bestCalmMonth.m - 1].toLowerCase()}</strong> suele dar el mar más tratable ({bestCalmMonth.ok}% de días buenos según el histórico {CLIMATE_YEARS}), buen momento para planificar la salida.</>
            )}{' '}
            Cuadra el día con el <Link href={`/mejores-horas/${spot.slug}/planificador`} className="text-accent underline">planificador de 12 meses</Link> y la actividad solunar.
          </p>
        </div>

        {/* CÓMO */}
        <div className="space-y-3">
          <h2 className="font-display uppercase text-2xl md:text-3xl text-ink border-b border-ink/12 pb-3">¿Cómo pescar {n} aquí?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { k: 'Dónde buscarla', v: sp.habitat },
              { k: 'Profundidad', v: sp.depth },
              { k: 'Técnica', v: sp.technique },
              { k: 'Cebos y señuelos', v: sp.baits },
              { k: 'Mejores horas', v: sp.hours },
              { k: 'Mareas y costa', v: `${facts.tides}${facts.orientation ? `. Costa al ${facts.orientation}` : ''}` },
            ].map((f) => (
              <div key={f.k} className="border border-ink/12 rounded-xl bg-paper p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent mb-1">{f.k}</p>
                <p className="text-[14px] text-ink/85 leading-relaxed">{f.v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CONDICIONES */}
        <div className="space-y-3">
          <h2 className="font-display uppercase text-2xl md:text-3xl text-ink border-b border-ink/12 pb-3">Condiciones y previsión en {spot.name}</h2>
          <p className="text-[15px] text-ink/80 leading-relaxed">
            La {n} responde mejor {waveWord} y con {windWord}. En {spot.name} eso depende del día: nuestra previsión cruza viento, oleaje,
            mareas y solunar para puntuar cada hora pensando en esta especie. Antes de coger los bártulos, mira la ventana del día.
          </p>
          <Link
            href={`/mejores-horas/${spot.slug}?especie=${sp.id}`}
            className="inline-flex items-center gap-2 bg-ink text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift hover:bg-accent hover:border-accent"
          >
            📈 Previsión hora a hora para {n} en {spot.name}
          </Link>
        </div>

        {/* NORMATIVA */}
        <div className="space-y-3">
          <h2 className="font-display uppercase text-2xl md:text-3xl text-ink border-b border-ink/12 pb-3">Talla mínima y normativa</h2>
          <p className="text-[15px] text-ink/80 leading-relaxed">
            Talla orientativa: <strong className="text-ink">{sp.minSizeNote}</strong>. La talla mínima legal y las vedas las fija{' '}
            {regulation ? (
              <>
                <strong className="text-ink">{regulation.authority}</strong> ({spot.region}) — consulta la{' '}
                <a href={regulation.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline">normativa y licencia oficial</a>
              </>
            ) : (
              'tu comunidad autónoma'
            )}
            . Referencia estatal de tallas:{' '}
            <a href={NATIONAL_SIZES_URL} target="_blank" rel="noopener noreferrer" className="text-accent underline">Ministerio de Pesca</a>. Devuelve siempre lo que no llegue a talla.
          </p>
        </div>

        {/* EQUIPO */}
        <div className="space-y-3">
          <h2 className="font-display uppercase text-2xl md:text-3xl text-ink border-b border-ink/12 pb-3">Equipo para la {n}</h2>
          <div className="flex flex-wrap gap-2">
            {sp.gearCats.map((c) => (
              <Link key={c} href={`/categories/${c}`} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-paper bg-ink hover:bg-accent px-3.5 py-2 rounded-lg transition-colors">
                {categoryName(taxonomy, c)} →
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <h2 className="font-display uppercase text-2xl md:text-3xl text-ink border-b border-ink/12 pb-3">Preguntas frecuentes</h2>
          <div className="space-y-2">
            {faqs.map((f) => (
              <details key={f.q} className="group border border-ink/12 rounded-xl bg-paper px-4 py-3 [&_summary]:list-none">
                <summary className="flex items-center justify-between gap-3 cursor-pointer text-[15px] font-bold text-ink">
                  {f.q}
                  <span className="flex-shrink-0 text-accent transition-transform group-open:rotate-45 text-lg leading-none">+</span>
                </summary>
                <p className="mt-2 text-[14px] text-ink/80 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* INTERLINKS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t border-ink/12 pt-8">
          {otherSpecies.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display uppercase text-xl text-ink">Otras especies en {spot.name}</h2>
              <div className="flex flex-wrap gap-2">
                {otherSpecies.map((x) => (
                  <Link key={x.id} href={`/pesca/${x.id}/${spot.slug}`} className="px-3 py-1.5 text-sm font-semibold text-ink border border-ink/15 rounded-full hover:bg-ink hover:text-paper transition-colors">
                    {x.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {otherZones.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display uppercase text-xl text-ink">{sp.name} en otras zonas</h2>
              <div className="flex flex-wrap gap-2">
                {otherZones.map((z) => (
                  <Link key={z.slug} href={`/pesca/${sp.id}/${z.slug}`} className="px-3 py-1.5 text-sm font-semibold text-ink border border-ink/15 rounded-full hover:bg-ink hover:text-paper transition-colors">
                    {z.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-[13px] text-ink/55 leading-relaxed border-t border-ink/12 pt-6">
          ¿Buscas más? Ficha completa de la <Link href={`/especies/${sp.id}`} className="text-accent underline">{n}</Link>, previsión de{' '}
          <Link href={`/mejores-horas/${spot.slug}`} className="text-accent underline">pesca en {spot.name}</Link> y el mapa del día en{' '}
          <Link href="/donde-pescar" className="text-accent underline">¿dónde pescar?</Link>.
        </p>
      </section>
    </Layout>
  )
}
