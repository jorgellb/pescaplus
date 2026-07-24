import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import NewMeetupForm from '@/components/quedadas/NewMeetupForm'
import { FISHING_SPOTS } from '@/lib/fishing-spots'
import { SEA_SPECIES } from '@/lib/fishing-species'

export const metadata: Metadata = {
  title: 'Organiza una quedada de pesca',
  description: 'Publica tu salida de pesca (orilla, kayak o barco a compartir gastos): día, hora, zona, plazas y especie objetivo. Otros pescadores se apuntan.',
  robots: { index: false, follow: true },
}

type Params = { searchParams: Promise<{ zona?: string; tipo?: string }> }

export default async function NuevaQuedadaPage({ searchParams }: Params) {
  const { zona, tipo } = await searchParams
  const spots = FISHING_SPOTS.map((s) => ({ slug: s.slug, name: s.name, region: s.region }))
  const species = SEA_SPECIES.map((s) => ({ id: s.id, name: s.name }))
  const defaultKind = tipo === 'llamada' ? 'llamada' : 'quedada'

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5">
            <Link href="/quedadas" className="hover:text-accent">Quedadas</Link> <span className="mx-1">/</span>{' '}
            <span className="text-ink">Nueva</span>
          </nav>
          <h1 className="font-display uppercase text-3xl sm:text-4xl md:text-5xl leading-[1.02] text-ink">Organiza una quedada</h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">
            Publica tu salida y otros pescadores se apuntan. Guardarás un enlace privado para gestionarla o cancelarla.
          </p>
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <NewMeetupForm spots={spots} species={species} defaultSpot={zona} defaultKind={defaultKind} />
      </section>
    </Layout>
  )
}
