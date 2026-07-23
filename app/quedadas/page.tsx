import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { listUpcomingMeetups, costInfo } from '@/lib/meetups-store'
import { getSpot } from '@/lib/fishing-spots'
import { getSpecies } from '@/lib/fishing-species'
import { todayMadridISO, fmtDayLabel } from '@/lib/solunar-format'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Quedadas de pesca: sal a pescar con más gente por tu zona',
  description:
    'Encuentra o organiza quedadas de pesca en tu zona: orilla, kayak o barco a compartir gastos. Apúntate a salidas por especie y nivel, con la previsión y la seguridad del día al lado.',
  alternates: { canonical: '/quedadas' },
}

const MOD_EMOJI: Record<string, string> = { tierra: '🏖️', kayak: '🛶', barco: '🚤' }

export default async function QuedadasHub() {
  const today = todayMadridISO()
  const meetups = await listUpcomingMeetups(today)

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">● Comunidad de pescadores</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">Quedadas de pesca</h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">
            Sal a pescar con más gente: quedadas de orilla, kayak o barco <strong className="text-ink">a compartir gastos</strong>.
            Elige por zona, especie y nivel; te enseñamos la previsión y la seguridad del día. Conoce gente y no salgas solo.
          </p>
          <div className="mt-6">
            <Link href="/quedadas/nueva" className="inline-flex items-center gap-2 bg-accent text-paper px-6 py-3 text-sm font-bold uppercase tracking-wide border border-accent rounded-xl shadow-hard hover-shift hover:bg-ink hover:border-ink">
              ➕ Organizar una quedada
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3 mb-5">Próximas salidas</h2>

        {meetups.length === 0 ? (
          <div className="border border-ink/12 rounded-2xl bg-paper p-6 text-center space-y-3">
            <p className="text-ink/70">Aún no hay quedadas publicadas. ¡Sé el primero en organizar una en tu zona!</p>
            <Link href="/quedadas/nueva" className="inline-flex items-center gap-2 bg-ink text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-accent transition-colors">
              Organizar quedada
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {meetups.map((m) => {
              const spot = getSpot(m.spotSlug)
              const sp = m.targetSpecies ? getSpecies(m.targetSpecies) : null
              const full = m.placesTaken >= m.maxPlaces
              return (
                <li key={m.id}>
                  <Link href={`/quedadas/${m.id}`} className="block border border-ink/12 rounded-2xl bg-paper p-4 hover:border-accent transition-colors h-full">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
                        {MOD_EMOJI[m.modality]} {m.modality} · <span className="capitalize">{fmtDayLabel(m.dateISO)}</span> · {m.timeStart}
                      </span>
                      <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${m.status === 'confirmed' ? 'text-accent' : 'text-ink/40'}`}>
                        {m.status === 'confirmed' ? 'Confirmada' : `${m.placesTaken}/${m.maxPlaces}`}
                      </span>
                    </div>
                    <p className="font-display uppercase text-xl text-ink leading-none mt-2">{spot?.name ?? m.spotSlug}</p>
                    <p className="text-[13px] text-ink/65 mt-1">
                      {sp ? `A por ${sp.name.toLowerCase()} · ` : ''}
                      nivel {m.level} · {costInfo(m).label}
                      {full ? ' · completa' : ` · faltan ${m.maxPlaces - m.placesTaken}`}
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        <p className="text-[12px] text-ink/50 leading-relaxed border-t border-ink/12 mt-8 pt-6">
          Las quedadas son para compartir gastos, sin ánimo de lucro. Cada participante necesita su licencia de pesca.
          ¿Buscas un chárter con patrón profesional? Eso llegará pronto a PescaPlus.
        </p>
      </section>
    </Layout>
  )
}
