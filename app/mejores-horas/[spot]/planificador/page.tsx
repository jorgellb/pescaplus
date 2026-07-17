import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import SourceBadge from '@/components/forecast/SourceBadge'
import { getSpot } from '@/lib/fishing-spots'
import { solunarDay, phaseEmoji } from '@/lib/solunar'
import { tideCoefficient } from '@/lib/tides'
import { getZoneClimate, CLIMATE_YEARS } from '@/lib/zone-climate'
import { SEA_SPECIES, SPECIES_KNOWN_TERMS } from '@/lib/fishing-species'
import { todayMadridISO, addDaysISO, fmtDayLabel } from '@/lib/solunar-format'

export const revalidate = 86400

/**
 * The 12-month planner: solunar activity and estimated tide coefficient are
 * astronomical, so we can honestly compute them a full year ahead — perfect
 * for booking a trip. Weather only exists 7 days out; that stays in the
 * hourly forecast and the month climatology covers the "usually" question.
 */

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const RATING_HEX: Record<number, string> = {
  5: '#0f766e',
  4: '#3f9d94',
  3: '#b9b29f',
  2: '#a49c8a',
  1: '#8a8272',
}

interface PlannerDay {
  dateISO: string
  day: number
  weekday: number // 0 = Monday
  rating: number
  coef: number
  phase: number
}

export async function generateMetadata({ params }: { params: Promise<{ spot: string }> }): Promise<Metadata> {
  const { spot } = await params
  const s = getSpot(spot)
  if (!s) return { title: 'Planificador no disponible' }
  return {
    title: `Mejores días para pescar en ${s.name}: calendario de 12 meses`,
    description: `Planifica tu viaje de pesca a ${s.name}: actividad solunar y mareas vivas de los próximos 12 meses, más la climatología real de cada mes (${CLIMATE_YEARS}).`,
    alternates: { canonical: `/mejores-horas/${s.slug}/planificador` },
  }
}

export default async function PlanificadorPage({ params }: { params: Promise<{ spot: string }> }) {
  const { spot } = await params
  const s = getSpot(spot)
  if (!s) notFound()

  const today = todayMadridISO()
  const byMonth = new Map<string, PlannerDay[]>()
  for (let i = 0; i < 365; i++) {
    const dateISO = addDaysISO(today, i)
    const sol = solunarDay(s.lat, s.lon, dateISO)
    const d: PlannerDay = {
      dateISO,
      day: Number(dateISO.slice(8, 10)),
      weekday: (new Date(`${dateISO}T12:00:00Z`).getUTCDay() + 6) % 7,
      rating: sol.rating,
      coef: tideCoefficient(sol.moonPhase),
      phase: sol.moonPhase,
    }
    const key = dateISO.slice(0, 7)
    const list = byMonth.get(key)
    if (list) list.push(d)
    else byMonth.set(key, [d])
  }
  const months = [...byMonth.entries()].slice(0, 12)

  const climate = getZoneClimate(s.slug)
  const known = s.known.toLowerCase()
  const zoneSpecies =
    s.type === 'mar'
      ? SEA_SPECIES.filter((sp) => (SPECIES_KNOWN_TERMS[sp.id] ?? [sp.name.toLowerCase()]).some((t) => known.includes(t)))
      : []

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12 print:border-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 print:py-4">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5 print:hidden">
            <Link href="/mejores-horas" className="hover:text-accent">Mejores horas</Link> <span className="mx-1">/</span>{' '}
            <Link href={`/mejores-horas/${s.slug}`} className="hover:text-accent">{s.name}</Link> <span className="mx-1">/</span>{' '}
            <span className="text-ink">Planificador</span>
          </nav>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">📅 Planificador de 12 meses</p>
          <h1 className="font-display uppercase text-3xl sm:text-4xl md:text-5xl leading-[1.02] text-ink">
            Mejores días en {s.name}
          </h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">
            La actividad solunar y las mareas vivas son astronomía: se pueden calcular con un año de antelación. Elige el
            mes de tu viaje con esto y la <strong className="text-ink">climatología real</strong> de cada mes; el viento y
            las olas del día concreto los tendrás en la{' '}
            <Link href={`/mejores-horas/${s.slug}`} className="text-accent underline">previsión de 7 días</Link>.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-5 font-mono text-[10px] uppercase tracking-widest text-ink/50">
            {[5, 4, 3].map((r) => (
              <span key={r} className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: RATING_HEX[r] }} />
                {r === 5 ? 'Actividad máxima' : r === 4 ? 'Alta' : 'Normal o baja'}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block border-2 border-ink/70" /> Mareas vivas (coef ≥ 85)
            </span>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
          {months.map(([key, list]) => {
            const monthIdx = Number(key.slice(5, 7)) - 1
            const year = key.slice(0, 4)
            const best = [...list].sort((a, b) => b.rating - a.rating || b.coef - a.coef).slice(0, 5)
            const bestSet = new Set(best.slice(0, 3).map((d) => d.dateISO))
            const clim = climate?.[monthIdx]
            const inSeason = zoneSpecies.filter((sp) => sp.bestMonths.includes(monthIdx + 1)).slice(0, 4)
            const offset = list[0].weekday
            return (
              <div key={key} className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-4 sm:p-5 space-y-3 break-inside-avoid">
                <div className="flex items-baseline justify-between border-b border-ink/10 pb-2">
                  <h2 className="font-display uppercase text-xl text-ink leading-none">
                    {MONTH_NAMES[monthIdx]} <span className="text-ink/40">{year}</span>
                  </h2>
                  {clim && clim.w > 0 && (
                    <span
                      className="font-mono text-[9.5px] uppercase tracking-wide text-ink/45 text-right"
                      title={`Histórico ${CLIMATE_YEARS}: media del viento máximo diario y porcentaje de días con máxima ≤ 20 km/h`}
                    >
                      hist. 💨 {Math.round(clim.w)} km/h · {clim.ok}% días buenos
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-y-1 text-center">
                  {WEEKDAYS.map((w) => (
                    <span key={w} className="font-mono text-[9px] uppercase text-ink/35">{w}</span>
                  ))}
                  {Array.from({ length: offset }, (_, i) => (
                    <span key={`e${i}`} />
                  ))}
                  {list.map((d) => (
                    <span key={d.dateISO} className="flex flex-col items-center gap-0.5 py-0.5" title={`${fmtDayLabel(d.dateISO)} · actividad ${d.rating}/5 · coef ${d.coef} ${phaseEmoji(d.phase)}`}>
                      <span className={`text-[11px] leading-none ${bestSet.has(d.dateISO) ? 'font-bold text-ink' : 'text-ink/55'}`}>{d.day}</span>
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{
                          backgroundColor: RATING_HEX[d.rating] ?? RATING_HEX[3],
                          boxShadow: d.coef >= 85 ? '0 0 0 1.5px #111111b3' : undefined,
                        }}
                      />
                    </span>
                  ))}
                </div>

                <div className="border-t border-ink/10 pt-2 space-y-1.5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Los 5 mejores</p>
                  <p className="text-[13px] text-ink/80 leading-relaxed">
                    {best.map((d, i) => (
                      <span key={d.dateISO}>
                        {i > 0 && <span className="text-ink/30"> · </span>}
                        <span className="font-bold">{fmtDayLabel(d.dateISO)}</span>
                        <span className="text-ink/50"> ({d.rating}/5{d.coef >= 85 ? `, coef ${d.coef}` : ''})</span>
                      </span>
                    ))}
                  </p>
                  {inSeason.length > 0 && (
                    <p className="text-[12px] text-ink/60">
                      🐟 En temporada:{' '}
                      {inSeason.map((sp, i) => (
                        <span key={sp.id}>
                          {i > 0 && ', '}
                          <Link href={`/especies/${sp.id}`} className="text-accent hover:underline">{sp.name}</Link>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-2">
          <SourceBadge
            source="PescaPlus (astronomía propia)"
            kind="calculado"
            extra={climate ? `climatología ERA5 ${CLIMATE_YEARS} vía Open-Meteo` : undefined}
          />
          <p className="text-[12px] text-ink/50 leading-relaxed max-w-3xl">
            La actividad (1–5) combina fase lunar y coincidencia de periodos solunares con amanecer y atardecer; el
            coeficiente de marea es el estimado del ciclo lunar. Son excelentes para elegir fechas, pero el mar del día lo
            deciden el viento y las olas: confirma siempre en la previsión de 7 días antes de salir.
          </p>
        </div>
      </section>
    </Layout>
  )
}
