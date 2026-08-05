import type { Metadata } from 'next'
import Link from 'next/link'
import Icon from '@/components/icons/Icon'
import Layout from '@/components/Layout'
import ChartLoader from '@/components/carta/ChartLoader'
import { getChartProvider, attributionFor, NOT_FOR_NAVIGATION } from '@/lib/chart-providers'
import { getSpot } from '@/lib/fishing-spots'
import { getSessionUser } from '@/lib/auth'
import { countPois } from '@/lib/nautical-pois'
import { POI_KINDS } from '@/lib/nautical-poi-types'

type Params = { searchParams: Promise<{ zona?: string }> }

const BASE: Metadata = {
  title: 'Carta náutica de pesca: balizamiento y profundidad',
  description:
    'Carta náutica para pescadores en España: balizamiento, boyas y batimetría sobre el litoral. Ayuda para preparar tu salida — no válida para la navegación.',
  alternates: { canonical: '/carta' },
}

/**
 * Con zona, el título nombra la zona. La página canoniza igualmente a /carta
 * —no queremos cientos de variantes compitiendo entre sí— pero quien la comparte
 * por WhatsApp verá de qué sitio habla.
 */
export async function generateMetadata({ searchParams }: Params): Promise<Metadata> {
  const { zona } = await searchParams
  const spot = zona ? getSpot(zona) : null
  if (!spot) return BASE
  return {
    ...BASE,
    title: `Carta náutica de ${spot.name}: fondo y balizamiento`,
    description: `Profundidad, tipo de fondo, isóbatas y balizamiento frente a ${spot.name} (${spot.region}). Ayuda para preparar la salida — no válida para la navegación.`,
  }
}

export default async function CartaPage({ searchParams }: Params) {
  const { zona } = await searchParams
  const spot = zona ? getSpot(zona) : null
  const provider = getChartProvider()
  const user = await getSessionUser()
  const pois = await countPois()
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
            <strong className="text-ink">Sonda, tipo de fondo, isóbatas y balizamiento</strong> de la costa
            española, para preparar la salida — y para llevártela al agua.
          </p>

          {/* LO QUE NADIE MÁS TIENE, dicho donde se ve.
              El service worker ya guarda teselas, sondas y fondos de lo que
              miras, pero eso no se contaba en ninguna parte: quien entra ve
              "otro mapa" y no sabe que es el único que le va a funcionar a tres
              millas de la costa, que es justo donde hace falta. */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl">
            {[
              { icon: 'download' as const, t: 'Funciona sin cobertura', d: 'Lo que miras se guarda solo. A tres millas, sin 4G, la carta sigue ahí.' },
              { icon: 'ruler' as const, t: 'Sonda con su fuente', d: 'Profundidad real del levantamiento batimétrico, con la referencia a pie de dato.' },
              { icon: 'rock' as const, t: 'Tipo de fondo', d: 'Roca, arena o fango, y la pendiente. Para saber dónde presentar antes de salir.' },
            ].map((c) => (
              <div key={c.t} className="flex gap-2.5">
                <Icon name={c.icon} className="w-4 h-4 text-accent shrink-0 mt-0.5" strokeWidth={1.8} />
                <div>
                  <p className="text-[13px] font-semibold text-ink leading-snug">{c.t}</p>
                  <p className="text-[12px] text-ink/60 leading-snug mt-0.5">{c.d}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-ink/50 mt-3 max-w-3xl">
            Datos de referencia para preparar la pesca. <strong className="text-ink/70">No sustituye a la
            cartografía oficial para navegar</strong> ni a la sonda del barco.
          </p>
          {/* Con zona, la carta era un callejón sin salida: enseñaba el fondo y
              ahí terminaba. La previsión de esa misma zona es lo siguiente que
              se quiere mirar antes de decidir si se sale. */}
          {spot && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Link href={`/mejores-horas/${spot.slug}`}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline">
                <Icon name="clock" className="w-3.5 h-3.5" strokeWidth={2} />Mejores horas en {spot.name}
              </Link>
              <span className="text-ink/25">·</span>
              <Link href={`/diario?zona=${spot.slug}`}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline">
                <Icon name="rod" className="w-3.5 h-3.5" strokeWidth={2} />Apuntar una captura aquí
              </Link>
            </div>
          )}
          {/* El aviso va en la propia página, no escondido en un pie legal. */}
          <p className="mt-3 text-[13px] text-amber-900 bg-amber-500/10 border border-amber-600/30 rounded-xl px-3.5 py-2.5 inline-flex items-start gap-1.5">
            <Icon name="warning" className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={2} />{NOT_FOR_NAVIGATION}
          </p>
        </div>
      </section>

      <ChartLoader provider={provider} attribution={attributionFor(provider)} initial={initial} loggedIn={!!user} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-[13px] text-ink/60 max-w-3xl">
          {provider.sourceNote} Las profundidades son orientativas y proceden de modelos batimétricos,
          no de sondas oficiales corregidas.
        </p>
        {/* Decir cuántos puntos hay es la única medida honesta de la cobertura:
            que falte una rampa no significa que no exista, sino que no consta. */}
        {Object.keys(pois).length > 0 && (
          <p className="text-[13px] text-ink/60 max-w-3xl mt-2">
            De OpenStreetMap:{' '}
            {POI_KINDS.filter((k) => pois[k.id] > 0)
              .map((k) => `${pois[k.id]} ${k.plural.toLowerCase()}`)
              .join(', ')}
            . Es lo que hay cartografiado, no todo lo que existe: si conoces una que falta, puedes añadirla en OpenStreetMap.
          </p>
        )}
      </section>
    </Layout>
  )
}
