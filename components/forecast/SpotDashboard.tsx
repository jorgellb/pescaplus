import Link from 'next/link'
import Layout from '@/components/Layout'
import FishRating from '@/components/FishRating'
import HourlyTable from '@/components/forecast/HourlyTable'
import WindChart from '@/components/forecast/WindChart'
import TideChart from '@/components/forecast/TideChart'
import ActivityChart from '@/components/forecast/ActivityChart'
import DayTabs from '@/components/forecast/DayTabs'
import { FISHING_SPOTS, type FishingSpot } from '@/lib/fishing-spots'
import { solunarDay, type SolunarDay } from '@/lib/solunar'
import { getMarineForecast, bestWindow, groupByDay } from '@/lib/marine-forecast'
import { getTides, tideCoefficient, coefficientLabel, tideHeightAt } from '@/lib/tides'
import { getSpecies, GENERAL, SEA_SPECIES } from '@/lib/fishing-species'
import { douglasState, safetyAlerts, navigationWindows, dayVerdict, gearForConditions } from '@/lib/sea-state'
import { seawardBearing, windRelation, windRelationLabel } from '@/lib/coast'
import { scoreLabel, scoreHex, windWord, weatherEmoji } from '@/lib/forecast-format'
import { fmtTime, fmtDayLabel, fmtDateLong, todayMadridISO, addDaysISO, ratingLabel } from '@/lib/solunar-format'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'

function WindArrow({ deg }: { deg: number | null }) {
  if (deg == null) return <span className="text-ink/30">–</span>
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ transform: `rotate(${deg + 180}deg)` }} className="inline-block">
      <path d="M12 2l5 10h-3.2v10h-3.6V12H7z" />
    </svg>
  )
}

function Metric({ label, value, icon, sub }: { label: string; value: React.ReactNode; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="border border-ink/12 rounded-xl bg-paper px-3 py-2.5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40 flex items-center gap-1">
        <span aria-hidden>{icon}</span> {label}
      </p>
      <p className="text-sm font-bold text-ink mt-1 leading-tight">{value}</p>
      {sub && <p className="font-mono text-[10px] uppercase tracking-wide text-ink/40 capitalize">{sub}</p>}
    </div>
  )
}

export default async function SpotDashboard({
  spot: s,
  especie,
  speciesHref,
  subtitle,
}: {
  spot: FishingSpot
  especie: string | null
  /** Builds the URL for a species chip (null = general). */
  speciesHref: (id: string | null) => string
  /** Small line under the title (e.g. "Cerca de Cádiz"). */
  subtitle?: string
}) {
  const species = getSpecies(especie)
  const today = todayMadridISO()
  const days = Array.from({ length: 7 }, (_, i) => solunarDay(s.lat, s.lon, addDaysISO(today, i)))
  const d0 = days[0]
  const [forecast, tides] = await Promise.all([
    getMarineForecast(s, species.id === 'general' ? null : species.id),
    s.type === 'mar' ? getTides(s.lat, s.lon) : Promise.resolve(null),
  ])

  const hours = forecast.hours
  const nowHour = hours.find((h) => h.isNow) ?? hours[0] ?? null
  const now = nowHour?.time ?? hours[0]?.time ?? 0
  const todayHours = hours.filter((h) => h.dateISO === today)

  let pressureTrend: string | null = null
  if (nowHour?.pressure != null) {
    const idx = hours.indexOf(nowHour)
    const past = idx >= 3 ? hours[idx - 3] : null
    if (past?.pressure != null) {
      const diff = nowHour.pressure - past.pressure
      pressureTrend = diff > 0.6 ? 'subiendo' : diff < -0.6 ? 'bajando' : 'estable'
    }
  }

  const bestToday = [...todayHours]
    .filter((h) => h.time >= now - 3600000)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .sort((a, b) => a.time - b.time)

  const majors = d0.periods.filter((p) => p.kind === 'mayor')
  const minors = d0.periods.filter((p) => p.kind === 'menor')

  const byDay = groupByDay(hours).slice(0, 7)
  const solByDate = new Map<string, SolunarDay>(days.map((d) => [d.date, d]))
  const dayLabel = (dateISO: string, i: number) => (i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : fmtDayLabel(dateISO))

  const whyFactors = nowHour
    ? ([
        nowHour.solunar && 'Periodo solunar',
        nowHour.twilight && 'Amanecer / atardecer',
        pressureTrend === 'bajando' && 'Presión bajando',
        nowHour.windKmh != null && nowHour.windKmh >= species.windSweet[0] && nowHour.windKmh <= species.windSweet[1] && 'Viento ideal',
      ].filter(Boolean) as string[])
    : []

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: 'Mejores horas de pesca', url: `${SITE_URL}/mejores-horas` },
    { name: s.name },
  ])

  const scoreNoun = species.id === 'general' ? 'Actividad de pesca' : `Actividad · ${species.name}`

  // Safety, sea state, onshore/offshore wind and gear advice.
  const fromNow = nowHour ? hours.slice(Math.max(0, hours.indexOf(nowHour))) : hours
  const alerts = safetyAlerts(fromNow)
  const seaNow = nowHour ? douglasState(nowHour.waveM) : null
  const seaward = seawardBearing(s)
  const windRel =
    seaward != null && nowHour?.windDir != null && (nowHour.windKmh ?? 0) >= 5
      ? windRelationLabel(windRelation(nowHour.windDir, seaward))
      : null
  const gearTips = gearForConditions(nowHour)
  const uvMaxToday = todayHours.length ? Math.max(...todayHours.map((h) => h.uv ?? 0)) : 0

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
            <Link href="/mejores-horas" className="hover:text-accent">Mejores horas</Link> <span className="mx-1">/</span>{' '}
            <span className="text-ink">{s.name}</span>
          </nav>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">
            {s.type === 'mar' ? '● Pesca en el mar' : '● Pesca en agua dulce'} · {s.region}
          </p>
          <h1 className="font-display uppercase text-3xl sm:text-4xl md:text-5xl leading-[1.02] text-ink break-words">
            Pesca en {s.name}
          </h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">
            {subtitle ? `${subtitle}. ` : ''}Previsión completa para el pescador: viento, {s.type === 'mar' ? 'mareas, oleaje, ' : ''}presión, solunar y las mejores horas. {fmtDateLong(today)}.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 sm:px-6 space-y-10">
        {/* Safety alerts */}
        {alerts.map((a, i) => (
          <div
            key={i}
            role="alert"
            className={`rounded-2xl border px-5 py-4 text-sm font-semibold flex items-start gap-3 ${
              a.level === 'peligro' ? 'border-red-700/40 bg-red-700/[0.07] text-red-900' : 'border-amber-600/40 bg-amber-500/[0.08] text-amber-900'
            }`}
          >
            <span className="text-xl leading-none" aria-hidden>{a.level === 'peligro' ? '🚫' : '⚠️'}</span>
            <span>{a.text}</span>
          </div>
        ))}

        {/* Species selector (sea only) */}
        {s.type === 'mar' && (
          <div className="border border-ink/15 rounded-2xl bg-paper p-4 space-y-2">
            <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Puntuación para especie</p>
            <div className="flex flex-wrap gap-2">
              {[GENERAL, ...SEA_SPECIES].map((sp) => {
                const active = sp.id === species.id
                return (
                  <Link
                    key={sp.id}
                    href={speciesHref(sp.id === 'general' ? null : sp.id)}
                    scroll={false}
                    className={`px-3 py-1.5 text-sm font-bold rounded-full border transition-colors ${active ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink/80 border-ink/15 hover:bg-ink/5'}`}
                  >
                    {sp.name}
                  </Link>
                )
              })}
            </div>
            <p className="text-[12px] text-ink/50">{species.tagline}. La puntuación de abajo se adapta a la especie elegida.</p>
          </div>
        )}

        {/* NOW dashboard */}
        {nowHour ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3 border-b border-ink/12 pb-4">
                <h2 className="font-display uppercase text-2xl text-ink leading-none">Ahora</h2>
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50">{nowHour.hourLabel}</span>
              </div>
              <div className="text-center py-5">
                <div className="text-6xl font-display leading-none" style={{ color: scoreHex(nowHour.score) }}>{nowHour.score}</div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mt-2">{scoreNoun} · {scoreLabel(nowHour.score)}</p>
              </div>
              <div className="flex items-center justify-between border-t border-ink/12 pt-4">
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50">Solunar hoy</span>
                <div className="text-right"><FishRating value={d0.rating} /><p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mt-1">{ratingLabel(d0.rating)}</p></div>
              </div>
            </div>

            <div className="lg:col-span-2 border border-ink/15 rounded-2xl bg-paper shadow-hard p-6 space-y-4">
              <h2 className="font-display uppercase text-2xl text-ink leading-none border-b border-ink/12 pb-4">Condiciones actuales</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Metric label="Viento" icon="💨" value={<span className="inline-flex items-center gap-1.5">{nowHour.windKmh ?? '–'} km/h <WindArrow deg={nowHour.windDir} /> {nowHour.windDirLabel}</span>} sub={windWord(nowHour.windKmh)} />
                <Metric label="Rachas" icon="🌬️" value={nowHour.gustKmh != null ? `${nowHour.gustKmh} km/h` : '–'} />
                <Metric label="Presión" icon="📊" value={nowHour.pressure != null ? `${Math.round(nowHour.pressure)} hPa` : '–'} sub={pressureTrend ?? undefined} />
                {s.type === 'mar' && (
                  <Metric
                    label="Estado del mar"
                    icon="🌊"
                    value={seaNow ? seaNow.name : nowHour.waveM != null ? `${nowHour.waveM.toFixed(1)} m` : '–'}
                    sub={nowHour.waveM != null ? `${nowHour.waveM.toFixed(1)} m · periodo ${nowHour.wavePeriod != null ? Math.round(nowHour.wavePeriod) : '–'}s` : undefined}
                  />
                )}
                {s.type === 'mar' && nowHour.swellM != null && (
                  <Metric label="Mar de fondo" icon="〰️" value={`${nowHour.swellM.toFixed(1)} m`} sub={nowHour.swellPeriod != null ? `periodo ${Math.round(nowHour.swellPeriod)}s` : undefined} />
                )}
                {s.type === 'mar' && nowHour.currentKmh != null && (
                  <Metric label="Corriente" icon="🧭" value={<span className="inline-flex items-center gap-1.5">{(nowHour.currentKmh / 1.852).toFixed(1)} kn <WindArrow deg={nowHour.currentDir} /></span>} />
                )}
                {s.type === 'mar' && <Metric label="Tª del mar" icon="🐟" value={nowHour.seaTempC != null ? `${nowHour.seaTempC}°C` : '–'} />}
                <Metric label="Temp. aire" icon="🌡️" value={nowHour.temp != null ? `${Math.round(nowHour.temp)}°C` : '–'} sub={uvMaxToday >= 7 ? `UV máx ${Math.round(uvMaxToday)} · protégete` : undefined} />
                <Metric label="Cielo" icon={weatherEmoji(nowHour.code, nowHour.isDay)} value={nowHour.precipProb != null ? `${nowHour.precipProb}% lluvia` : '—'} sub={nowHour.visibilityKm != null ? `visibilidad ${nowHour.visibilityKm} km` : undefined} />
                {tides?.available && tides.risingNow !== null && (
                  <Metric label="Marea" icon="🌊" value={tides.risingNow ? 'Subiendo ↑' : 'Bajando ↓'} sub={tides.nextTides[0] ? `${tides.nextTides[0].type === 'alta' ? 'pleamar' : 'bajamar'} ${fmtTime(tides.nextTides[0].time)}` : undefined} />
                )}
                <Metric label="Primera luz" icon="🌄" value={fmtTime(d0.firstLight)} sub={`última luz ${fmtTime(d0.lastLight)}`} />
              </div>
              {windRel && (
                <p className="text-[13px] text-ink/70 leading-relaxed border border-ink/12 rounded-xl px-3.5 py-2.5 bg-paper">
                  <span className="font-bold text-ink">{windRel.label}.</span> {windRel.hint}
                </p>
              )}
              {whyFactors.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">A favor ahora:</span>
                  {whyFactors.map((f) => (
                    <span key={f} className="inline-flex items-center gap-1 text-[11px] font-bold text-accent bg-accent/10 border border-accent/30 rounded-full px-2.5 py-1">✓ {f}</span>
                  ))}
                </div>
              )}
              {bestToday.length > 0 && (
                <div className="pt-1">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50 mb-2">Mejores horas hoy</p>
                  <div className="flex flex-wrap gap-2">
                    {bestToday.map((h) => (
                      <span key={h.time} className="inline-flex items-center gap-2 border border-ink/15 rounded-full px-3 py-1.5">
                        <span className="font-display text-lg text-ink">{h.hourLabel}</span>
                        <span className="text-paper text-[11px] font-bold rounded px-1.5 py-0.5" style={{ background: scoreHex(h.score) }}>{h.score}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border border-ink/15 rounded-2xl bg-paper p-6 text-sm text-ink/50">La previsión meteorológica no está disponible ahora mismo. Vuelve a intentarlo en unos minutos.</div>
        )}

        {/* 7-day hourly forecast with day selector */}
        {byDay.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3">Previsión hora a hora · 7 días</h2>
            <p className="text-[12px] text-ink/50">Elige el día. La fila «Pesca» es la puntuación combinada (solunar, viento, presión, luz{s.type === 'mar' ? ', oleaje' : ''}){species.id !== 'general' ? `, adaptada a ${species.name}` : ''}; verde = mejor. Desliza la tabla para ver todas las horas.</p>
            <DayTabs labels={byDay.map((g, i) => dayLabel(g.dateISO, i))}>
              {byDay.map((g) => {
                const sol = solByDate.get(g.dateISO)
                const win = bestWindow(g.hours)
                const gStart = g.hours[0].time
                const dayExtremes = tides?.all.filter((e) => e.time >= gStart - 8 * 3600000 && e.time < gStart + 32 * 3600000) ?? []
                const coef = sol ? tideCoefficient(sol.moonPhase) : null
                const showTide = !!tides?.available && dayExtremes.length >= 2
                const tideHeights = showTide ? g.hours.map((h) => tideHeightAt(dayExtremes, h.time)) : undefined
                const navWins = s.type === 'mar' ? navigationWindows(g.hours) : []
                const firstHigh = dayExtremes.find((e) => e.time >= gStart && e.type === 'alta')
                const verdict = dayVerdict({
                  hours: g.hours,
                  window: win,
                  tideNote: showTide && firstHigh ? `pleamar a las ${fmtTime(firstHigh.time)}${coef != null ? ` (coef ${coef})` : ''}` : null,
                })
                return (
                  <div key={g.dateISO} className="space-y-5">
                    {verdict && (
                      <p className="text-[15px] text-ink/85 leading-relaxed border-l-4 border-accent bg-accent/[0.05] rounded-r-xl px-4 py-3">
                        <span className="font-bold">📋 Veredicto:</span> {verdict}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      {win && (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/[0.06] px-3 py-2">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">Mejor ventana</span>
                          <span className="font-display text-lg text-ink">{fmtTime(win.start)} – {fmtTime(win.end)}</span>
                          <span className="text-paper text-[11px] font-bold rounded px-1.5 py-0.5" style={{ background: scoreHex(win.avg) }}>{win.avg}</span>
                        </span>
                      )}
                      {sol && (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2">
                          <FishRating value={sol.rating} />
                          <span className="font-mono text-[10px] uppercase tracking-widest text-ink/50">solunar</span>
                        </span>
                      )}
                      {showTide && coef != null && (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2">
                          <span className="font-display text-lg text-ink">{coef}</span>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-ink/50">coef · {coefficientLabel(coef)}</span>
                        </span>
                      )}
                      {navWins.map((w, i) => (
                        <span key={i} className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2" title="Tramo con viento y olas aptos para embarcación menor">
                          <span aria-hidden>🚤</span>
                          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Navegación</span>
                          <span className="font-display text-lg text-ink">{fmtTime(w.start)} – {fmtTime(w.end)}</span>
                        </span>
                      ))}
                    </div>

                    <div className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-5 space-y-3">
                      <h3 className="font-display uppercase text-lg text-ink leading-none flex items-center gap-2"><span aria-hidden>📈</span> Actividad de pesca del día</h3>
                      <ActivityChart hours={g.hours} window={win} now={now} />
                      <p className="text-[11px] text-ink/40">Curva de puntuación 0-100 · banda verde: mejor ventana · punto: pico del día.</p>
                    </div>

                    <div className={`grid grid-cols-1 ${showTide ? 'lg:grid-cols-2' : ''} gap-6`}>
                      <div className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-5 space-y-3">
                        <h3 className="font-display uppercase text-lg text-ink leading-none flex items-center gap-2"><span aria-hidden>💨</span> Viento (km/h)</h3>
                        <WindChart hours={g.hours} sunrise={sol?.sunrise ?? null} sunset={sol?.sunset ?? null} periods={sol?.periods ?? []} now={now} />
                        <p className="text-[11px] text-ink/40">Barras: viento medio · línea: rachas · franjas verdes: periodos solunares · sombreado: noche.</p>
                      </div>
                      {showTide && (
                        <div className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-5 space-y-3">
                          <h3 className="font-display uppercase text-lg text-ink leading-none flex items-center gap-2"><span aria-hidden>🌊</span> Marea</h3>
                          <TideChart extremes={dayExtremes} dayStart={gStart} now={now} />
                        </div>
                      )}
                    </div>
                    <HourlyTable hours={g.hours} hasMarine={forecast.hasMarine} tideHeights={tideHeights} />
                  </div>
                )
              })}
            </DayTabs>
          </div>
        )}

        {/* Gear for current conditions */}
        {gearTips.length > 0 && (
          <div className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-6 space-y-4">
            <h2 className="font-display uppercase text-2xl text-ink leading-none border-b border-ink/12 pb-4 flex items-center gap-2">
              <span aria-hidden>🎒</span> Equipo para estas condiciones
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {gearTips.map((t) => (
                <div key={t.text} className="border border-ink/12 rounded-xl bg-paper p-4 flex flex-col justify-between gap-3">
                  <p className="text-sm text-ink/75 leading-relaxed">{t.text}</p>
                  <Link href={t.href} className="self-start inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-paper bg-ink hover:bg-accent px-3.5 py-2 rounded-lg transition-colors">
                    {t.label} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sun & moon */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-ink/15 rounded-2xl bg-paper shadow-hard p-6 space-y-4">
            <h2 className="font-display uppercase text-2xl text-ink leading-none border-b border-ink/12 pb-4">Sol, luna y solunar</h2>
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50 mb-2">Periodos de máxima actividad</p>
              <div className="space-y-2">
                {majors.map((p, i) => (
                  <div key={`ma${i}`} className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center bg-accent text-paper text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full w-16">Mayor</span>
                    <span className="font-display text-xl text-ink">{fmtTime(p.start)} – {fmtTime(p.end)}</span>
                  </div>
                ))}
                {minors.map((p, i) => (
                  <div key={`mi${i}`} className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center border border-ink/20 text-ink/60 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full w-16">Menor</span>
                    <span className="font-display text-xl text-ink/80">{fmtTime(p.start)} – {fmtTime(p.end)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <Metric label="Amanecer" icon="🌅" value={fmtTime(d0.sunrise)} />
              <Metric label="Atardecer" icon="🌇" value={fmtTime(d0.sunset)} />
              <Metric label="Sale la luna" icon="🌘" value={fmtTime(d0.moonrise)} />
              <Metric label="Se pone la luna" icon="🌒" value={fmtTime(d0.moonset)} />
            </div>
          </div>
          <div className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-6 flex flex-col items-center justify-center text-center gap-2">
            <span className="text-5xl">🌙</span>
            <p className="font-bold text-ink text-lg">{d0.moonPhaseName}</p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50">{Math.round(d0.moonIllumination * 100)}% iluminada</p>
            <Link href="/calendario" className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-accent hover:underline">Ver calendario →</Link>
          </div>
        </div>

        {/* 7-day outlook */}
        <div className="space-y-4">
          <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3">Próximos 7 días</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {days.map((d) => {
              const dmajors = d.periods.filter((p) => p.kind === 'mayor')
              return (
                <div key={d.date} className="border border-ink/12 rounded-xl bg-paper p-3 space-y-2 text-center">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink/60 capitalize">{fmtDayLabel(d.date)}</p>
                  <FishRating value={d.rating} className="justify-center" />
                  <div className="font-mono text-[11px] text-ink/60 space-y-0.5">
                    {dmajors.map((p, i) => (
                      <div key={i}>{fmtTime(p.start)}</div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* SEO copy + internal links */}
        <div className="border-t border-ink/12 pt-8 space-y-3 text-[15px] text-ink/80 leading-relaxed">
          <h2 className="font-display uppercase text-2xl text-ink">Cómo leer la previsión de pesca de {s.name}</h2>
          <p>
            La <strong>puntuación de pesca</strong> combina la teoría solunar (posición de la luna), el viento, la tendencia de
            la presión atmosférica{s.type === 'mar' ? ', el oleaje' : ''} y la luz del amanecer y el atardecer{s.type === 'mar' ? ', y puedes afinarla por especie' : ''}. Busca las horas
            en verde: suelen coincidir con periodos solunares y bajadas de presión con viento moderado que riza el agua.
          </p>
          <p>
            Prepárate con el equipo adecuado: <Link href="/categories/canas" className="text-accent underline">cañas</Link>,{' '}
            <Link href="/categories/carretes" className="text-accent underline">carretes</Link> y{' '}
            <Link href="/categories/senuelos" className="text-accent underline">señuelos</Link>, revisa nuestras{' '}
            <Link href="/guias" className="text-accent underline">guías</Link> o pregunta a nuestro{' '}
            <Link href="/advice" className="text-accent underline">asesor</Link>.
          </p>
        </div>

        {/* Other spots */}
        <div className="border-t border-ink/12 pt-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50 mb-3">Otras zonas</p>
          <div className="flex flex-wrap gap-2">
            {FISHING_SPOTS.filter((o) => o.slug !== s.slug && o.type === s.type).slice(0, 14).map((o) => (
              <Link key={o.slug} href={`/mejores-horas/${o.slug}`} className="px-3 py-1.5 text-xs font-bold text-ink border border-ink/15 rounded-full hover:bg-ink hover:text-paper transition-colors">
                {o.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  )
}
