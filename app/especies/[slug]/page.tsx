import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import { SEA_SPECIES, MONTHS_SHORT, deSpecies } from '@/lib/fishing-species'
import { zonesForSpecies } from '@/lib/species-zones'
import { getSpeciesGuide } from '@/lib/species-guides'
import { actionShots } from '@/lib/species-action-shots'
import { getTaxonomy, categoryName } from '@/lib/taxonomy-store'
import { NATIONAL_SIZES_URL } from '@/lib/fishing-regulations'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'
import { safeJsonLd } from '@/lib/json-ld'
import Icon, { type IconName } from '@/components/icons/Icon'

export const revalidate = 86400

/**
 * Las especies son una lista fija del código, así que cualquier slug que no
 * salga de `generateStaticParams` no existe y debe dar 404 de verdad. De eso se
 * encarga el `notFound()` de más abajo: sin él la página mostraba "Especie no
 * encontrada" pero respondía HTTP 200, un "soft 404" que Google puede indexar
 * como página viva y vacía.
 *
 * El `notFound()` de abajo no basta por sí solo: Next prerenderiza y cachea esa
 * respuesta como una entrada de 200, así que el 404 no sería real. Hace falta
 * también `dynamicParams = false`.
 *
 * Y esa bandera trae una trampa que tumbó `/categories` en producción: si la
 * copia prerenderizada caduca, Next se queda sin respaldo que servir mientras
 * regenera y devuelve 404 hasta para los slugs buenos. Esta página se libró
 * solo porque su `revalidate` de 24 h no coincidía con el `expireTime`. La
 * regla está en app/categories/[category]/page.tsx y la vigila
 * tests/routing.test.ts.
 */

type Params = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return SEA_SPECIES.map((s) => ({ slug: s.id }))
}


export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const sp = SEA_SPECIES.find((s) => s.id === slug)
  // Slug inventado: noindex. La página llama a notFound() pero Next responde 200
  // (ver el comentario de app/categories/[category]/layout.tsx).
  if (!sp) return { title: 'Especie no encontrada', robots: { index: false, follow: false } }
  return {
    title: `Pesca ${deSpecies(sp)}: temporada, técnicas, cebos y zonas`,
    description: `Cómo pescar ${sp.name.toLowerCase()} en España: mejores meses, horas, hábitat, profundidad, técnicas, cebos y señuelos, y las zonas donde se captura. Con previsión de actividad por localidad.`,
    alternates: { canonical: `/especies/${sp.id}` },
  }
}

function Row({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3 bg-paper">
      <dt className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60 flex-shrink-0 flex items-center gap-1.5">
        <Icon name={icon} className="w-3.5 h-3.5" strokeWidth={1.8} /> {label}
      </dt>
      <dd className="text-sm font-semibold text-ink text-right">{value}</dd>
    </div>
  )
}

export default async function SpeciesPage({ params }: Params) {
  const { slug } = await params
  const sp = SEA_SPECIES.find((s) => s.id === slug)
  if (!sp) notFound()

  const taxonomy = await getTaxonomy()
  const currentMonth = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', month: 'numeric' }).format(new Date()))
  const inSeason = sp.bestMonths.includes(currentMonth)
  const spots = zonesForSpecies(sp.id).slice(0, 18)

  /**
   * La prosa de la especie. Las fichas eran ricas en DATOS y pobres en texto:
   * 63 palabras propias, y todas fragmentos sueltos ("Gusana americana,
   * cangrejo ermitaño, mejillón"). Esto lo completa.
   *
   * Puede no existir todavía —se generan en lote y la cuota de IA es limitada—
   * y entonces la ficha se pinta igual, sin hueco ni aviso.
   */
  const guide = getSpeciesGuide(sp.id)
  const acciones = actionShots(sp.id)
  const cabecera = acciones.find((a) => a.layout === 'cabecera')
  const paneles = acciones.filter((a) => a.layout === 'panel')

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: 'Especies', url: `${SITE_URL}/especies` },
    { name: sp.name },
  ])

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />

      <section className="bg-paper border-b border-ink/[0.07]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/60 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
            <Link href="/especies" className="hover:text-accent">Especies</Link> <span className="mx-1">/</span>{' '}
            <span className="text-ink">{sp.name}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent">● Ficha de especie</p>
            {inSeason ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 st rounded-full border border-accent/40 text-accent">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" /> En temporada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 st rounded-full border border-ink/12 text-ink/60">
                Fuera de su mejor época
              </span>
            )}
          </div>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">
            Pesca {deSpecies(sp)}
          </h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">{sp.tagline}. Temporada, horas, técnicas, cebos y las zonas de España donde se busca.</p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-10 sm:px-6 space-y-10">
        {sp.images.length > 0 && (
          <div className={`grid gap-3 ${sp.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {sp.images.map((src) => (
              <div key={src} className="relative aspect-[16/10] rounded-2xl overflow-hidden border border-ink/[0.07] shadow-hard bg-ink/[0.05]">
                <Image
                  src={src}
                  alt={`Foto de ${sp.name.toLowerCase()}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  priority
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Season strip */}
        {guide && (
          <div className="space-y-3">
            <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/[0.07] pb-3">
              Pescar {deSpecies(sp)}
            </h2>
            <p className="text-[15px] text-ink/80 leading-relaxed">{guide.intro}</p>
            {guide.where && <p className="text-[15px] text-ink/80 leading-relaxed">{guide.where}</p>}
            {guide.techniques && <p className="text-[15px] text-ink/80 leading-relaxed">{guide.techniques}</p>}
            {guide.seasons && <p className="text-[15px] text-ink/80 leading-relaxed">{guide.seasons}</p>}
            {Array.isArray(guide.tips) && guide.tips.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {guide.tips.slice(0, 4).map((tip, i) => (
                  <li key={i} className="flex gap-2 text-[14px] text-ink/75 leading-snug">
                    <Icon name="check" className="w-4 h-4 text-accent shrink-0 mt-0.5" strokeWidth={2} />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="space-y-3">
          <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/[0.07] pb-3">Mejores meses</h2>
          <div className="grid grid-cols-12 gap-1">
            {MONTHS_SHORT.map((mo, idx) => {
              const good = sp.bestMonths.includes(idx + 1)
              const isCurrent = idx + 1 === currentMonth
              return (
                <div
                  key={mo}
                  className={`text-center text-[10px] sm:text-xs font-bold uppercase py-2 rounded ${good ? 'bg-accent text-paper' : 'bg-ink/5 text-ink/60'} ${isCurrent ? 'ring-2 ring-ink/40' : ''}`}
                >
                  {mo}
                </div>
              )
            })}
          </div>
          <p className="text-[12px] text-ink/60">El anillo marca el mes actual. Temporadas orientativas para España; varían por zona.</p>
        </div>

        {/* Fact sheet */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-3">
            <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/[0.07] pb-3">Ficha técnica</h2>
            <dl className="divide-y divide-ink/10 border border-ink/[0.07] rounded-xl overflow-hidden">
              <Row icon="thermometer" label="Tª del agua" value={`${sp.seaTempC[0]}–${sp.seaTempC[1]}°C`} />
              <Row icon="rock" label="Hábitat" value={sp.habitat} />
              <Row icon="ruler" label="Profundidad" value={sp.depth} />
              <Row icon="clock" label="Mejores horas" value={sp.hours} />
              <Row icon="ruler" label="Talla de referencia" value={sp.minSizeNote} />
            </dl>
            <p className="text-[12px] text-ink/60">
              La talla mínima legal la fija la normativa y cambia por zona: consulta la{' '}
              <a href={NATIONAL_SIZES_URL} target="_blank" rel="noopener noreferrer" className="text-accent underline">referencia oficial (MAPA)</a>.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/[0.07] pb-3">Cómo pescarla</h2>
            <div className="border border-ink/[0.07] rounded-xl bg-paper p-5 space-y-4 overflow-hidden">
              {cabecera && (
                /*
                 * Sangra hasta el borde de la tarjeta (`-mx-5 -mt-5` compensa el
                 * p-5) para que la foto haga de cabecera del bloque en lugar de
                 * flotar dentro con un marco doble.
                 */
                <figure className="-mx-5 -mt-5">
                  <div className="relative aspect-[16/9] bg-ink/[0.05] border-b border-ink/[0.07]">
                    <Image
                      src={cabecera.src}
                      alt={cabecera.alt}
                      fill
                      /*
                       * La columna mide 472 px en escritorio: `max-w-5xl` (1024)
                       * menos 48 de padding y 32 de hueco, entre dos. Por debajo
                       * de 1024 la rejilla cae a una columna y ocupa el ancho.
                       */
                      sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) calc(100vw - 48px), 472px"
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="px-5 pt-4 text-[13px] text-ink/70 leading-relaxed border-b border-ink/[0.07] pb-4">
                    {cabecera.caption}
                  </figcaption>
                </figure>
              )}
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60 mb-1">Técnicas</p>
                <p className="text-[15px] text-ink/80 leading-relaxed">{sp.technique}.</p>
              </div>
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60 mb-1">Cebos y señuelos</p>
                <p className="text-[15px] text-ink/80 leading-relaxed">{sp.baits}.</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {sp.gearCats.map((c) => (
                  <Link key={c} href={`/categories/${c}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-paper bg-ink hover:bg-accent px-3.5 py-2 rounded-lg transition-colors">
                    {categoryName(taxonomy, c)} →
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/*
          * Panel de aparejo. Solo aparece cuando la foto de acción es vertical y
          * trae texto propio: entonces no cabe de cabecera en la tarjeta estrecha
          * y se lleva su propia sección a ancho completo, con la foto a un lado.
          * Va justo detrás de «Cómo pescarla» porque es su continuación.
          */}
        {/*
          * Paneles de aparejo. Una especie puede tener varios: el pargo lleva el
          * kabura de cabecera arriba y el calamar vivo aquí abajo. La foto manda
          * la maqueta — vertical va al lado del texto, apaisada va encima.
          */}
        {paneles.map((panel) => {
          /*
           * Las clases van escritas enteras a propósito: Tailwind rastrea el
           * código fuente, y una clase construida a trozos (`aspect-[${x}]`) no
           * la ve y no la genera.
           */
          const ASPECTO = { '16/9': 'aspect-[16/9]', '4/3': 'aspect-[4/3]', '4/5': 'aspect-[4/5]' } as const
          const ratio = panel.ratio ?? '16/9'
          const apaisada = ratio !== '4/5'
          const foto = (
            <Image
              src={panel.src}
              alt={panel.alt}
              fill
              sizes={apaisada ? '(max-width: 768px) calc(100vw - 32px), 976px' : '(max-width: 768px) calc(100vw - 32px), 340px'}
              className="object-cover"
            />
          )
          const texto = (
            <div className="p-5 sm:p-7 space-y-3">
              <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/[0.07] pb-3">
                {panel.heading}
              </h2>
              <p className="text-[13px] text-ink/60 leading-relaxed">{panel.caption}</p>
              {panel.why?.map((parrafo) => (
                <p key={parrafo.slice(0, 40)} className="text-[15px] text-ink/80 leading-relaxed">
                  {parrafo}
                </p>
              ))}
            </div>
          )

          return (
            <section key={panel.src} className="border border-ink/[0.07] rounded-2xl bg-paper shadow-hard overflow-hidden">
              {apaisada ? (
                <>
                  <div className={`relative ${ASPECTO[ratio]} bg-ink/[0.05] border-b border-ink/[0.07]`}>{foto}</div>
                  {texto}
                </>
              ) : (
                /*
                 * Vertical: solo el «por qué» acompaña a la foto. Con los consejos
                 * aquí dentro el texto medía el doble que la imagen y la columna
                 * de la izquierda quedaba con un hueco en blanco enorme.
                 */
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,340px)_1fr]">
                  <div className={`relative ${ASPECTO[ratio]} bg-ink/[0.05] border-b md:border-b-0 md:border-r border-ink/[0.07]`}>
                    {foto}
                  </div>
                  {texto}
                </div>
              )}

              {/* Los cuidados, a ancho completo y en dos columnas: seis puntos en
                * una sola columna estrecha eran una tira imposible de repasar. */}
              {panel.care && (
                <div className="border-t border-ink/[0.07] p-5 sm:p-7 space-y-4">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
                    {panel.care.title}
                  </p>
                  <p className="text-[15px] text-ink/80 leading-relaxed max-w-3xl">{panel.care.intro}</p>
                  <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-1">
                    {panel.care.items.map((it, n) => (
                      <li key={it.t} className="flex gap-3">
                        <span
                          aria-hidden
                          className="shrink-0 w-6 h-6 rounded-full bg-ink text-paper font-mono text-[11px] font-bold flex items-center justify-center mt-0.5"
                        >
                          {n + 1}
                        </span>
                        <span className="text-[15px] leading-relaxed">
                          <strong className="text-ink font-semibold">{it.t}.</strong>{' '}
                          <span className="text-ink/80">{it.d}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </section>
          )
        })}

        {/* Where */}
        {spots.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/[0.07] pb-3">Dónde se busca</h2>
            {/* La carta enseña el fondo, que es lo que decide dónde presentar. */}
            <p className="text-[13px] text-ink/60">
              Mira el tipo de fondo y la sonda de cada zona en la{' '}
              <Link href="/carta" className="text-accent font-semibold hover:underline">carta náutica</Link>.
            </p>
            <p className="text-sm text-ink/60">Guías de cómo pescar {sp.name.toLowerCase()} zona a zona — temporada, técnica y mejores horas de cada localidad:</p>
            <div className="flex flex-wrap gap-2">
              {spots.map((s) => (
                <Link key={s.slug} href={`/pesca/${sp.id}/${s.slug}`} className="px-3 py-1.5 text-sm font-semibold text-ink border border-ink/10 rounded-full hover:bg-ink hover:text-paper transition-colors">
                  {s.name} <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">{s.region}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Cross links */}
        <div className="border-t border-ink/[0.07] pt-8 flex flex-wrap gap-3">
          <Link href={`/mejores-horas`} className="inline-flex items-center gap-2 bg-ink text-paper px-5 py-3 text-sm font-semibold border border-ink/10 rounded-full shadow-hard hover-shift hover:bg-accent hover:border-accent">
            <Icon name="clock" className="w-4 h-4" strokeWidth={1.8} />Mejores horas por localidad
          </Link>
          <Link href="/calendario" className="inline-flex items-center gap-2 bg-paper text-ink px-5 py-3 text-sm font-semibold border border-ink/10 rounded-full shadow-hard hover-shift">
            <Icon name="moon" className="w-4 h-4" strokeWidth={1.6} />Calendario del pescador
          </Link>
          <Link href="/advice" className="inline-flex items-center gap-2 bg-paper text-ink px-5 py-3 text-sm font-semibold border border-ink/10 rounded-full shadow-hard hover-shift">
            <Icon name="rod" className="w-4 h-4" strokeWidth={1.8} />Preguntar al asesor
          </Link>
        </div>

        {/* Other species */}
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60 mb-3">Otras especies</p>
          <div className="flex flex-wrap gap-2">
            {SEA_SPECIES.filter((o) => o.id !== sp.id).map((o) => (
              <Link key={o.id} href={`/especies/${o.id}`} className="px-3 py-1.5 text-xs font-bold text-ink border border-ink/10 rounded-full hover:bg-ink hover:text-paper transition-colors">
                {o.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  )
}
