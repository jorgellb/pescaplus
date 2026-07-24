import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import MeetupList, { type MeetupCard } from '@/components/quedadas/MeetupList'
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

export default async function QuedadasHub() {
  const today = todayMadridISO()
  const meetups = await listUpcomingMeetups(today)

  const cards: MeetupCard[] = meetups.flatMap((m) => {
    const spot = getSpot(m.spotSlug)
    if (!spot) return []
    const sp = m.targetSpecies ? getSpecies(m.targetSpecies) : null
    return [{
      id: m.id,
      spotSlug: m.spotSlug,
      spotName: spot.name,
      region: spot.region,
      lat: spot.lat,
      lon: spot.lon,
      modality: m.modality,
      kind: m.kind,
      dayLabel: fmtDayLabel(m.dateISO),
      timeStart: m.timeStart,
      speciesName: sp && sp.id !== 'general' ? sp.name : null,
      level: m.level,
      costLabel: costInfo(m).label,
      status: m.status,
      placesTaken: m.placesTaken,
      maxPlaces: m.maxPlaces,
    }]
  })
  const quedadaCards = cards.filter((c) => c.kind !== 'llamada')
  const llamadaCards = cards.filter((c) => c.kind === 'llamada')

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
          <div className="flex flex-wrap gap-3 mt-6">
            <Link href="/quedadas/nueva" className="inline-flex items-center gap-2 bg-accent text-paper px-6 py-3 text-sm font-bold uppercase tracking-wide border border-accent rounded-xl shadow-hard hover-shift hover:bg-ink hover:border-ink">
              ➕ Organizar una quedada
            </Link>
            <Link href="/quedadas/nueva?tipo=llamada" className="inline-flex items-center gap-2 bg-paper text-ink px-6 py-3 text-sm font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift hover:bg-ink hover:text-paper">
              🙋 ¿Quién se apunta?
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <div>
          <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3 mb-5">Próximas salidas</h2>
          {quedadaCards.length === 0 ? (
            <div className="border border-ink/12 rounded-2xl bg-paper p-6 text-center space-y-3">
              <p className="text-ink/70">Aún no hay salidas concretas. ¡Organiza la primera en tu zona!</p>
              <Link href="/quedadas/nueva" className="inline-flex items-center gap-2 bg-ink text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-accent transition-colors">
                Organizar quedada
              </Link>
            </div>
          ) : (
            <MeetupList meetups={quedadaCards} />
          )}
        </div>

        <div>
          <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3 mb-2 flex items-center gap-2">
            <span aria-hidden>🙋</span> ¿Quién se apunta?
          </h2>
          <p className="text-sm text-ink/60 mb-5">Pescadores buscando compañía en su zona, sin hora fija. Apúntate y, cuando seáis suficientes, os coordináis.</p>
          {llamadaCards.length === 0 ? (
            <div className="border border-ink/12 rounded-2xl bg-paper p-6 text-center space-y-3">
              <p className="text-ink/70">Nadie ha lanzado una llamada todavía. Dila tú: aunque no haya quedada, di dónde quieres pescar y que se sumen.</p>
              <Link href="/quedadas/nueva?tipo=llamada" className="inline-flex items-center gap-2 bg-ink text-paper px-5 py-2.5 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-accent transition-colors">
                Lanzar una llamada
              </Link>
            </div>
          ) : (
            <MeetupList meetups={llamadaCards} />
          )}
        </div>

        <p className="text-[12px] text-ink/50 leading-relaxed border-t border-ink/12 pt-6">
          Las quedadas son para compartir gastos, sin ánimo de lucro. Cada participante necesita su licencia de pesca.
          ¿Buscas un chárter con patrón profesional? Eso llegará pronto a PescaPlus.
        </p>
      </section>
    </Layout>
  )
}
