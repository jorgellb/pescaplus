import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import FishRating from '@/components/FishRating'
import { FISHING_SPOTS, FEATURED_SPOT_SLUGS, getSpot } from '@/lib/fishing-spots'
import { solunarDay } from '@/lib/solunar'
import { getFishingWeather } from '@/lib/fishing-weather'
import { fmtTime, fmtDayLabel, fmtDateLong, todayMadridISO, addDaysISO, ratingLabel } from '@/lib/solunar-format'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'

export const revalidate = 1800

type Params = { params: Promise<{ spot: string }> }

// Prerender the popular spots; the rest render on-demand and cache (ISR).
export function generateStaticParams() {
  return FEATURED_SPOT_SLUGS.map((spot) => ({ spot }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { spot } = await params
  const s = getSpot(spot)
  if (!s) return { title: 'Localidad no encontrada' }
  const title = `Mejores horas de pesca en ${s.name} · luna, sol y meteo`
  const description = `Consulta las mejores horas para pescar en ${s.name} (${s.region}): periodos solunares, salida y puesta de sol y luna, fase lunar y meteo de pesca. Ideal para ${s.known}.`
  return { title, description, alternates: { canonical: `/mejores-horas/${s.slug}` } }
}

export default async function SpotPage({ params }: Params) {
  const { spot } = await params
  const s = getSpot(spot)
  if (!s) notFound()

  const today = todayMadridISO()
  const days = Array.from({ length: 7 }, (_, i) => solunarDay(s.lat, s.lon, addDaysISO(today, i)))
  const d0 = days[0]
  const weather = await getFishingWeather(s)

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: SITE_URL },
    { name: 'Mejores horas de pesca', url: `${SITE_URL}/mejores-horas` },
    { name: s.name },
  ])

  const majors = d0.periods.filter((p) => p.kind === 'mayor')
  const minors = d0.periods.filter((p) => p.kind === 'menor')

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
            <Link href="/mejores-horas" className="hover:text-accent">Mejores horas</Link> <span className="mx-1">/</span>{' '}
            <span className="text-ink">{s.name}</span>
          </nav>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">
            {s.type === 'mar' ? '● Pesca en el mar' : '● Pesca en agua dulce'} · {s.region}
          </p>
          <h1 className="font-display uppercase text-3xl sm:text-4xl md:text-5xl leading-[1.02] text-ink break-words">
            Mejores horas de pesca en {s.name}
          </h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">
            Previsión solunar y meteo para acertar con tus salidas. Zona conocida por {s.known}. {fmtDateLong(today)}.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-10 sm:px-6 space-y-10">
        {/* Today */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-ink/15 rounded-2xl bg-paper shadow-hard p-6 space-y-5">
            <div className="flex items-center justify-between gap-4 border-b border-ink/12 pb-4">
              <h2 className="font-display uppercase text-2xl text-ink leading-none">Hoy</h2>
              <div className="text-right">
                <FishRating value={d0.rating} />
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mt-1">{ratingLabel(d0.rating)}</p>
              </div>
            </div>

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
              <p className="text-[12px] text-ink/50 mt-3">Los periodos «mayores» (luna en su punto más alto y más bajo) suelen dar la mejor actividad; los «menores» coinciden con la salida y puesta de la luna.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <Fact label="Amanecer" value={fmtTime(d0.sunrise)} icon="🌅" />
              <Fact label="Atardecer" value={fmtTime(d0.sunset)} icon="🌇" />
              <Fact label="Sale la luna" value={fmtTime(d0.moonrise)} icon="🌘" />
              <Fact label="Se pone la luna" value={fmtTime(d0.moonset)} icon="🌒" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <span className="text-2xl">🌙</span>
              <div>
                <p className="text-sm font-bold text-ink">{d0.moonPhaseName}</p>
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50">{Math.round(d0.moonIllumination * 100)}% iluminada</p>
              </div>
            </div>
          </div>

          {/* Weather */}
          <div className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-ink/12 pb-4">
              <h2 className="font-display uppercase text-2xl text-ink leading-none">Meteo</h2>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${weather.activity.score >= 4 ? 'bg-accent/10 text-accent border border-accent/30' : weather.activity.score <= 2 ? 'bg-amber-500/10 text-amber-700 border border-amber-500/30' : 'border border-ink/20 text-ink/60'}`}>
                {weather.activity.label}
              </span>
            </div>
            {weather.available ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Fact label="Temperatura" value={weather.tempC != null ? `${weather.tempC}°C` : '—'} icon="🌡️" />
                  <Fact label="Viento" value={weather.windKmh != null ? `${weather.windKmh} km/h ${weather.windDir ?? ''}` : '—'} icon="💨" />
                  <Fact label="Presión" value={weather.pressureHpa != null ? `${weather.pressureHpa} hPa` : '—'} icon="📊" sub={weather.pressureTrend ?? undefined} />
                  {s.type === 'mar' ? (
                    <Fact label="Oleaje" value={weather.waveM != null ? `${weather.waveM} m` : '—'} icon="🌊" sub={weather.seaTempC != null ? `mar ${weather.seaTempC}°C` : undefined} />
                  ) : (
                    <Fact label="Actividad" value={`${weather.activity.score}/5`} icon="🎣" />
                  )}
                </div>
                <p className="text-[12px] text-ink/60 leading-relaxed">{weather.activity.reason}</p>
              </>
            ) : (
              <p className="text-sm text-ink/50">La previsión meteorológica no está disponible ahora mismo. Vuelve a intentarlo en unos minutos.</p>
            )}
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
          <h2 className="font-display uppercase text-2xl text-ink">Cómo aprovechar las mejores horas en {s.name}</h2>
          <p>
            La teoría solunar sostiene que los peces se alimentan con más intensidad cuando la luna está en su punto más alto o
            más bajo (periodos mayores) y al salir y ponerse (periodos menores). Si además coinciden con el amanecer o el
            atardecer y con una presión atmosférica en descenso, tienes la ventana perfecta.
          </p>
          <p>
            Prepara tu jornada con el equipo adecuado: revisa nuestras{' '}
            <Link href="/categories/canas" className="text-accent underline">cañas de pescar</Link>,{' '}
            <Link href="/categories/carretes" className="text-accent underline">carretes</Link> y{' '}
            <Link href="/categories/senuelos" className="text-accent underline">señuelos</Link>, echa un vistazo a nuestras{' '}
            <Link href="/guias" className="text-accent underline">guías de pesca</Link> o pregunta directamente a nuestro{' '}
            <Link href="/advice" className="text-accent underline">asesor</Link>.
          </p>
        </div>

        {/* Other spots */}
        <div className="border-t border-ink/12 pt-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50 mb-3">Otras zonas</p>
          <div className="flex flex-wrap gap-2">
            {FISHING_SPOTS.filter((o) => o.slug !== s.slug).slice(0, 12).map((o) => (
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

function Fact({ label, value, icon, sub }: { label: string; value: string; icon: string; sub?: string }) {
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
