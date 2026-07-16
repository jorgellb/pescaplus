import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import SpotSearch from '@/components/forecast/SpotSearch'
import { getSpot, nearestSpots, type FishingSpot } from '@/lib/fishing-spots'
import { getMarineForecast, bestWindow, groupByDay, type FishingWindow } from '@/lib/marine-forecast'
import { scoreHex, scoreLabel } from '@/lib/forecast-format'
import { fmtDayLabel, fmtWindowRange, fmtDateLong, todayMadridISO } from '@/lib/solunar-format'

export const metadata: Metadata = {
  title: 'Comparador de zonas de pesca: ¿dónde y qué día salir?',
  description: 'Compara hasta tres zonas de pesca día a día (próximos 7 días) con la puntuación real de cada jornada y elige dónde y cuándo salir.',
  robots: { index: false, follow: true },
}

type SP = { searchParams: Promise<{ zonas?: string }> }

interface ZoneDay {
  dateISO: string
  dayStart: number
  win: FishingWindow | null
  avg: number
}

async function zoneData(s: FishingSpot): Promise<{ spot: FishingSpot; days: ZoneDay[] }> {
  const forecast = await getMarineForecast(s, null, 'tierra')
  const days = groupByDay(forecast.hours)
    .slice(0, 7)
    .map((g) => ({
      dateISO: g.dateISO,
      dayStart: g.hours[0].time,
      win: bestWindow(g.hours),
      avg: Math.round(g.hours.reduce((sum, h) => sum + h.score, 0) / g.hours.length),
    }))
  return { spot: s, days }
}

export default async function CompararPage({ searchParams }: SP) {
  const { zonas } = await searchParams
  const slugs = [...new Set((zonas ?? '').split(',').map((x) => x.trim()).filter(Boolean))].slice(0, 3)
  const spots = slugs.map((sl) => getSpot(sl)).filter((x): x is FishingSpot => !!x)

  const zones = await Promise.all(spots.map(zoneData))
  const today = todayMadridISO()

  // Weekend/overall verdict: best zone-day cell.
  let best: { zone: string; slug: string; dateISO: string; dayStart: number; win: FishingWindow | null; score: number } | null = null
  for (const z of zones) {
    for (const d of z.days) {
      const score = d.win?.avg ?? d.avg
      if (!best || score > best.score) best = { zone: z.spot.name, slug: z.spot.slug, dateISO: d.dateISO, dayStart: d.dayStart, win: d.win, score }
    }
  }

  const zonesParam = (list: string[]) => (list.length ? `?zonas=${list.join(',')}` : '')
  const suggestions = spots.length ? nearestSpots(spots[0], 6).filter((n) => !slugs.includes(n.slug)).slice(0, 4) : []
  const dayRows = zones[0]?.days ?? []

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5">
            <Link href="/" className="hover:text-accent">Inicio</Link> <span className="mx-1">/</span>{' '}
            <Link href="/mejores-horas" className="hover:text-accent">Mejores horas</Link> <span className="mx-1">/</span>{' '}
            <span className="text-ink">Comparar</span>
          </nav>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">⚖️ Comparador de zonas</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">¿Dónde y qué día?</h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">
            Compara hasta tres zonas con la puntuación real de cada día de la próxima semana y decide tu salida. {fmtDateLong(today)}.
          </p>

          {/* Selected zones */}
          <div className="flex flex-wrap items-center gap-2 mt-5">
            {spots.map((s) => (
              <span key={s.slug} className="inline-flex items-center gap-2 bg-ink text-paper rounded-full pl-4 pr-1.5 py-1.5 text-sm font-bold">
                {s.name}
                <Link
                  href={`/mejores-horas/comparar${zonesParam(slugs.filter((x) => x !== s.slug))}`}
                  aria-label={`Quitar ${s.name}`}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-paper/15 hover:bg-paper hover:text-ink transition-colors text-xs"
                >
                  ✕
                </Link>
              </span>
            ))}
            {spots.length < 3 && suggestions.map((n) => (
              <Link
                key={n.slug}
                href={`/mejores-horas/comparar${zonesParam([...slugs, n.slug])}`}
                className="inline-flex items-center gap-1.5 border border-ink/15 rounded-full px-3.5 py-1.5 text-sm font-semibold text-ink/70 hover:bg-ink hover:text-paper transition-colors"
              >
                + {n.name}
              </Link>
            ))}
          </div>
          {spots.length < 3 && (
            <div className="mt-4 max-w-xl">
              <SpotSearch />
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/35 mt-1.5">Busca una zona y ábrela; desde su ficha podrás añadirla a la comparación.</p>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 sm:px-6 space-y-8">
        {zones.length === 0 ? (
          <div className="border border-ink/15 rounded-2xl bg-paper p-8 text-center space-y-3">
            <span className="text-4xl inline-block">⚖️</span>
            <p className="text-ink/60 text-sm max-w-md mx-auto">Elige zonas para comparar. Consejo: abre una localidad en <Link href="/mejores-horas" className="text-accent underline">Mejores horas</Link> y pulsa «Comparar con zonas cercanas».</p>
          </div>
        ) : (
          <>
            {/* Verdict */}
            {best && (
              <div className="border-2 border-ink rounded-2xl bg-paper shadow-hard-md p-5 flex flex-wrap items-center gap-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">🏆 Mejor plan de la semana</span>
                <span className="font-display uppercase text-2xl text-ink capitalize">{fmtDayLabel(best.dateISO)} en {best.zone}</span>
                {best.win && (
                  <span className="inline-flex items-center gap-2">
                    <span className="font-display text-xl text-ink">{fmtWindowRange(best.win.start, best.win.end, best.dayStart)}</span>
                    <span className="text-paper text-xs font-bold rounded px-2 py-0.5" style={{ background: scoreHex(best.score) }}>{best.score}</span>
                  </span>
                )}
                <Link href={`/mejores-horas/${best.slug}/plan?dia=${best.dateISO}`} className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-accent transition-colors">
                  🧾 Generar plan →
                </Link>
              </div>
            )}

            {/* Comparison table */}
            <div className="border border-ink/15 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[560px]">
                  <thead>
                    <tr className="border-b border-ink/12">
                      <th className="text-left font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50 px-4 py-3">Día</th>
                      {zones.map((z) => (
                        <th key={z.spot.slug} className="text-left px-4 py-3">
                          <Link href={`/mejores-horas/${z.spot.slug}`} className="font-display uppercase text-lg text-ink hover:text-accent transition-colors leading-none">
                            {z.spot.name}
                          </Link>
                          <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40">{z.spot.region}</p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dayRows.map((row, di) => (
                      <tr key={row.dateISO} className="border-b border-ink/[0.07] last:border-0">
                        <td className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wide text-ink/60 capitalize whitespace-nowrap">
                          {di === 0 ? 'Hoy' : di === 1 ? 'Mañana' : fmtDayLabel(row.dateISO)}
                        </td>
                        {zones.map((z) => {
                          const d = z.days[di]
                          if (!d) return <td key={z.spot.slug} className="px-4 py-3 text-ink/30">–</td>
                          const score = d.win?.avg ?? d.avg
                          const isBest = best && z.spot.name === best.zone && d.dateISO === best.dateISO
                          return (
                            <td key={z.spot.slug} className={`px-4 py-3 ${isBest ? 'bg-accent/[0.07]' : ''}`}>
                              <div className="flex items-center gap-2.5">
                                <span className="text-paper text-xs font-bold rounded px-2 py-1 min-w-[34px] text-center" style={{ background: scoreHex(score) }}>{score}</span>
                                <div className="leading-tight">
                                  <p className="text-[13px] font-bold text-ink">{d.win ? fmtWindowRange(d.win.start, d.win.end, d.dayStart) : '—'}</p>
                                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40">{scoreLabel(score)}{isBest ? ' · 🏆' : ''}</p>
                                </div>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-ink/35">Puntuación combinada de la mejor ventana de cada día (solunar + viento + presión + mar) · Open-Meteo + solunar PescaPlus.</p>
          </>
        )}
      </section>
    </Layout>
  )
}
