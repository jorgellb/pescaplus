import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import DayScoreMap from '@/components/forecast/DayScoreMap'
import NearMeDay from '@/components/forecast/NearMeDay'
import SourceBadge from '@/components/forecast/SourceBadge'
import { getDayBoard, DAY_BOARD_REVALIDATE_S } from '@/lib/day-scores'
import { MODALITIES } from '@/lib/marine-forecast'
import { scoreHex, scoreLabel, windWord } from '@/lib/forecast-format'
import { fmtDayLabel, fmtDateLong, todayMadridISO } from '@/lib/solunar-format'

export const metadata: Metadata = {
  title: '¿Dónde pescar hoy? Mapa del día y ranking de zonas de España',
  description:
    'El mapa del día de la pesca en España: las 195 zonas puntuadas por viento, oleaje y actividad para el día que elijas. Descubre dónde pescar hoy o este fin de semana, cerca de ti.',
  alternates: { canonical: '/donde-pescar' },
}

type Params = { searchParams: Promise<{ dia?: string; modo?: string }> }

export default async function DondePescarPage({ searchParams }: Params) {
  const { dia, modo } = await searchParams
  const board = await getDayBoard(dia, modo)
  const today = todayMadridISO()
  const showNav = board.modality.id !== 'tierra'

  const mar = board.spots.filter((s) => s.type === 'mar')
  const interior = board.spots.filter((s) => s.type === 'interior')
  const top = [...mar].sort((a, b) => b.score - a.score || (a.windMax ?? 99) - (b.windMax ?? 99)).slice(0, 15)
  const worst = [...mar].sort((a, b) => a.score - b.score).slice(0, 3)
  const topInterior = [...interior].sort((a, b) => b.score - a.score || (a.windMax ?? 99) - (b.windMax ?? 99)).slice(0, 4)

  const dayName = board.dateISO === today ? 'hoy' : fmtDayLabel(board.dateISO)

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">● El mapa del día</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">¿Dónde pescar?</h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">
            La pregunta inversa: en vez de elegir zona y mirar cuándo, elige el día y mira dónde. Las {board.spots.length}{' '}
            zonas de España puntuadas para <strong className="text-ink capitalize">{dayName}</strong> ({fmtDateLong(board.dateISO)})
            según viento, rachas, oleaje y actividad prevista.
          </p>

          {/* Day tabs */}
          <div className="flex gap-1.5 overflow-x-auto mt-6 pb-1 scrollbar-none">
            {board.days.map((d) => (
              <Link
                key={d}
                href={`/donde-pescar?dia=${d}${board.modality.id !== 'tierra' ? `&modo=${board.modality.id}` : ''}`}
                className={`shrink-0 px-3.5 py-2 rounded-xl border font-mono text-[11px] font-bold uppercase tracking-wide transition-colors ${
                  d === board.dateISO
                    ? 'bg-ink text-paper border-ink'
                    : 'bg-paper text-ink/70 border-ink/15 hover:border-accent hover:text-accent'
                }`}
              >
                {d === today ? 'Hoy' : fmtDayLabel(d)}
              </Link>
            ))}
          </div>

          {/* Modality tabs */}
          <div className="flex gap-1.5 mt-3">
            {MODALITIES.map((m) => (
              <Link
                key={m.id}
                href={`/donde-pescar?dia=${board.dateISO}${m.id !== 'tierra' ? `&modo=${m.id}` : ''}`}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold uppercase tracking-wide transition-colors ${
                  m.id === board.modality.id
                    ? 'bg-accent text-paper border-accent'
                    : 'bg-paper text-ink/70 border-ink/15 hover:border-accent hover:text-accent'
                }`}
              >
                {m.emoji} {m.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {!board.available && (
          <div className="border border-amber-700/30 rounded-2xl bg-amber-700/[0.05] p-5 text-sm text-ink/75">
            Ahora mismo no podemos calcular el mapa del día (fallo temporal del modelo). Vuelve a intentarlo en unos
            minutos o consulta tu zona directamente en{' '}
            <Link href="/mejores-horas" className="text-accent underline">mejores horas</Link>.
          </div>
        )}

        {board.available && (
          <>
            <NearMeDay spots={board.spots} showNav={showNav} />

            <div className="space-y-3">
              <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3">
                🗺️ España, zona a zona
              </h2>
              <DayScoreMap spots={board.spots} showNav={showNav} />
              <SourceBadge
                source="Open-Meteo + solunar propio"
                kind="previsto"
                fetchedAt={board.fetchedAt}
                revalidateS={DAY_BOARD_REVALIDATE_S}
                extra={`máximas diarias por zona · actividad solunar del día ${board.solunarRating}/5`}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 space-y-3">
                <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3">
                  🏆 Top 15 de la costa · <span className="capitalize">{dayName}</span>
                </h2>
                <ol className="space-y-2">
                  {top.map((s, i) => (
                    <li key={s.slug}>
                      <Link
                        href={`/mejores-horas/${s.slug}`}
                        className="flex items-center gap-3 border border-ink/12 rounded-xl px-3.5 py-3 bg-paper hover:border-accent transition-colors"
                      >
                        <span className="font-mono text-xs font-bold text-ink/40 w-6 text-right shrink-0">{i + 1}</span>
                        <span
                          className="font-mono text-base font-bold text-paper rounded-lg px-2.5 py-1 shrink-0"
                          style={{ backgroundColor: scoreHex(s.score) }}
                        >
                          {s.score}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold text-ink truncate">{s.name}</span>
                          <span className="block font-mono text-[10px] uppercase tracking-widest text-ink/45 truncate">
                            {s.region} · {scoreLabel(s.score)}
                            {showNav && !s.navegable ? ' · ⚠️ no navegable' : ''}
                          </span>
                        </span>
                        <span className="hidden sm:block text-right shrink-0 font-mono text-[11px] text-ink/55 leading-relaxed">
                          {s.windMax != null && (
                            <span className="block">💨 {Math.round(s.windMax)} km/h · {windWord(s.windMax)}</span>
                          )}
                          {s.waveMax != null && <span className="block">🌊 {s.waveMax.toFixed(1)} m máx</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-6">
                {topInterior.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="font-display uppercase text-xl md:text-2xl leading-none border-b border-ink/12 pb-3">
                      🎣 Embalses
                    </h2>
                    <ol className="space-y-2">
                      {topInterior.map((s) => (
                        <li key={s.slug}>
                          <Link
                            href={`/mejores-horas/${s.slug}`}
                            className="flex items-center gap-3 border border-ink/12 rounded-xl px-3.5 py-2.5 bg-paper hover:border-accent transition-colors"
                          >
                            <span
                              className="font-mono text-sm font-bold text-paper rounded-lg px-2 py-1 shrink-0"
                              style={{ backgroundColor: scoreHex(s.score) }}
                            >
                              {s.score}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-bold text-ink text-sm truncate">{s.name}</span>
                              <span className="block font-mono text-[10px] uppercase tracking-widest text-ink/45">{s.region}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="border border-red-700/25 rounded-2xl bg-red-700/[0.04] p-4 space-y-2">
                  <h2 className="font-display uppercase text-lg leading-none">🚫 Mejor evita</h2>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink/45">Las peores del día en la costa</p>
                  <ul className="space-y-1.5">
                    {worst.map((s) => (
                      <li key={s.slug} className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-xs font-bold text-paper rounded-md px-1.5 py-0.5" style={{ backgroundColor: scoreHex(s.score) }}>
                          {s.score}
                        </span>
                        <Link href={`/mejores-horas/${s.slug}`} className="font-bold text-ink hover:text-accent truncate">
                          {s.name}
                        </Link>
                        <span className="font-mono text-[10px] uppercase text-ink/45 ml-auto shrink-0">
                          {s.windMax != null ? `💨 ${Math.round(s.windMax)}` : ''}
                          {s.waveMax != null ? ` 🌊 ${s.waveMax.toFixed(1)}m` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="border-t border-ink/12 pt-8 space-y-3 text-[15px] text-ink/80 leading-relaxed">
          <h2 className="font-display uppercase text-2xl text-ink">Cómo leer el mapa del día</h2>
          <p>
            Cada punto es una zona con su <strong>puntuación de 0 a 100</strong> para el día elegido: combinamos las
            máximas diarias de viento, rachas y oleaje del modelo con la actividad solunar prevista. En modalidad{' '}
            <strong>embarcación o kayak</strong>, las zonas que superan los límites de navegación seguros aparecen
            marcadas como no navegables. Es un ranking para decidir el destino: una vez elegida la zona, entra en su
            ficha para ver la <Link href="/mejores-horas" className="text-accent underline">previsión hora a hora</Link>,
            las mareas y tu <strong>plan de pesca</strong> completo.
          </p>
        </div>
      </section>
    </Layout>
  )
}
