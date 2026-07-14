import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import FishRating from '@/components/FishRating'
import { FISHING_SPOTS } from '@/lib/fishing-spots'
import { solunarDay } from '@/lib/solunar'
import { fmtTime, todayMadridISO, fmtDateLong } from '@/lib/solunar-format'

export const revalidate = 1800

export const metadata: Metadata = {
  title: 'Mejores horas de pesca hoy · calendario solunar por localidad',
  description:
    'Descubre las mejores horas para pescar hoy en las principales zonas de España: periodos solunares, sol y luna, y meteo de pesca. Elige tu localidad de mar o de agua dulce.',
  alternates: { canonical: '/mejores-horas' },
}

export default function MejoresHorasHub() {
  const today = todayMadridISO()
  const rows = FISHING_SPOTS.map((s) => ({ spot: s, sol: solunarDay(s.lat, s.lon, today) }))
  const mar = rows.filter((r) => r.spot.type === 'mar')
  const interior = rows.filter((r) => r.spot.type === 'interior')

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">● Herramienta de pescador</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">Mejores horas de pesca</h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">
            Calendario solunar y meteo para elegir el mejor momento de tu próxima salida. Elige tu zona para ver los
            periodos de máxima actividad, la fase lunar y las condiciones. {fmtDateLong(today)}.
          </p>
          <Link href="/calendario" className="inline-flex items-center gap-2 mt-4 bg-ink text-paper px-4 py-2.5 text-xs font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift hover:bg-accent hover:border-accent">
            🌙 Ver calendario del pescador
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8 space-y-10">
        <SpotGroup title="Pesca en el mar" icon="🌊" rows={mar} />
        <SpotGroup title="Pesca en agua dulce" icon="🎣" rows={interior} />

        <div className="border-t border-ink/12 pt-8 space-y-3 text-[15px] text-ink/80 leading-relaxed">
          <h2 className="font-display uppercase text-2xl text-ink">¿Qué son las mejores horas de pesca?</h2>
          <p>
            Según la teoría solunar, la actividad de los peces aumenta en cuatro momentos del día ligados a la posición de la
            luna: los <strong>periodos mayores</strong> (luna en su punto más alto y más bajo) y los{' '}
            <strong>periodos menores</strong> (salida y puesta de la luna). Cuando coinciden con el amanecer, el atardecer o
            una bajada de presión, son las ventanas más productivas. Combínalo con el equipo adecuado de nuestro{' '}
            <Link href="/categories/canas" className="text-accent underline">catálogo</Link> y las{' '}
            <Link href="/guias" className="text-accent underline">guías de pesca</Link>.
          </p>
        </div>
      </section>
    </Layout>
  )
}

function SpotGroup({
  title,
  icon,
  rows,
}: {
  title: string
  icon: string
  rows: { spot: (typeof FISHING_SPOTS)[number]; sol: ReturnType<typeof solunarDay> }[]
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3 flex items-center gap-2">
        <span aria-hidden>{icon}</span> {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map(({ spot, sol }) => {
          const major = sol.periods.find((p) => p.kind === 'mayor')
          return (
            <Link
              key={spot.slug}
              href={`/mejores-horas/${spot.slug}`}
              className="group border border-ink/12 rounded-xl bg-paper p-4 hover-shift hover:border-ink/25 transition-all flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-bold text-ink group-hover:text-accent transition-colors truncate">{spot.name}</p>
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50">{spot.region}</p>
                {major && <p className="text-xs text-ink/60 mt-1">Mejor hora hoy: <span className="font-bold text-ink">{fmtTime(major.start)}</span></p>}
              </div>
              <FishRating value={sol.rating} className="flex-shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
