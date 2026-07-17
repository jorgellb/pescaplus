import Link from 'next/link'
import Layout from '@/components/Layout'
import FishRating from '@/components/FishRating'
import HourlyTable from '@/components/forecast/HourlyTable'
import WindChart from '@/components/forecast/WindChart'
import TideChart from '@/components/forecast/TideChart'
import ActivityChart from '@/components/forecast/ActivityChart'
import DayTabs from '@/components/forecast/DayTabs'
import SourceBadge from '@/components/forecast/SourceBadge'
import SpotFavButton from '@/components/forecast/SpotFavButton'
import AlertSignup from '@/components/forecast/AlertSignup'
import { nearestSpots, type FishingSpot } from '@/lib/fishing-spots'
import { rankSpeciesToday } from '@/lib/what-to-fish'
import { solunarDay, type SolunarDay } from '@/lib/solunar'
import {
  getMarineForecast, bestWindow, groupByDay, pressure3hAgo,
  getModality, MODALITIES, activityFactors, conditionsFactors,
  FORECAST_REVALIDATE_S, type ScoreFactor,
} from '@/lib/marine-forecast'
import {
  getTides, tideCoefficient, coefficientLabel, tideHeightAt,
  nextExtremes, tideRisingAt, TIDE_DATUM_NOTE, TIDES_REVALIDATE_S,
} from '@/lib/tides'
import { getSpecies, GENERAL, SEA_SPECIES } from '@/lib/fishing-species'
import { douglasState, safetyAlerts, navigationWindows, outAndBack, dayVerdict, gearForConditions } from '@/lib/sea-state'
import { seawardBearing, windRelation, windRelationLabel } from '@/lib/coast'
import { getRegulation, REGULATIONS_REVIEWED, NATIONAL_SIZES_URL } from '@/lib/fishing-regulations'
import { getZoneGuide } from '@/lib/zone-guides'
import { getAemetBulletin, AEMET_REVALIDATE_S, type AemetBulletin } from '@/lib/aemet'
import { aemetZoneFor } from '@/lib/aemet-zones'
import { getAemetObservation, AEMET_OBS_REVALIDATE_S, type AemetObservation } from '@/lib/aemet-obs'
import { AEMET_STATIONS } from '@/lib/aemet-stations'
import { getSpotAccuracy, type SpotAccuracy } from '@/lib/verification-store'
import { scoreLabel, scoreHex, windWord, weatherEmoji } from '@/lib/forecast-format'
import { fmtTime, fmtDayLabel, fmtDateLong, fmtWindowRange, todayMadridISO, addDaysISO, ratingLabel } from '@/lib/solunar-format'
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
  modo,
  buildHref,
  subtitle,
}: {
  spot: FishingSpot
  especie: string | null
  modo: string | null
  /** Builds the URL for species/modality chips (null clears the param). */
  buildHref: (params: { especie: string | null; modo: string | null }) => string
  /** Small line under the title (e.g. "Cerca de Cádiz"). */
  subtitle?: string
}) {
  const species = getSpecies(especie)
  const modality = getModality(s.type === 'mar' ? modo : 'tierra')
  const today = todayMadridISO()
  const days = Array.from({ length: 7 }, (_, i) => solunarDay(s.lat, s.lon, addDaysISO(today, i)))
  const d0 = days[0]
  const aemetZone = aemetZoneFor(s)
  const station = AEMET_STATIONS[s.slug]
  const [forecast, tides, aemet, obs, accuracy] = await Promise.all([
    getMarineForecast(s, species.id === 'general' ? null : species.id, modality.id),
    s.type === 'mar' ? getTides(s.lat, s.lon) : Promise.resolve(null),
    aemetZone ? getAemetBulletin(aemetZone.costa, aemetZone.keyword) : Promise.resolve(null as AemetBulletin | null),
    station ? getAemetObservation(station.idema) : Promise.resolve(null as AemetObservation | null),
    getSpotAccuracy(s.slug).catch(() => null as SpotAccuracy | null),
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

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: 'Mejores horas de pesca', url: `${SITE_URL}/mejores-horas` },
    { name: s.name },
  ])

  const scoreNoun =
    species.id === 'general'
      ? `Índice combinado · ${modality.name.toLowerCase()}`
      : `Índice combinado · ${species.name} · ${modality.name.toLowerCase()}`

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

  // Transparent score breakdown for the current hour (physical model data vs
  // PescaPlus' own calculation, each factor with its contribution).
  const nowActivityFactors: ScoreFactor[] = nowHour ? activityFactors(nowHour, pressure3hAgo(hours, nowHour), species) : []
  const nowConditionsFactors: ScoreFactor[] = nowHour ? conditionsFactors(nowHour, modality) : []

  // Per-modality condition snapshot for the verdict card (never one sign for all).
  const modalitySnapshot = nowHour
    ? MODALITIES.filter((m) => s.type === 'mar' || m.id === 'tierra').map((m) => {
        const score = Math.max(0, Math.min(100, 90 + conditionsFactors(nowHour, m).reduce((sum, x) => sum + x.pts, 0)))
        return { m, score }
      })
    : []
  const worstFactorNow = [...nowConditionsFactors].sort((a, b) => a.pts - b.pts)[0] ?? null

  // Tides derived AT RENDER from the validated dataset + this page's "now" —
  // never from fetch-time snapshots (they'd contradict the charts under ISR).
  const tidesAll = tides?.available ? tides.all : []
  const upcomingTides = nextExtremes(tidesAll, now)
  const risingNow = tideRisingAt(tidesAll, now)

  // Best of the 7 days (to plan the weekend at a glance).
  const dayAverages = byDay.map((g) => Math.round(g.hours.reduce((sum, h) => sum + h.score, 0) / g.hours.length))
  const bestDayIdx = dayAverages.length ? dayAverages.indexOf(Math.max(...dayAverages)) : -1

  const regulation = getRegulation(s.region)
  const conditionsWord = (v: number) => (v >= 70 ? 'Buenas' : v >= 45 ? 'Regulares' : 'Desfavorables')
  const activityWord = (v: number) => (v >= 70 ? 'Alta' : v >= 50 ? 'Media' : 'Baja')

  // "Qué buscar hoy": season + measured water temperature + sea state + solunar.
  const currentMonth = Number(today.slice(5, 7))
  const speciesPicks =
    s.type === 'mar'
      ? rankSpeciesToday({
          month: currentMonth,
          seaTempC: nowHour?.seaTempC ?? null,
          waveM: nowHour?.waveM ?? null,
          solunarRating: d0.rating,
        }).slice(0, 3)
      : []

  // Next good window from now (hero chip).
  const remainingToday = todayHours.filter((h) => h.time >= now)
  const nextWin = remainingToday.length ? bestWindow(remainingToday) : null

  const nearby = nearestSpots(s, 5)

  const guide = getZoneGuide(s.slug)

  const SECTIONS = [
    { id: 'ahora', label: 'Ahora' },
    { id: 'prevision', label: '7 días' },
    ...(guide ? [{ id: 'guia', label: 'Guía local' }] : []),
    ...(aemet?.available ? [{ id: 'aemet', label: 'Parte AEMET' }] : []),
    ...(speciesPicks.length ? [{ id: 'especies', label: 'Qué buscar' }] : []),
    { id: 'equipo', label: 'Equipo' },
    { id: 'sol-luna', label: 'Sol y luna' },
    ...(s.type === 'mar' && regulation ? [{ id: 'normativa', label: 'Normativa' }] : []),
  ]

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
          {nowHour && (
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink/40 mt-2">
              Hora local (España peninsular): {nowHour.hourLabel} · previsión actualizada {forecast.meta.fetchedAt ? fmtTime(forecast.meta.fetchedAt) : '—'}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Link
              href={`/mejores-horas/${s.slug}/plan${especie || modo ? `?${new URLSearchParams({ ...(especie ? { especie } : {}), ...(modo ? { modo } : {}) })}` : ''}`}
              className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 text-xs font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift hover:bg-accent hover:border-accent"
            >
              🧾 Genera mi plan de pesca
            </Link>
            <Link
              href={`/mejores-horas/comparar?zonas=${[s.slug, ...nearby.slice(0, 2).map((n) => n.slug)].join(',')}`}
              className="inline-flex items-center gap-2 bg-paper text-ink px-4 py-2.5 text-xs font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift hover:bg-ink hover:text-paper"
            >
              ⚖️ Comparar con zonas cercanas
            </Link>
            <SpotFavButton slug={s.slug} name={s.name} />
          </div>
          {nextWin && todayHours.length > 0 && (
            <p className="inline-flex items-center gap-2 mt-4 rounded-xl border border-accent/30 bg-accent/[0.06] px-3.5 py-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">Próxima ventana hoy</span>
              <span className="font-display text-lg text-ink">{fmtWindowRange(Math.max(nextWin.start, now), nextWin.end, todayHours[0].time)}</span>
              <span className="text-paper text-[11px] font-bold rounded px-1.5 py-0.5" style={{ background: scoreHex(nextWin.avg) }}>{nextWin.avg}</span>
            </p>
          )}
        </div>
      </section>

      {/* In-page sticky nav */}
      <nav className="sticky top-16 z-40 bg-paper/95 backdrop-blur-sm border-b border-ink/10" aria-label="Secciones de la previsión">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1.5 overflow-x-auto py-2 scrollbar-none">
          {SECTIONS.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className="flex-shrink-0 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60 border border-ink/12 rounded-full hover:bg-ink hover:text-paper transition-colors"
            >
              {sec.label}
            </a>
          ))}
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-4 py-10 sm:px-6 space-y-10">
        {/* Official AEMET coastal warning */}
        {aemet?.hasAviso && (
          <div role="alert" className="rounded-2xl border border-red-700/40 bg-red-700/[0.07] text-red-900 px-5 py-4 text-sm font-semibold flex items-start gap-3">
            <span className="text-xl leading-none" aria-hidden>⚠️</span>
            <span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest block mb-1">Aviso oficial de AEMET · fenómenos costeros</span>
              {aemet.avisoTexto}
            </span>
          </div>
        )}

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

        {/* Modality + species selectors (sea only) */}
        {s.type === 'mar' && (
          <div className="border border-ink/15 rounded-2xl bg-paper p-4 space-y-4">
            <div className="space-y-2">
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">¿Desde dónde pescas?</p>
              <div className="flex flex-wrap gap-2">
                {MODALITIES.map((m) => {
                  const active = m.id === modality.id
                  return (
                    <Link
                      key={m.id}
                      href={buildHref({ especie, modo: m.id === 'tierra' ? null : m.id })}
                      scroll={false}
                      className={`px-3.5 py-2 text-sm font-bold rounded-xl border transition-colors ${active ? 'bg-accent text-paper border-accent' : 'bg-paper text-ink/80 border-ink/15 hover:bg-ink/5'}`}
                    >
                      {m.emoji} {m.name}
                    </Link>
                  )
                })}
              </div>
              <p className="text-[12px] text-ink/50">
                Cada modalidad tiene sus propios umbrales: el mismo viento que activa la orilla puede ser peligroso en kayak.
              </p>
            </div>
            <div className="space-y-2 border-t border-ink/10 pt-3">
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Especie objetivo</p>
              <div className="flex flex-wrap gap-2">
                {[GENERAL, ...SEA_SPECIES].map((sp) => {
                  const active = sp.id === species.id
                  return (
                    <Link
                      key={sp.id}
                      href={buildHref({ especie: sp.id === 'general' ? null : sp.id, modo })}
                      scroll={false}
                      className={`px-3 py-1.5 text-sm font-bold rounded-full border transition-colors ${active ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink/80 border-ink/15 hover:bg-ink/5'}`}
                    >
                      {sp.name}
                    </Link>
                  )
                })}
              </div>
              <p className="text-[12px] text-ink/50">{species.tagline}.</p>
            </div>
          </div>
        )}

        {/* NOW dashboard */}
        {nowHour ? (
          <div id="ahora" className="grid grid-cols-1 lg:grid-cols-3 gap-6 scroll-mt-28">
            <div className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3 border-b border-ink/12 pb-4">
                <h2 className="font-display uppercase text-2xl text-ink leading-none">Ahora</h2>
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50">{nowHour.hourLabel}</span>
              </div>
              <div className="text-center py-5">
                <div className="text-6xl font-display leading-none" style={{ color: scoreHex(nowHour.score) }}>{nowHour.score}</div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mt-2">{scoreNoun} · {scoreLabel(nowHour.score)}</p>
              </div>

              {/* Verdict per modality — activity vs conditions, never one sign for all */}
              <div className="space-y-1.5 border-t border-ink/12 pt-4">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/45">Actividad</span>
                  <span className="font-bold" style={{ color: scoreHex(nowHour.activity) }}>{activityWord(nowHour.activity)} ({nowHour.activity})</span>
                </div>
                {modalitySnapshot.map(({ m, score: cs }) => (
                  <div key={m.id} className="flex items-center justify-between text-[13px]">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/45">{m.emoji} {m.name}</span>
                    <span className="font-bold" style={{ color: scoreHex(cs) }}>{conditionsWord(cs)} ({Math.round(cs)})</span>
                  </div>
                ))}
                {worstFactorNow && worstFactorNow.pts <= -15 && (
                  <p className="text-[11px] text-ink/55 pt-1">Motivo: {worstFactorNow.label.toLowerCase()}.</p>
                )}
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
                {risingNow !== null && (
                  <Metric label="Marea" icon="🌊" value={risingNow ? 'Subiendo ↑' : 'Bajando ↓'} sub={upcomingTides[0] ? `${upcomingTides[0].type === 'alta' ? 'pleamar' : 'bajamar'} ${fmtTime(upcomingTides[0].time)}` : undefined} />
                )}
                <Metric label="Primera luz" icon="🌄" value={fmtTime(d0.firstLight)} sub={`última luz ${fmtTime(d0.lastLight)}`} />
              </div>
              {windRel && (
                <p className="text-[13px] text-ink/70 leading-relaxed border border-ink/12 rounded-xl px-3.5 py-2.5 bg-paper">
                  <span className="font-bold text-ink">{windRel.label}.</span> {windRel.hint}
                  {modality.id !== 'tierra' && windRel.label.startsWith('Viento de mar') && (
                    <span className="text-ink/60"> Ojo: en {modality.name.toLowerCase()} este mismo viento incomoda la navegación.</span>
                  )}
                </p>
              )}

              {/* OBSERVED right now — real measurement vs the model */}
              {obs?.available && (
                <div className="border border-accent/30 rounded-xl bg-accent/[0.04] p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
                      📡 Observado ahora · estación {obs.stationName}{station ? ` (a ${station.km} km)` : ''}
                    </p>
                    {obs.time && <span className="font-mono text-[10px] uppercase tracking-widest text-ink/40">{obs.time.slice(11, 16)} UTC</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink/85">
                    {obs.windKmh != null && (
                      <span>
                        <strong>Viento medido: {obs.windKmh} km/h</strong>
                        {obs.gustKmh != null && ` (rachas ${obs.gustKmh})`}
                        {nowHour.windKmh != null && (
                          <span className={Math.abs(obs.windKmh - nowHour.windKmh) <= 5 ? 'text-accent' : 'text-amber-700'}>
                            {' '}· modelo {Math.round(nowHour.windKmh)} {Math.abs(obs.windKmh - nowHour.windKmh) <= 5 ? '✓' : `(Δ${Math.abs(Math.round(obs.windKmh - nowHour.windKmh))})`}
                          </span>
                        )}
                      </span>
                    )}
                    {obs.tempC != null && <span>Temp: {Math.round(obs.tempC)}°C</span>}
                    {obs.pressureHpa != null && <span>Presión: {Math.round(obs.pressureHpa)} hPa</span>}
                  </div>
                  <p className="font-mono text-[9px] uppercase tracking-wide text-ink/35">Dato OBSERVADO (red oficial de estaciones de AEMET) — no es una previsión.</p>
                </div>
              )}

              {/* Public verification badge */}
              {station && station.km <= 15 && (
                <p className="font-mono text-[10px] uppercase tracking-wide text-ink/45 leading-relaxed">
                  🎯 Fiabilidad verificada:{' '}
                  {accuracy
                    ? `error medio del viento ±${accuracy.maeKmh} km/h · ${Math.round(accuracy.within5 * 100)}% de días dentro de ±5 (últimas ${accuracy.n} verificaciones contra la estación oficial)`
                    : 'comparamos a diario nuestra previsión con la estación oficial de AEMET; primeras cifras públicas en cuanto acumulemos 3 días.'}
                </p>
              )}

              {/* Transparent breakdown: why this score, factor by factor */}
              {(nowActivityFactors.length > 0 || nowConditionsFactors.length > 0) && (
                <details className="group border border-ink/12 rounded-xl bg-paper px-4 py-3 [&_summary]:list-none">
                  <summary className="flex items-center justify-between gap-3 cursor-pointer text-sm font-bold text-ink">
                    ¿Por qué esta puntuación?
                    <span className="flex-shrink-0 text-accent transition-transform group-open:rotate-45 text-lg leading-none">+</span>
                  </summary>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/45 mb-1.5">Actividad (base 40)</p>
                      {nowActivityFactors.length === 0 && <p className="text-ink/50">Sin factores destacados a esta hora.</p>}
                      {nowActivityFactors.map((f) => (
                        <p key={f.label} className="flex justify-between gap-2 py-0.5">
                          <span className="text-ink/70">{f.label} <span className="text-ink/35">({f.kind === 'propio' ? 'cálculo PescaPlus' : 'dato físico'})</span></span>
                          <span className={`font-bold tabular-nums ${f.pts >= 0 ? 'text-accent' : 'text-red-800'}`}>{f.pts >= 0 ? '+' : ''}{f.pts}</span>
                        </p>
                      ))}
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/45 mb-1.5">Condiciones · {modality.name} (base 90)</p>
                      {nowConditionsFactors.length === 0 && <p className="text-ink/50">Sin penalizaciones: condiciones limpias.</p>}
                      {nowConditionsFactors.map((f) => (
                        <p key={f.label} className="flex justify-between gap-2 py-0.5">
                          <span className="text-ink/70">{f.label} <span className="text-ink/35">(dato físico)</span></span>
                          <span className={`font-bold tabular-nums ${f.pts >= 0 ? 'text-accent' : 'text-red-800'}`}>{f.pts >= 0 ? '+' : ''}{f.pts}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-ink/35">Datos físicos: Open-Meteo (modelo) · Solunar y ponderación: modelo propio de PescaPlus.</p>
                </details>
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
              <SourceBadge
                source={s.type === 'mar' ? 'Open-Meteo (meteo + marino)' : 'Open-Meteo'}
                kind="previsto"
                fetchedAt={forecast.meta.fetchedAt}
                revalidateS={FORECAST_REVALIDATE_S}
                distanceKm={s.type === 'mar' ? forecast.meta.marineGridKm ?? forecast.meta.gridKm : forecast.meta.gridKm}
              />
            </div>
          </div>
        ) : (
          <div className="border border-ink/15 rounded-2xl bg-paper p-6 text-sm text-ink/50">La previsión meteorológica no está disponible ahora mismo. Vuelve a intentarlo en unos minutos.</div>
        )}

        {/* Qué buscar hoy — species intelligence from season + live conditions */}
        {speciesPicks.length > 0 && (
          <div id="especies" className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-6 space-y-4 scroll-mt-28">
            <div className="flex items-center justify-between gap-3 border-b border-ink/12 pb-4">
              <h2 className="font-display uppercase text-2xl text-ink leading-none flex items-center gap-2"><span aria-hidden>🎯</span> Qué buscar hoy</h2>
              <Link href="/especies" className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent hover:underline whitespace-nowrap">Todas las fichas →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {speciesPicks.map((p, i) => (
                <div key={p.species.id} className={`border rounded-xl p-4 flex flex-col gap-2.5 ${i === 0 ? 'border-accent/40 bg-accent/[0.04]' : 'border-ink/12 bg-paper'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display uppercase text-xl text-ink leading-none">{i === 0 && '⭐ '}{p.species.name}</p>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">#{i + 1}</span>
                  </div>
                  <p className="text-[13px] text-ink/65 leading-relaxed flex-1">
                    {p.reasons.length ? `${p.reasons.join(', ')}.` : 'Opción secundaria en estas condiciones.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={buildHref({ especie: p.species.id, modo })} scroll={false} className="inline-flex items-center text-[11px] font-bold uppercase tracking-wide text-paper bg-ink hover:bg-accent px-3 py-1.5 rounded-lg transition-colors">
                      Puntuar para {p.species.name} →
                    </Link>
                    <Link href={`/especies/${p.species.id}`} className="inline-flex items-center text-[11px] font-bold uppercase tracking-wide text-ink border border-ink/15 px-3 py-1.5 rounded-lg hover:bg-ink hover:text-paper transition-colors">
                      Ficha
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-ink/35">Basado en temporada, Tª del agua medida, estado del mar y solunar de hoy · orientativo.</p>
          </div>
        )}

        {/* 7-day hourly forecast with day selector */}
        {byDay.length > 0 && (
          <div id="prevision" className="space-y-3 scroll-mt-28">
            <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3">Previsión hora a hora · 7 días</h2>
            <p className="text-[12px] text-ink/50">Elige el día. «Activ.» es la actividad prevista de los peces{species.id !== 'general' ? ` (adaptada a ${species.name})` : ''} y «Cond.» las condiciones para {modality.name.toLowerCase()}; verde = mejor. Desliza la tabla para ver todas las horas.</p>
            <DayTabs labels={byDay.map((g, i) => `${i === bestDayIdx ? '⭐ ' : ''}${dayLabel(g.dateISO, i)}`)}>
              {byDay.map((g) => {
                const sol = solByDate.get(g.dateISO)
                const win = bestWindow(g.hours)
                const gStart = g.hours[0].time
                const dayExtremes = tidesAll.filter((e) => e.time >= gStart - 8 * 3600000 && e.time < gStart + 32 * 3600000)
                const coef = sol ? tideCoefficient(sol.moonPhase) : null
                const showTide = dayExtremes.length >= 2
                const tideHeights = showTide ? g.hours.map((h) => tideHeightAt(dayExtremes, h.time)) : undefined
                const outing = s.type === 'mar' && modality.id !== 'tierra' ? outAndBack(g.hours, modality) : null
                const navWins = s.type === 'mar' && modality.id === 'tierra' ? navigationWindows(g.hours, getModality('barco')) : []
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
                      <span className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/[0.06] px-3 py-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">Mejor ventana</span>
                        {win ? (
                          <>
                            <span className="font-display text-lg text-ink">{fmtWindowRange(win.start, win.end, gStart)}</span>
                            <span className="text-paper text-[11px] font-bold rounded px-1.5 py-0.5" style={{ background: scoreHex(win.avg) }}>{win.avg}</span>
                          </>
                        ) : (
                          <span className="text-sm text-ink/50">dato no disponible</span>
                        )}
                      </span>
                      {sol && (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2" title="Cálculo astronómico propio de PescaPlus">
                          <FishRating value={sol.rating} />
                          <span className="font-mono text-[10px] uppercase tracking-widest text-ink/50">solunar (calculado)</span>
                        </span>
                      )}
                      {showTide && coef != null && (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2" title="Estimado del ciclo lunar (viva/muerta), no es el coeficiente oficial de la estación">
                          <span className="font-display text-lg text-ink">{coef}</span>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-ink/50">coef estimado · {coefficientLabel(coef)}</span>
                        </span>
                      )}
                      {navWins.map((w, i) => (
                        <span key={i} className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2" title="Tramo con viento y olas aptos para embarcación menor">
                          <span aria-hidden>🚤</span>
                          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Navegación</span>
                          <span className="font-display text-lg text-ink">{fmtWindowRange(w.start, w.end, gStart)}</span>
                        </span>
                      ))}
                    </div>

                    {/* Salida y regreso — the return leg is where trouble happens */}
                    {s.type === 'mar' && modality.id !== 'tierra' && (
                      outing ? (
                        <div className="border border-ink/15 rounded-2xl bg-paper p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                          <span className="inline-flex items-center gap-2">
                            <span aria-hidden>{modality.emoji}</span>
                            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Salida</span>
                            <span className="font-display text-xl text-ink">{outing.departure <= gStart ? '00:00' : fmtTime(outing.departure)}</span>
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Regreso antes de</span>
                            <span className="font-display text-xl text-ink">{outing.returnBy >= gStart + 24 * 3600000 ? '24:00' : fmtTime(outing.returnBy)}</span>
                          </span>
                          {outing.returnNote && <span className="text-[13px] text-ink/60">Motivo: {outing.returnNote}.</span>}
                        </div>
                      ) : (
                        <div className="border border-amber-600/40 bg-amber-500/[0.07] rounded-2xl p-4 text-sm font-semibold text-amber-900">
                          {modality.emoji} Sin ventana segura para {modality.name.toLowerCase()} este día (viento u olas por encima del umbral). Considera pescar desde tierra.
                        </div>
                      )
                    )}

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
                        <SourceBadge source="Open-Meteo" kind="previsto" fetchedAt={forecast.meta.fetchedAt} revalidateS={FORECAST_REVALIDATE_S} distanceKm={forecast.meta.gridKm} />
                      </div>
                      {showTide && (
                        <div className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-5 space-y-3">
                          <h3 className="font-display uppercase text-lg text-ink leading-none flex items-center gap-2"><span aria-hidden>🌊</span> Marea</h3>
                          <TideChart extremes={dayExtremes} dayStart={gStart} now={now} />
                          <p className="text-[11px] text-ink/40">{TIDE_DATUM_NOTE}</p>
                          <SourceBadge
                            source="WorldTides"
                            kind="predicción armónica"
                            fetchedAt={tides?.fetchedAt}
                            revalidateS={TIDES_REVALIDATE_S}
                            extra={tides?.station ? `estación ${tides.station}` : 'validada automáticamente (alternancia y espaciado)'}
                          />
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
          <div id="equipo" className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-6 space-y-4 scroll-mt-28">
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

        {/* Regulations — honest: official links, never invented bylaws */}
        {s.type === 'mar' && regulation && (
          <div id="normativa" className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-6 space-y-4 scroll-mt-28">
            <h2 className="font-display uppercase text-2xl text-ink leading-none border-b border-ink/12 pb-4 flex items-center gap-2">
              <span aria-hidden>📜</span> ¿Puedo pescar aquí? Normativa en {s.region}
            </h2>
            <ul className="space-y-2 text-[14px] text-ink/80 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-accent font-bold">1.</span>
                <span>
                  <strong>Licencia de pesca marítima recreativa de {s.region}</strong> en vigor (desde tierra y desde embarcación son
                  licencias distintas en la mayoría de comunidades). Trámites:{' '}
                  <a href={regulation.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline">{regulation.authority}</a>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent font-bold">2.</span>
                <span>
                  <strong>Tallas mínimas y cupos</strong>: los regula la normativa estatal y autonómica y cambian por especie.
                  Consulta la referencia oficial en el{' '}
                  <a href={NATIONAL_SIZES_URL} target="_blank" rel="noopener noreferrer" className="text-accent underline">Ministerio (MAPA)</a>{' '}
                  y la web de tu comunidad.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent font-bold">3.</span>
                <span>
                  <strong>Playas y puertos</strong>: en temporada de baño muchos municipios prohíben pescar en zonas balizadas
                  durante el horario de baño (bandos municipales). Confirma el bando del ayuntamiento antes de ir.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent font-bold">4.</span>
                <span><strong>Reservas marinas y zonas protegidas</strong> tienen restricciones propias o prohibición total.</span>
              </li>
            </ul>
            <p className="font-mono text-[10px] uppercase tracking-wide text-ink/35">
              Revisado: {REGULATIONS_REVIEWED} · Esta tarjeta es orientativa y no sustituye a la normativa oficial — confirma siempre en los enlaces.
            </p>
          </div>
        )}

        {/* Sun & moon */}
        <div id="sol-luna" className="grid grid-cols-1 lg:grid-cols-3 gap-6 scroll-mt-28">
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
            <SourceBadge source="PescaPlus (astronomía propia)" kind="calculado" extra="precisión ±2 min en salidas y puestas" />
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
            {days.map((d, di) => {
              const dmajors = d.periods.filter((p) => p.kind === 'mayor')
              const isBest = di === bestDayIdx
              return (
                <div key={d.date} className={`border rounded-xl p-3 space-y-2 text-center ${isBest ? 'border-accent bg-accent/[0.06]' : 'border-ink/12 bg-paper'}`}>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink/60 capitalize">{isBest && '⭐ '}{fmtDayLabel(d.date)}</p>
                  <FishRating value={d.rating} className="justify-center" />
                  <div className="font-mono text-[11px] text-ink/60 space-y-0.5">
                    {dmajors.map((p, i) => (
                      <div key={i}>{fmtTime(p.start)}</div>
                    ))}
                  </div>
                  {isBest && <p className="font-mono text-[9px] uppercase tracking-widest text-accent">Mejor día</p>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Official AEMET coastal bulletin */}
        {aemet?.available && (
          <div id="aemet" className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-6 space-y-4 scroll-mt-28">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/12 pb-4">
              <h2 className="font-display uppercase text-2xl text-ink leading-none flex items-center gap-2">
                <span aria-hidden>🏛️</span> El parte oficial de AEMET
              </h2>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${aemet.hasAviso ? 'border-red-700/40 text-red-800 bg-red-700/[0.06]' : 'border-accent/40 text-accent'}`}>
                {aemet.hasAviso ? '⚠️ Con avisos' : '✓ Sin avisos'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-ink/12 rounded-xl bg-paper p-4 space-y-1.5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/45">{aemet.subzonaNombre || 'Aguas costeras'}</p>
                <p className="text-[14px] text-ink/80 leading-relaxed">{aemet.subzonaTexto}</p>
              </div>
              <div className="border border-ink/12 rounded-xl bg-paper p-4 space-y-1.5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/45">Situación general</p>
                <p className="text-[14px] text-ink/80 leading-relaxed">{aemet.situacion || '—'}</p>
              </div>
            </div>
            <SourceBadge
              source="AEMET (boletín marítimo costero oficial)"
              kind="previsto"
              fetchedAt={aemet.elaborado ? Date.parse(aemet.elaborado) : null}
              revalidateS={AEMET_REVALIDATE_S}
              extra="© AEMET"
            />
          </div>
        )}

        {/* Local editorial guide — the unique content layer of each zone */}
        {guide && (
          <div id="guia" className="border-t-2 border-ink pt-8 space-y-6 scroll-mt-28">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display uppercase text-3xl md:text-4xl leading-none text-ink">Pescar en {s.name}: la guía local</h2>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink/35">Guía orientativa · revisada {new Date(guide.generatedAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
            </div>
            <p className="text-[16px] text-ink/85 leading-relaxed max-w-3xl first-letter:font-display first-letter:text-5xl first-letter:float-left first-letter:mr-2 first-letter:leading-[0.85]">{guide.intro}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-ink/12 rounded-2xl bg-paper p-5 space-y-2">
                <h3 className="font-display uppercase text-xl text-ink leading-none flex items-center gap-2"><span aria-hidden>🐟</span> Qué se pesca</h3>
                <p className="text-[14px] text-ink/75 leading-relaxed">{guide.species}</p>
              </div>
              <div className="border border-ink/12 rounded-2xl bg-paper p-5 space-y-2">
                <h3 className="font-display uppercase text-xl text-ink leading-none flex items-center gap-2"><span aria-hidden>🎣</span> Cómo se pesca</h3>
                <p className="text-[14px] text-ink/75 leading-relaxed">{guide.techniques}</p>
              </div>
            </div>
            <div className="border-l-4 border-accent bg-accent/[0.05] rounded-r-2xl px-5 py-4">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent mb-1.5">📅 Cuándo ir</h3>
              <p className="text-[14px] text-ink/80 leading-relaxed">{guide.seasons}</p>
            </div>
            <div>
              <h3 className="font-display uppercase text-xl text-ink leading-none mb-3">Consejos de la zona</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {guide.tips.map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5 border border-ink/12 rounded-xl bg-paper px-4 py-3 text-[13px] text-ink/75 leading-relaxed">
                    <span className="text-accent font-bold flex-shrink-0" aria-hidden>{i + 1}.</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

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

        {/* Window alerts by email */}
        <AlertSignup spotSlug={s.slug} spotName={s.name} isSea={s.type === 'mar'} />

        {/* Nearby zones — true nearest by distance */}
        <div className="border-t border-ink/12 pt-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50 mb-3">Zonas cercanas</p>
          <div className="flex flex-wrap gap-2">
            {nearby.map((o) => (
              <Link key={o.slug} href={`/mejores-horas/${o.slug}`} className="px-3 py-1.5 text-sm font-semibold text-ink border border-ink/15 rounded-full hover:bg-ink hover:text-paper transition-colors">
                {o.name} <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">{o.region}</span>
              </Link>
            ))}
            <Link href="/mejores-horas" className="px-3 py-1.5 text-sm font-semibold text-accent border border-accent/30 rounded-full hover:bg-accent hover:text-paper transition-colors">
              Ver mapa completo →
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  )
}
