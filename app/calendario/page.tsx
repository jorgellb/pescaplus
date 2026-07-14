import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { lunarInfo, phaseEmoji } from '@/lib/solunar'
import { SPECIES_SEASONS, MONTHS_ABBR } from '@/lib/fishing-seasons'
import { todayMadridISO } from '@/lib/solunar-format'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Calendario del pescador · fases lunares y mejores meses por especie',
  description:
    'Calendario de pesca con las fases lunares del mes, los mejores días por la luna y los mejores meses para pescar cada especie en España. Planifica tus salidas.',
  alternates: { canonical: '/calendario' },
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export default function CalendarioPage() {
  const today = todayMadridISO()
  const [y, m] = today.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  // Weekday of day 1 (Mon = 0 … Sun = 6)
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7

  const cells: ({ iso: string; day: number; illum: number; phase: number; prime: boolean; isToday: boolean } | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const info = lunarInfo(iso)
    cells.push({
      iso,
      day,
      illum: info.illumination,
      phase: info.phase,
      prime: info.illumination < 0.06 || info.illumination > 0.94,
      isToday: iso === today,
    })
  }

  const primeDays = cells.filter((c): c is NonNullable<typeof c> => !!c && c.prime)
  const currentMonthIdx = m - 1

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">● Herramienta de pescador</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">Calendario del pescador</h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">
            Fases lunares del mes, los mejores días según la luna y los mejores meses para pescar cada especie. Planifica
            tus salidas y combínalo con las{' '}
            <Link href="/mejores-horas" className="text-accent underline">mejores horas de pesca</Link> de tu zona.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-10 sm:px-6 space-y-12">
        {/* Moon calendar */}
        <div className="space-y-4">
          <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3 capitalize">
            Fases de la luna · {MONTH_NAMES[currentMonthIdx]} {y}
          </h2>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center font-mono text-[11px] font-bold uppercase tracking-widest text-ink/40 py-1">{w}</div>
            ))}
            {cells.map((c, i) =>
              c === null ? (
                <div key={`e${i}`} />
              ) : (
                <div
                  key={c.iso}
                  className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-0.5 ${
                    c.isToday ? 'border-accent bg-accent/10' : c.prime ? 'border-accent/30 bg-accent/[0.04]' : 'border-ink/12 bg-paper'
                  }`}
                >
                  <span className="text-[11px] font-bold text-ink/60">{c.day}</span>
                  <span className="text-lg leading-none" aria-hidden>{phaseEmoji(c.phase)}</span>
                </div>
              ),
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-ink/60">
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-accent bg-accent/10" /> Hoy</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-accent/30 bg-accent/[0.04]" /> Mejores días (luna nueva o llena)</span>
          </div>
          {primeDays.length > 0 && (
            <p className="text-sm text-ink/70">
              Los días de <strong>luna nueva y llena</strong> concentran la mayor actividad solunar. Este mes destacan:{' '}
              <span className="font-bold text-ink">
                {primeDays.map((c) => c.day).join(', ')}
              </span>{' '}
              de {MONTH_NAMES[currentMonthIdx]}.
            </p>
          )}
        </div>

        {/* Best months by species */}
        <div className="space-y-4">
          <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3">Mejores meses por especie</h2>
          <div className="space-y-3">
            {SPECIES_SEASONS.map((sp) => (
              <div key={sp.name} className="border border-ink/12 rounded-xl bg-paper p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="font-bold text-ink">
                    {sp.category ? (
                      <Link href={`/categories/${sp.category}`} className="hover:text-accent transition-colors">{sp.name}</Link>
                    ) : (
                      sp.name
                    )}
                  </h3>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink/40">{sp.water === 'mar' ? 'Mar' : 'Agua dulce'}</span>
                </div>
                <div className="grid grid-cols-12 gap-1 mb-2">
                  {MONTHS_ABBR.map((mo, idx) => {
                    const good = sp.best.includes(idx + 1)
                    const isCurrent = idx === currentMonthIdx
                    return (
                      <div
                        key={mo}
                        title={mo}
                        className={`text-center text-[9px] sm:text-[10px] font-bold uppercase py-1 rounded ${
                          good ? 'bg-accent text-paper' : 'bg-ink/5 text-ink/40'
                        } ${isCurrent ? 'ring-2 ring-ink/40' : ''}`}
                      >
                        {mo[0]}
                      </div>
                    )
                  })}
                </div>
                <p className="text-[13px] text-ink/60 leading-relaxed">{sp.note}</p>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-ink/50">La franja resaltada marca el mes actual. Orientativo para planificar.</p>
        </div>

        {/* Vedas note */}
        <div className="border border-ink/15 rounded-2xl bg-paper p-6 space-y-3">
          <h2 className="font-display uppercase text-2xl text-ink leading-none">Vedas, tallas y licencias</h2>
          <p className="text-[15px] text-ink/80 leading-relaxed">
            Las <strong>vedas</strong> (épocas de veda de freza), las <strong>tallas mínimas</strong> y la{' '}
            <strong>licencia de pesca</strong> las regula <strong>cada comunidad autónoma</strong>, por lo que cambian según
            dónde pesques. Antes de salir, comprueba siempre la normativa vigente de tu comunidad y del coto o tramo
            concreto. Pescar de forma responsable protege el recurso para todos.
          </p>
          <p className="text-sm text-ink/60">
            ¿Dudas sobre qué equipo necesitas para una especie o temporada? Pregunta a nuestro{' '}
            <Link href="/advice" className="text-accent underline">asesor de pesca</Link> o revisa nuestras{' '}
            <Link href="/guias" className="text-accent underline">guías</Link>.
          </p>
        </div>
      </section>
    </Layout>
  )
}
