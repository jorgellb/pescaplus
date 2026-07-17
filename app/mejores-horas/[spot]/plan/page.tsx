import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import PlanActions from '@/components/forecast/PlanActions'
import SourceBadge from '@/components/forecast/SourceBadge'
import { getSpot } from '@/lib/fishing-spots'
import { solunarDay } from '@/lib/solunar'
import { getMarineForecast, bestWindow, groupByDay, getModality, FORECAST_REVALIDATE_S } from '@/lib/marine-forecast'
import { getTides, tideCoefficient, coefficientLabel } from '@/lib/tides'
import { getSpecies, SEA_SPECIES } from '@/lib/fishing-species'
import { outAndBack, safetyAlerts, dayVerdict, gearForConditions, douglasState } from '@/lib/sea-state'
import { rankSpeciesToday } from '@/lib/what-to-fish'
import { buildTimeline } from '@/lib/plan'
import { getRegulation } from '@/lib/fishing-regulations'
import { getAemetBulletin, type AemetBulletin } from '@/lib/aemet'
import { aemetZoneFor } from '@/lib/aemet-zones'
import { generatePlanAdvice } from '@/lib/nvidia-ai'
import { scoreHex, windWord } from '@/lib/forecast-format'
import { fmtTime, fmtDateLong, fmtDayLabel, fmtWindowRange, todayMadridISO, addDaysISO } from '@/lib/solunar-format'

type Params = {
  params: Promise<{ spot: string }>
  searchParams: Promise<{ dia?: string; especie?: string; modo?: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ spot: string }> }): Promise<Metadata> {
  const { spot } = await params
  const s = getSpot(spot)
  if (!s) return { title: 'Plan no disponible' }
  return {
    title: `Plan de pesca en ${s.name}: horario, mareas y estrategia`,
    description: `Plan de pesca completo para ${s.name}: mejor ventana, cronograma de mareas y solunar, especie objetivo, equipo recomendado y seguridad.`,
    robots: { index: false, follow: true },
  }
}

export default async function PlanPage({ params, searchParams }: Params) {
  const { spot } = await params
  const { dia, especie, modo } = await searchParams
  const s = getSpot(spot)
  if (!s) notFound()

  const today = todayMadridISO()
  const validDays = Array.from({ length: 7 }, (_, i) => addDaysISO(today, i))
  const targetDay = dia && validDays.includes(dia) ? dia : today
  const dayIdx = validDays.indexOf(targetDay)

  const species = getSpecies(especie)
  const modality = getModality(s.type === 'mar' ? modo : 'tierra')
  const sol = solunarDay(s.lat, s.lon, targetDay)
  const aemetZone = aemetZoneFor(s)
  const [forecast, tides, aemet] = await Promise.all([
    getMarineForecast(s, species.id === 'general' ? null : species.id, modality.id),
    s.type === 'mar' ? getTides(s.lat, s.lon) : Promise.resolve(null),
    aemetZone ? getAemetBulletin(aemetZone.costa, aemetZone.keyword) : Promise.resolve(null as AemetBulletin | null),
  ])

  const dayGroup = groupByDay(forecast.hours).find((g) => g.dateISO === targetDay)
  const hours = dayGroup?.hours ?? []
  const dayStart = hours[0]?.time ?? 0
  const win = hours.length ? bestWindow(hours) : null
  const extremes = tides?.available ? tides.all.filter((e) => e.time >= dayStart - 6 * 3600000 && e.time < dayStart + 30 * 3600000) : []
  const coef = tideCoefficient(sol.moonPhase)
  const outing = s.type === 'mar' && modality.id !== 'tierra' && hours.length ? outAndBack(hours, modality) : null
  const alerts = hours.length ? safetyAlerts(hours) : []
  const timeline = hours.length ? buildTimeline({ sol, extremes, win, dayStart }) : []

  // Representative hour for gear/conditions: the window start (or midday).
  const repHour = win ? hours.find((h) => h.time >= win.start) ?? hours[Math.min(12, hours.length - 1)] : hours[Math.min(12, hours.length - 1)] ?? null
  const gearTips = gearForConditions(repHour)
  const sea = repHour ? douglasState(repHour.waveM) : null
  const uvMax = hours.length ? Math.max(...hours.map((h) => h.uv ?? 0)) : 0

  const picks =
    s.type === 'mar'
      ? rankSpeciesToday({ month: Number(targetDay.slice(5, 7)), seaTempC: repHour?.seaTempC ?? null, waveM: repHour?.waveM ?? null, solunarRating: sol.rating }).slice(0, 2)
      : []
  const targetSpecies = species.id !== 'general' ? species : picks[0]?.species ?? null

  const verdict = hours.length
    ? dayVerdict({ hours, window: win, tideNote: extremes.find((e) => e.time >= dayStart && e.type === 'alta') ? `pleamar a las ${fmtTime(extremes.find((e) => e.time >= dayStart && e.type === 'alta')!.time)} (coef ${coef})` : null })
    : ''

  // Facts for the AI narrative — computed numbers only.
  const facts: string[] = [
    win && hours.length ? `Mejor ventana: ${fmtWindowRange(win.start, win.end, dayStart)} (puntuación ${win.avg}/100)` : 'Sin ventana destacada calculada',
    repHour?.windKmh != null ? `Viento en la ventana: ${Math.round(repHour.windKmh)} km/h ${repHour.windDirLabel ?? ''} (${windWord(repHour.windKmh)})` : '',
    sea ? `Estado del mar: ${sea.name}${repHour?.waveM != null ? ` (${repHour.waveM.toFixed(1)} m)` : ''}` : '',
    repHour?.seaTempC != null ? `Agua a ${Math.round(repHour.seaTempC)}°C` : '',
    extremes.length >= 2 ? `Mareas del día: ${extremes.filter((e) => e.time >= dayStart && e.time < dayStart + 24 * 3600000).map((e) => `${e.type} ${fmtTime(e.time)}`).join(', ')} · coeficiente ${coef} (${coefficientLabel(coef)})` : '',
    `Solunar: ${sol.periods.filter((p) => p.kind === 'mayor').map((p) => `mayor ${fmtTime(p.start)}-${fmtTime(p.end)}`).join(' y ')}`,
    targetSpecies ? `Especie objetivo: ${targetSpecies.name} — ${targetSpecies.technique}` : '',
    outing ? `Salida en ${modality.name.toLowerCase()}: ${fmtTime(outing.departure)}, regreso antes de ${outing.returnBy >= dayStart + 24 * 3600000 ? '24:00' : fmtTime(outing.returnBy)}` : '',
  ].filter(Boolean)

  const advice = hours.length
    ? await generatePlanAdvice({
        spotName: s.name,
        dateLong: fmtDateLong(targetDay),
        modality: modality.name,
        speciesName: targetSpecies?.name ?? 'general',
        facts,
      })
    : ''

  const regulation = getRegulation(s.region)
  const waText = `🎣 Plan de pesca — ${s.name}, ${fmtDateLong(targetDay)}\n${win && hours.length ? `🎯 Mejor ventana: ${fmtWindowRange(win.start, win.end, dayStart)} (${win.avg}/100)\n` : ''}${targetSpecies ? `🐟 Objetivo: ${targetSpecies.name}\n` : ''}Plan completo:`

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12 print:border-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 print:py-4">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5 print:hidden">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
            <Link href="/mejores-horas" className="hover:text-accent">Mejores horas</Link> <span className="mx-1">/</span>{' '}
            <Link href={`/mejores-horas/${s.slug}`} className="hover:text-accent">{s.name}</Link> <span className="mx-1">/</span>{' '}
            <span className="text-ink">Plan</span>
          </nav>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">🧾 Plan de pesca · {modality.name}{targetSpecies ? ` · ${targetSpecies.name}` : ''}</p>
          <h1 className="font-display uppercase text-3xl sm:text-4xl md:text-5xl leading-[1.02] text-ink">
            {s.name} — <span className="capitalize">{fmtDateLong(targetDay)}</span>
          </h1>

          {/* Day picker */}
          <div className="flex gap-1.5 overflow-x-auto mt-5 pb-1 scrollbar-none print:hidden">
            {validDays.map((d, i) => (
              <Link
                key={d}
                href={`/mejores-horas/${s.slug}/plan?dia=${d}${especie ? `&especie=${especie}` : ''}${modo ? `&modo=${modo}` : ''}`}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-tight border transition-colors capitalize ${
                  i === dayIdx ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink/70 border-ink/15 hover:bg-ink/5'
                }`}
              >
                {i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : fmtDayLabel(d)}
              </Link>
            ))}
          </div>

          <div className="mt-4">
            <PlanActions waText={waText} />
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-8 sm:px-6 space-y-8 print:py-2">
        {hours.length === 0 ? (
          <div className="border border-ink/15 rounded-2xl bg-paper p-6 text-sm text-ink/50">
            La previsión de este día no está disponible ahora mismo. Vuelve a intentarlo en unos minutos.
          </div>
        ) : (
          <>
            {/* Executive summary */}
            <div className="border-2 border-ink rounded-2xl bg-paper shadow-hard-md p-6 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {win && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/[0.06] px-3.5 py-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">Mejor ventana</span>
                    <span className="font-display text-2xl text-ink">{fmtWindowRange(win.start, win.end, dayStart)}</span>
                    <span className="text-paper text-xs font-bold rounded px-2 py-0.5" style={{ background: scoreHex(win.avg) }}>{win.avg}</span>
                  </span>
                )}
                {outing && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-3.5 py-2">
                    <span aria-hidden>{modality.emoji}</span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Salida {fmtTime(outing.departure)} · regreso {outing.returnBy >= dayStart + 24 * 3600000 ? '24:00' : fmtTime(outing.returnBy)}</span>
                  </span>
                )}
              </div>
              {verdict && <p className="text-[15px] text-ink/85 leading-relaxed"><span className="font-bold">📋 </span>{verdict}</p>}
              {aemet?.hasAviso && (
                <p className="text-sm font-semibold rounded-xl border border-red-700/40 bg-red-700/[0.07] text-red-900 px-4 py-3">
                  ⚠️ Aviso oficial de AEMET: {aemet.avisoTexto}
                </p>
              )}
              {alerts.map((a, i) => (
                <p key={i} className={`text-sm font-semibold rounded-xl border px-4 py-3 ${a.level === 'peligro' ? 'border-red-700/40 bg-red-700/[0.07] text-red-900' : 'border-amber-600/40 bg-amber-500/[0.08] text-amber-900'}`}>
                  {a.level === 'peligro' ? '🚫' : '⚠️'} {a.text}
                </p>
              ))}
            </div>

            {/* AI advice */}
            {advice && (
              <div className="border-l-4 border-accent bg-accent/[0.05] rounded-r-2xl px-5 py-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent mb-2">🎣 El consejo de nuestro asesor</p>
                <p className="text-[15px] text-ink/85 leading-relaxed whitespace-pre-line">{advice}</p>
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-3">
              <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3">Cronograma del día</h2>
              <ol className="relative border-l-2 border-ink/12 ml-3 space-y-4 pt-1">
                {timeline.map((t, i) => (
                  <li key={i} className="ml-5 relative">
                    <span className={`absolute -left-[27px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] ${t.highlight ? 'bg-accent border-accent' : 'bg-paper border-ink/30'}`} aria-hidden />
                    <div className={`rounded-xl border px-4 py-3 ${t.highlight ? 'border-accent/40 bg-accent/[0.05]' : 'border-ink/12 bg-paper'}`}>
                      <p className="flex items-center gap-2 font-bold text-ink text-sm">
                        <span aria-hidden>{t.icon}</span>
                        <span className="font-display text-lg">{fmtTime(t.time)}</span>
                        {t.title}
                      </p>
                      <p className="text-[13px] text-ink/65 leading-relaxed mt-1">{t.note}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Species + gear checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {picks.length > 0 && (
                <div className="border border-ink/15 rounded-2xl bg-paper p-5 space-y-3">
                  <h2 className="font-display uppercase text-xl text-ink leading-none border-b border-ink/12 pb-3">🎯 Objetivo del día</h2>
                  {(targetSpecies ? [{ species: targetSpecies, reasons: picks.find((p) => p.species.id === targetSpecies.id)?.reasons ?? [] }] : picks).map((p) => (
                    <div key={p.species.id} className="space-y-1.5">
                      <p className="font-display uppercase text-lg text-ink">{p.species.name}</p>
                      {p.reasons.length > 0 && <p className="text-[13px] text-ink/65">{p.reasons.join(', ')}.</p>}
                      <p className="text-[13px] text-ink/75"><strong>Técnica:</strong> {p.species.technique}.</p>
                      <p className="text-[13px] text-ink/75"><strong>Cebos:</strong> {p.species.baits}.</p>
                      <Link href={`/especies/${p.species.id}`} className="inline-block font-mono text-[11px] font-bold uppercase tracking-widest text-accent hover:underline print:hidden">Ficha completa →</Link>
                    </div>
                  ))}
                </div>
              )}

              <div className="border border-ink/15 rounded-2xl bg-paper p-5 space-y-3">
                <h2 className="font-display uppercase text-xl text-ink leading-none border-b border-ink/12 pb-3">🎒 Checklist de equipo</h2>
                <ul className="space-y-2 text-[14px] text-ink/80">
                  {gearTips.map((t) => (
                    <li key={t.text} className="flex items-start gap-2.5">
                      <span className="mt-0.5 w-4 h-4 border-2 border-ink/30 rounded flex-shrink-0" aria-hidden />
                      <span>
                        {t.text}{' '}
                        <Link href={t.href} className="text-accent underline print:hidden">{t.label}</Link>
                      </span>
                    </li>
                  ))}
                  {(targetSpecies?.gearCats ?? []).slice(0, 2).map((c) => (
                    <li key={c} className="flex items-start gap-2.5">
                      <span className="mt-0.5 w-4 h-4 border-2 border-ink/30 rounded flex-shrink-0" aria-hidden />
                      <span>
                        Repasa tu material de{' '}
                        <Link href={`/categories/${c}`} className="text-accent underline">{c.replace('-', ' ')}</Link>
                      </span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2.5">
                    <span className="mt-0.5 w-4 h-4 border-2 border-ink/30 rounded flex-shrink-0" aria-hidden />
                    <span>Licencia de pesca en vigor{regulation ? <> (<a href={regulation.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline print:no-underline">{s.region}</a>)</> : null}</span>
                  </li>
                  {uvMax >= 7 && (
                    <li className="flex items-start gap-2.5">
                      <span className="mt-0.5 w-4 h-4 border-2 border-ink/30 rounded flex-shrink-0" aria-hidden />
                      <span>Protección solar: UV máximo {Math.round(uvMax)} previsto</span>
                    </li>
                  )}
                  <li className="flex items-start gap-2.5">
                    <span className="mt-0.5 w-4 h-4 border-2 border-ink/30 rounded flex-shrink-0" aria-hidden />
                    <span>Frontal si apuras la última luz ({fmtTime(sol.lastLight)})</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Safety footer */}
            <div className="border border-ink/15 rounded-2xl bg-paper p-5 space-y-2">
              <h2 className="font-display uppercase text-xl text-ink leading-none">🦺 Seguridad</h2>
              <p className="text-[13px] text-ink/70 leading-relaxed">
                Emergencias: <strong>112</strong>{s.type === 'mar' ? <> · Salvamento Marítimo: <strong>900 202 202</strong></> : null}. Avisa de tu plan a alguien,
                revisa el estado del mar al llegar{modality.id !== 'tierra' ? ', lleva chaleco y medios de comunicación' : ' y no des la espalda al mar en la roca'}.
                Última luz a las {fmtTime(sol.lastLight)}.
              </p>
              <SourceBadge source="Open-Meteo + solunar PescaPlus" kind="previsto" fetchedAt={forecast.meta.fetchedAt} revalidateS={FORECAST_REVALIDATE_S} distanceKm={forecast.meta.gridKm} extra="plan orientativo — valora las condiciones sobre el terreno" />
            </div>

            <div className="print:hidden">
              <Link href={`/mejores-horas/${s.slug}${especie || modo ? `?${new URLSearchParams({ ...(especie ? { especie } : {}), ...(modo ? { modo } : {}) })}` : ''}`} className="font-mono text-xs font-bold uppercase tracking-widest text-accent hover:underline">
                ← Volver a la previsión completa de {s.name}
              </Link>
            </div>
          </>
        )}
      </section>
    </Layout>
  )
}
