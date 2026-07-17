import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import UseMyLocation from '@/components/forecast/UseMyLocation'
import SpotSearch from '@/components/forecast/SpotSearch'
import SpotMap from '@/components/forecast/SpotMap'
import RegionAccordion from '@/components/forecast/RegionAccordion'
import FavoriteZones from '@/components/forecast/FavoriteZones'
import { FISHING_SPOTS } from '@/lib/fishing-spots'
import { lunarInfo, phaseEmoji } from '@/lib/solunar'
import { todayMadridISO, fmtDateLong } from '@/lib/solunar-format'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Mejores horas de pesca hoy · calendario solunar por localidad',
  description:
    'Descubre las mejores horas para pescar hoy en toda la costa de España y en los principales embalses: periodos solunares, sol y luna, y meteo de pesca. Elige tu localidad.',
  alternates: { canonical: '/mejores-horas' },
}

export default function MejoresHorasHub() {
  const today = todayMadridISO()
  const moon = lunarInfo(today)
  const coastalCount = FISHING_SPOTS.filter((s) => s.type === 'mar').length

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">● Herramienta de pescador</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">Mejores horas de pesca</h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">
            Calendario solunar y meteo para elegir el mejor momento de tu próxima salida. Elige tu localidad entre{' '}
            {coastalCount} puntos de toda la costa española y los principales embalses. {fmtDateLong(today)}.
          </p>
          <div className="mt-6">
            <SpotSearch />
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <UseMyLocation />
            <span className="inline-flex items-center gap-2 border border-ink/15 rounded-xl px-3 py-2 bg-paper text-sm">
              <span className="text-lg" aria-hidden>{phaseEmoji(moon.phase)}</span>
              <span className="font-bold text-ink">{moon.name}</span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50">{Math.round(moon.illumination * 100)}%</span>
            </span>
            <Link href="/donde-pescar" className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 text-xs font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift hover:bg-accent hover:border-accent">
              🗺️ ¿Dónde pescar? · Mapa del día
            </Link>
            <Link href="/calendario" className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 text-xs font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift hover:bg-accent hover:border-accent">
              🌙 Calendario del pescador
            </Link>
            <Link href="/mejores-horas/comparar" className="inline-flex items-center gap-2 bg-paper text-ink px-4 py-2.5 text-xs font-bold uppercase tracking-wide border border-ink/15 rounded-xl shadow-hard hover-shift hover:bg-ink hover:text-paper">
              ⚖️ Comparador
            </Link>
          </div>
          <FavoriteZones />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Map — the real IGN coastline with every spot on top */}
          <div className="lg:col-span-3 space-y-3 lg:sticky lg:top-24">
            <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3 flex items-center gap-2">
              <span aria-hidden>🗺️</span> Elige tu zona en el mapa
            </h2>
            <SpotMap />
          </div>

          {/* Per-comunidad accordions */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-display uppercase text-2xl md:text-3xl leading-none border-b border-ink/12 pb-3 flex items-center gap-2">
              <span aria-hidden>📍</span> Por comunidad
            </h2>
            <RegionAccordion />
          </div>
        </div>

        <div className="border-t border-ink/12 mt-12 pt-8 space-y-3 text-[15px] text-ink/80 leading-relaxed">
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
