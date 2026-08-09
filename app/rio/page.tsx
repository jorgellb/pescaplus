import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Layout from '@/components/Layout'
import SelectorAgua from '@/components/SelectorAgua'
import { FRESHWATER_SPECIES } from '@/lib/freshwater-species'
import { MONTHS_SHORT, deSpecies } from '@/lib/fishing-species'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'
import { safeJsonLd } from '@/lib/json-ld'

export const revalidate = 86400

/**
 * Índice de agua dulce.
 *
 * Sección propia y no una pestaña dentro de /especies: son públicos distintos
 * —quien pesca black bass en un embalse de Extremadura no comparte casi nada con
 * quien hace surfcasting en Cádiz—, y separarlas deja que cada una compita en
 * Google por lo suyo en vez de diluirse en una página mezclada.
 *
 * Las fichas SÍ se comparten: viven en /especies/[slug], que ya sabe leer las
 * dos listas. Duplicar la ficha solo serviría para que una de las dos copias se
 * quedara atrás.
 */

export const metadata: Metadata = {
  title: 'Pesca en agua dulce: especies de río y embalse en España',
  description:
    'Black bass, lucio, lucioperca, trucha, barbo, carpa, siluro y más. Temporada, hábitat, profundidad, técnicas y cebos de cada especie de agua dulce en España, con aviso de la normativa que le aplica.',
  alternates: { canonical: '/rio' },
}

export default function RioPage() {
  const mesActual = Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', month: 'numeric' }).format(new Date()),
  )

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: 'Agua dulce' },
  ])

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />

      <section className="bg-paper border-b border-ink/[0.07]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/60 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
            <span className="text-ink">Agua dulce</span>
          </nav>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">● Río y embalse</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">
            Pesca en agua dulce
          </h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">
            {FRESHWATER_SPECIES.length} especies de río, embalse y laguna. Cuándo entran, dónde se buscan, con qué se
            pescan — y qué dice la normativa de cada una, que aquí cambia más que en el mar.
          </p>
          <SelectorAgua activo="rio" />
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-10 sm:px-6 space-y-8">
        {/*
          * El aviso va arriba del todo y no en letra pequeña al final: en agua
          * dulce la mitad de las especies deportivas son exóticas invasoras, y
          * devolverlas al agua —lo que cualquier pescador haría por instinto— es
          * ilegal en varias comunidades. Es la diferencia entre una jornada y una
          * sanción, así que se dice antes de que nadie coja la caña.
          */}
        <div className="border border-amber-300 bg-amber-50 rounded-xl p-5">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-amber-900 mb-2">
            Antes de salir: normativa
          </p>
          <p className="text-[15px] text-amber-950 leading-relaxed">
            En agua dulce la norma cambia por <strong>comunidad autónoma</strong>, por río y por temporada, mucho más que
            en el mar. Varias de las especies de esta lista —black bass, lucio, lucioperca, siluro, perca sol— están
            catalogadas como <strong>exóticas invasoras</strong> por el Real Decreto 630/2013: su suelta está prohibida y
            algunas comunidades obligan a sacrificar los ejemplares capturados en lugar de devolverlos. Otras, como la{' '}
            <strong>anguila</strong>, están en peligro crítico y su pesca está prohibida o muy restringida. Cada ficha lo
            avisa, pero la orden anual de tu comunidad manda siempre sobre lo que leas aquí.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FRESHWATER_SPECIES.map((sp, i) => {
            const enTemporada = sp.bestMonths.includes(mesActual)
            return (
              <Link
                key={sp.id}
                href={`/especies/${sp.id}`}
                className="group flex flex-col bg-paper border border-ink/10 rounded-2xl shadow-hard hover-shift overflow-hidden"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-ink/[0.05] border-b border-ink/[0.07]">
                  {sp.images[0] ? (
                    <Image
                      src={sp.images[0]}
                      alt={`Foto de ${sp.name.toLowerCase()}`}
                      fill
                      /* Mismo cálculo que en /especies: la tarjeta mide 476 px como
                       * mucho dentro de `max-w-5xl` a dos columnas. */
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) calc(50vw - 36px), 476px"
                      priority={i < 4}
                      className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  ) : (
                    /*
                     * Hueco a la espera de foto. Se pinta a propósito en vez de
                     * dejar la tarjeta sin imagen: así la rejilla mantiene su
                     * altura y se ve de un vistazo cuáles faltan por ilustrar.
                     */
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink/40">
                      <span className="text-3xl" aria-hidden>{sp.emoji}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest">Foto pendiente</span>
                    </div>
                  )}
                  {enTemporada && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-semibold bg-paper/95 text-accent border border-accent/40 rounded-full px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" /> Temporada
                    </span>
                  )}
                </div>
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <h2 className="font-display uppercase text-2xl text-ink leading-none group-hover:text-accent transition-colors">
                    {sp.name}
                  </h2>
                  <p className="text-[13px] text-ink/60 leading-relaxed flex-1">{sp.tagline}.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sp.bestMonths.map((m) => (
                      <span
                        key={m}
                        className={`font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          m === mesActual ? 'bg-accent text-paper' : 'bg-ink/[0.06] text-ink/60'
                        }`}
                      >
                        {MONTHS_SHORT[m - 1]}
                      </span>
                    ))}
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
                    Pesca {deSpecies(sp)} →
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        <p className="text-[13px] text-ink/60">
          ¿Buscas mar? Las 29 especies de costa están en{' '}
          <Link href="/especies" className="text-accent underline">
            especies de mar
          </Link>
          .
        </p>
      </section>
    </Layout>
  )
}
