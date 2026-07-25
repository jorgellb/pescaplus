import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import CharterFilters from '@/components/charters/CharterFilters'
import { listPublicCharters } from '@/lib/charters-store'
import { parseCharterFilter, isFiltered, describeFilter } from '@/lib/charter-filters'
import { FISHING_SPOTS, getSpot } from '@/lib/fishing-spots'
import { getSpecies } from '@/lib/fishing-species'
import { todayMadridISO, fmtDayLabel } from '@/lib/solunar-format'

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

const MOD: Record<string, string> = { tierra: '🏖️', kayak: '🛶', barco: '🚤' }

type Params = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function ChartersHub({ searchParams }: Params) {
  const filter = parseCharterFilter(await searchParams)
  const filtered = isFiltered(filter)
  const charters = await listPublicCharters(todayMadridISO(), filter)
  const spots = FISHING_SPOTS.map((s) => ({ slug: s.slug, name: s.name }))
  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">⚓ Chárters con patrón profesional</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">Sal a pescar con un profesional</h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">Reserva plaza en salidas de pesca con <strong className="text-ink">patrón profesional verificado</strong> (licencia y seguro comprobados). Con la previsión y la seguridad del día al lado.</p>
          <div className="mt-6">
            <Link href="/charters/operador" className="inline-flex items-center gap-2 bg-ink text-paper px-6 py-3 text-sm font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift hover:bg-accent hover:border-accent">
              ⚓ ¿Eres patrón? Ofrece tus salidas
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
            <p className="text-[14px] text-ink/55 mt-1">{describeFilter(filter)}</p>
          )}
        </div>

        {charters.length === 0 ? (
          <div className="border border-ink/[0.07] rounded-2xl bg-paper p-6 text-center text-ink/70">
            {filtered ? (
              <>
                Ninguna salida coincide con esos filtros.{' '}
                <Link href="/charters" className="text-accent font-semibold underline">Ver todos los chárters</Link>.
              </>
            ) : (
              <>
                Aún no hay chárters publicados. ¿Eres patrón profesional?{' '}
                <Link href="/charters/operador" className="text-accent underline">Regístrate y ofrece tus salidas</Link>.
              </>
            )}
          </div>
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
                        <span className="text-[12px] font-semibold text-accent">{MOD[c.modality]} <span className="first-letter:uppercase inline-block">{fmtDayLabel(c.dateISO)}</span> · {c.timeStart}</span>
                        <span className="text-[12px] font-medium text-ink/40">{c.placesTaken}/{c.maxPlaces}</span>
                      </div>
                      <p className="font-display text-xl text-ink mt-1.5">{c.highlights || spot?.name || c.spotSlug}</p>
                      <p className="text-[13px] text-ink/65 mt-1">
                        {c.operator?.businessName || c.operator?.name} · patrón verificado ✓{sp ? ` · a por ${sp.name.toLowerCase()}` : ''}
                      </p>
                      <p className="text-[15px] font-bold text-ink mt-1.5">
                        {c.pricePerPerson} €<span className="font-normal text-ink/55">/persona</span>
                        {c.durationH ? <span className="font-normal text-ink/55"> · {c.durationH} h</span> : null}
                      </p>
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
