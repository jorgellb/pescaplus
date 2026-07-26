import type { Metadata } from 'next'
import Layout from '@/components/Layout'
import NauticalChart from '@/components/carta/NauticalChart'
import { getChartProvider, attributionFor, NOT_FOR_NAVIGATION } from '@/lib/chart-providers'
import { getSpot } from '@/lib/fishing-spots'
import { getSessionUser } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Carta náutica de pesca: balizamiento y profundidad',
  description:
    'Carta náutica para pescadores en España: balizamiento, boyas y batimetría sobre el litoral. Ayuda para preparar tu salida — no válida para la navegación.',
  alternates: { canonical: '/carta' },
}

type Params = { searchParams: Promise<{ zona?: string }> }

export default async function CartaPage({ searchParams }: Params) {
  const { zona } = await searchParams
  const spot = zona ? getSpot(zona) : null
  const provider = getChartProvider()
  const user = await getSessionUser()
  // Sin zona, se abre sobre el litoral peninsular a escala de conjunto.
  const initial = spot
    ? { lon: spot.lon, lat: spot.lat, zoom: 11 }
    : { lon: -3.7, lat: 39.5, zoom: 5.4 }

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="font-display text-2xl sm:text-3xl text-ink">
            Carta náutica{spot ? ` · ${spot.name}` : ''}
          </h1>
          <p className="text-[14px] text-ink/70 mt-1.5 max-w-3xl">
            Balizamiento y profundidad sobre el litoral, para preparar la salida.
          </p>
          {/* El aviso va en la propia página, no escondido en un pie legal. */}
          <p className="mt-3 text-[13px] text-amber-900 bg-amber-500/10 border border-amber-600/30 rounded-xl px-3.5 py-2.5">
            ⚠️ {NOT_FOR_NAVIGATION}
          </p>
        </div>
      </section>

      <NauticalChart provider={provider} attribution={attributionFor(provider)} initial={initial} loggedIn={!!user} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-[13px] text-ink/60 max-w-3xl">
          {provider.sourceNote} Las profundidades son orientativas y proceden de modelos batimétricos,
          no de sondas oficiales corregidas.
        </p>
      </section>
    </Layout>
  )
}
