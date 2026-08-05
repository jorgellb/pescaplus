import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Layout from '@/components/Layout'
import CharterFilters from '@/components/charters/CharterFilters'
import { listPublicCharters } from '@/lib/charters-store'
import { parseCharterFilter, isFiltered, describeFilter } from '@/lib/charter-filters'
import { FISHING_SPOTS, getSpot } from '@/lib/fishing-spots'
import { getSpecies } from '@/lib/fishing-species'
import { todayMadridISO, fmtDayLabel } from '@/lib/solunar-format'
import Icon, { type IconName } from '@/components/icons/Icon'
import DayDial from '@/components/charters/DayDial'
import FishingWindow, { FishingWindowSummary } from '@/components/charters/FishingWindow'
import { charterWindow, bestSpotToday } from '@/lib/charter-window'

export const dynamic = 'force-dynamic'

const BASE_METADATA: Metadata = {
  title: 'Chárters de pesca en España: sal con patrón profesional',
  description: 'Reserva una salida de pesca con patrón profesional verificado (licencia y seguro): barco, día, precio por persona y previsión del día. Directorio de chárters de pesca por zona.',
  alternates: { canonical: '/charters' },
}

/**
 * Una combinación de filtros es una vista, no una página: se marca noindex y el
 * canónico sigue apuntando al listado limpio, para no abrirle al rastreador un
 * espacio infinito de URLs con el mismo contenido barajado.
 */
export async function generateMetadata({ searchParams }: Params): Promise<Metadata> {
  const filter = parseCharterFilter(await searchParams)
  if (!isFiltered(filter)) return BASE_METADATA
  const label = describeFilter(filter)
  return {
    ...BASE_METADATA,
    title: label ? `Chárters de pesca: ${label}` : BASE_METADATA.title as string,
    robots: { index: false, follow: true },
  }
}

const MOD: Record<string, IconName> = { tierra: 'umbrella', kayak: 'kayak', barco: 'boat' }

type Params = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function ChartersHub({ searchParams }: Params) {
  const filter = parseCharterFilter(await searchParams)
  const filtered = isFiltered(filter)
  const hoy = todayMadridISO()
  const charters = await listPublicCharters(hoy, filter)
  const spots = FISHING_SPOTS.map((s) => ({ slug: s.slug, name: s.name }))

  // Ventana de pesca por salida. Es cálculo astronómico local y memoizado (ver
  // lib/charter-window.ts), así que sale gratis aunque el listado sea largo.
  const ventanas = new Map(
    charters.flatMap((c) => {
      const w = charterWindow(c.spotSlug, c.dateISO)
      return w ? [[c.id, w] as const] : []
    }),
  )

  // Solo para el estado vacío: la mejor zona de hoy, para no enseñar un hueco.
  const destacada = charters.length === 0 && !filtered ? bestSpotToday(hoy) : null
  const destacadaSpot = destacada ? getSpot(destacada.slug) : null
  return (
    <Layout>
      {/* Cabecera con la foto del chárter de fondo. Mismo tratamiento que en la
          portada: UN degradado, más cerrado por la izquierda —donde va el
          texto— y abierto por la derecha. El contraste va medido, no a ojo. */}
      <section className="relative isolate overflow-hidden border-b border-ink/[0.07]">
        <Image
          src="/imagenesHome/barco_pesca_web_charters.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover -z-20"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/80 via-ink/60 to-ink/40" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--accent)_45%,white)] mb-3"><Icon name="anchor" className="w-3.5 h-3.5 inline -mt-0.5" strokeWidth={2} /> Chárters con patrón profesional</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-paper">Sal a pescar con un profesional</h1>
          <p className="text-paper/80 text-[15px] max-w-2xl mt-3 leading-relaxed">Reserva plaza en salidas de pesca con <strong className="text-paper">patrón profesional verificado</strong> (licencia y seguro comprobados). Con la previsión y la seguridad del día al lado.</p>
          <div className="mt-6">
            <Link href="/charters/operador" className="inline-flex items-center gap-2 bg-paper text-ink px-6 py-3 text-sm font-semibold rounded-full shadow-hard hover-shift hover:bg-accent hover:text-paper">
              <Icon name="anchor" className="w-3.5 h-3.5 inline -mt-0.5" strokeWidth={2} /> ¿Eres patrón? Ofrece tus salidas
            </Link>
          </div>
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        {/* Los filtros viven en la URL: la vista es compartible y navegable. */}
        <CharterFilters initial={filter} spots={spots} resultCount={charters.length} />

        <div>
          <h2 className="font-display text-2xl md:text-3xl text-ink">
            {filtered ? 'Resultados' : 'Próximos chárters'}
          </h2>
          {filtered && describeFilter(filter) && (
            <p className="text-[14px] text-ink/60 mt-1">{describeFilter(filter)}</p>
          )}
        </div>

        {charters.length === 0 ? (
          filtered ? (
            <div className="border border-ink/[0.07] rounded-2xl bg-paper p-6 text-center text-ink/70">
              Ninguna salida coincide con esos filtros.{' '}
              <Link href="/charters" className="text-accent font-semibold underline">Ver todos los chárters</Link>.
            </div>
          ) : (
            /* Sin salidas publicadas todavía. En vez de una caja gris pidiendo
               perdón, se enseña lo que SÍ tenemos —la ventana de pesca de hoy—
               y se le da al patrón un motivo concreto para publicar aquí. */
            <div className="border border-ink/[0.07] rounded-2xl bg-paper shadow-hard overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-6 sm:p-8">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
                    Todavía no hay salidas publicadas
                  </p>
                  <h3 className="font-display uppercase text-3xl sm:text-4xl leading-[1.02] text-ink mt-3">
                    Sé el primer patrón<br />de tu zona
                  </h3>
                  <p className="text-[14px] text-ink/70 leading-relaxed mt-4">
                    Publicar es gratis y no cobramos por adelantado. Comprobamos tu titulación y tu
                    seguro a mano, y tu salida sale acompañada de la previsión real de ese día — que
                    es lo que convierte a un curioso en una reserva.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href="/charters/operador"
                      className="inline-flex items-center gap-2 bg-ink text-paper px-5 py-2.5 text-sm font-semibold rounded-full shadow-hard hover-shift hover:bg-accent">
                      <Icon name="anchor" className="w-4 h-4" strokeWidth={2} /> Publicar mi salida
                    </Link>
                    <Link href="/quedadas"
                      className="inline-flex items-center gap-2 border border-ink/15 text-ink px-5 py-2.5 text-sm font-semibold rounded-full hover:border-accent hover:text-accent">
                      <Icon name="users" className="w-4 h-4" strokeWidth={2} /> Ver quedadas
                    </Link>
                  </div>
                </div>
                {destacada && (
                  <div className="border-t md:border-t-0 md:border-l border-ink/[0.07] bg-ink/[0.02] p-6 flex flex-col justify-center">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 text-center">
                      Hoy, la mejor ventana está en {destacadaSpot?.name}
                    </p>
                    <DayDial window={destacada.window} className="w-full max-w-[320px] mx-auto" />
                    <p className="text-center -mt-2">
                      <FishingWindowSummary window={destacada.window} />
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {charters.map((c) => {
              const spot = getSpot(c.spotSlug); const sp = c.targetSpecies ? getSpecies(c.targetSpecies) : null
              return (
                <li key={c.id}>
                  <Link href={`/charters/${c.id}`} className="block border border-ink/[0.07] rounded-2xl bg-paper overflow-hidden hover:border-accent transition-colors h-full shadow-hard hover-shift">
                    {/* La portada del patrón: lo que de verdad vende una salida. */}
                    {c.operator?.photos?.[0] && (
                      <div className="relative aspect-[16/9] bg-ink/[0.05]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.operator.photos[0]} alt={`${c.operator.boatName || 'Barco'} en ${spot?.name ?? c.spotSlug}`}
                          loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-semibold text-accent"><Icon name={MOD[c.modality]} className="w-3.5 h-3.5 inline -mt-0.5" strokeWidth={2} /> <span className="first-letter:uppercase inline-block">{fmtDayLabel(c.dateISO)}</span> · {c.timeStart}</span>
                        <span className="text-[12px] font-medium text-ink/60">{c.placesTaken}/{c.maxPlaces}</span>
                      </div>
                      <p className="font-display text-xl text-ink mt-1.5">{c.highlights || spot?.name || c.spotSlug}</p>
                      <p className="text-[13px] text-ink/65 mt-1">
                        {c.operator?.businessName || c.operator?.name} · patrón verificado <Icon name="checkCircle" className="w-3 h-3 inline -mt-0.5 text-accent" strokeWidth={2.2} />{sp ? ` · a por ${sp.name.toLowerCase()}` : ''}
                      </p>
                      <p className="text-[15px] font-bold text-ink mt-1.5">
                        {c.pricePerPerson} €<span className="font-normal text-ink/60">/persona</span>
                        {c.durationH ? <span className="font-normal text-ink/60"> · {c.durationH} h</span> : null}
                      </p>
                      {/* La ventana de pesca de ESE día en ESA zona. Cálculo
                          local, así que ponerla en cada tarjeta no cuesta red. */}
                      {ventanas.get(c.id) && (
                        <div className="mt-3 pt-3 border-t border-ink/[0.07]">
                          <FishingWindow window={ventanas.get(c.id)!} />
                          <p className="mt-1.5"><FishingWindowSummary window={ventanas.get(c.id)!} /></p>
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </Layout>
  )
}
