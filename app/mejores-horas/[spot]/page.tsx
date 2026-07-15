import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import FishRating from '@/components/FishRating'
import HourlyTable from '@/components/forecast/HourlyTable'
import WindChart from '@/components/forecast/WindChart'
import TideChart from '@/components/forecast/TideChart'
import DayTabs from '@/components/forecast/DayTabs'
import { FISHING_SPOTS, FEATURED_SPOT_SLUGS, getSpot } from '@/lib/fishing-spots'
import { solunarDay, type SolunarDay } from '@/lib/solunar'
import { getMarineForecast, bestWindow, groupByDay } from '@/lib/marine-forecast'
import { getTides, tideCoefficient, coefficientLabel } from '@/lib/tides'
import { scoreLabel, scoreHex, windWord, weatherEmoji } from '@/lib/forecast-format'
import { fmtTime, fmtDayLabel, fmtDateLong, todayMadridISO, addDaysISO, ratingLabel } from '@/lib/solunar-format'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'

export const revalidate = 1800

type Params = { params: Promise<{ spot: string }> }

export function generateStaticParams() {
  return FEATURED_SPOT_SLUGS.map((spot) => ({ spot }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { spot } = await params
  const s = getSpot(spot)
  if (!s) return { title: 'Localidad no encontrada' }
  const extra = s.type === 'mar' ? 'mareas, viento, oleaje, ' : 'viento, '
  const title = s.type === 'mar' ? `Pesca en ${s.name}: mareas, viento, oleaje y mejores horas` : `Pesca en ${s.name}: viento y mejores horas`
  const description = `Previsión profesional de pesca en ${s.name} (${s.region}): ${extra}presión, temperatura del agua, periodos solunares y las mejores horas hora a hora. Ideal para ${s.known}.`
  return { title, description, alternates: { canonical: `/mejores-horas/${s.slug}` } }
}

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

export default async function SpotPage({ params }: Params) {
  const { spot } = await params
  const s = getSpot(spot)
  if (!s) notFound()

  const today = todayMadridISO()
  const days = Array.from({ length: 7 }, (_, i) => solunarDay(s.lat, s.lon, addDaysISO(today, i)))
  const d0 = days[0]
  const [forecast, tides] = await Promise.all([
    getMarineForecast(s),
    s.type === 'mar' ? getTides(s.lat, s.lon) : Promise.resolve(null),
  ])

  const hours = forecast.hours
  const nowHour = hours.find((h) => h.isNow) ?? hours[0] ?? null
  // Derive "now" from the forecast's current hour (avoids an impure Date.now()
  // in render; the forecast marks the current hour when it's generated).
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

  // 7-day hourly, grouped by day for the day selector.
  const byDay = groupByDay(hours).slice(0, 7)
  const solByDate = new Map<string, SolunarDay>(days.map((d) => [d.date, d]))
  const dayLabel = (dateISO: string, i: number) => (i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : fmtDayLabel(dateISO))

  // Why the current hour scores what it scores.
  const whyFactors = nowHour
    ? ([
        nowHour.solunar && 'Periodo solunar',
        nowHour.twilight && 'Amanecer / atardecer',
        pressureTrend === 'bajando' && 'Presión bajando',
        nowHour.windKmh != null && nowHour.windKmh >= 8 && nowHour.windKmh <= 25 && 'Viento ideal',
      ].filter(Boolean) as string[])
    : []

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: 'Mejores horas de pesca', url: `${SITE_URL}/mejores-horas` },
    { name: s.name },
  ])

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
            Previsión completa para el pescador: viento, {s.type === 'mar' ? 'mareas, oleaje, ' : ''}presión, solunar y las mejores horas. Zona conocida por {s.known}. {fmtDateLong(today)}.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 sm:px-6 space-y-10">
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
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mt-2">Actividad de pesca · {scoreLabel(nowHour.score)}</p>
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
                {s.type === 'mar' && <Metric label="Oleaje" icon="🌊" value={nowHour.waveM != null ? `${nowHour.waveM.toFixed(1)} m` : '–'} sub={nowHour.wavePeriod != null ? `periodo ${Math.round(nowHour.wavePeriod)}s` : undefined} />}
                {s.type === 'mar' && <Metric label="Tª del mar" icon="🐟" value={nowHour.seaTempC != null ? `${nowHour.seaTempC}°C` : '–'} />}
                <Metric label="Temp. aire" icon="🌡️" value={nowHour.temp != null ? `${Math.round(nowHour.temp)}°C` : '–'} />
                <Metric label="Cielo" icon={weatherEmoji(nowHour.code, nowHour.isDay)} value={nowHour.precipProb != null ? `${nowHour.precipProb}% lluvia` : '—'} />
                {tides?.available && tides.risingNow !== null && (
                  <Metric label="Marea" icon="🌊" value={tides.risingNow ? 'Subiendo ↑' : 'Bajando ↓'} sub={tides.nextTides[0] ? `${tides.nextTides[0].type === 'alta' ? 'pleamar' : 'bajamar'} ${fmtTime(tides.nextTides[0].time)}` : undefined} />
                )}
              </div>
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
            <p className="text-[12px] text-ink/50">Elige el día. La fila «Pesca» es la puntuación combinada (solunar, viento, presión y luz); verde = mejor. Desliza la tabla para ver todas las horas.</p>
            <DayTabs labels={byDay.map((g, i) => dayLabel(g.dateISO, i))}>
              {byDay.map((g) => {
                const sol = solByDate.get(g.dateISO)
                const win = bestWindow(g.hours)
                const gStart = g.hours[0].time
                const dayExtremes = tides?.all.filter((e) => e.time >= gStart && e.time < gStart + 24 * 3600000) ?? []
                const coef = sol ? tideCoefficient(sol.moonPhase) : null
                const showTide = !!tides?.available && dayExtremes.length >= 2
                return (
                  <div key={g.dateISO} className="space-y-5">
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
                    <HourlyTable hours={g.hours} hasMarine={forecast.hasMarine} />
                  </div>
                )
              })}
            </DayTabs>
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
            la presión atmosférica{s.type === 'mar' ? ', el oleaje' : ''} y la luz del amanecer y el atardecer. Busca las horas
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
