import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import OperatorRegister from '@/components/charters/OperatorRegister'
import OperatorDashboard from '@/components/charters/OperatorDashboard'
import { getOperatorByToken } from '@/lib/operators-store'
import { listChartersByOperator } from '@/lib/charters-store'
import { FISHING_SPOTS, getSpot } from '@/lib/fishing-spots'
import { SEA_SPECIES } from '@/lib/fishing-species'
import { fmtDayLabel } from '@/lib/solunar-format'

export const metadata: Metadata = {
  title: '¿Eres patrón? Ofrece tus salidas de pesca',
  description: 'Regístrate como operador de chárter de pesca en PescaPlus: verificamos tu licencia y seguro y publicas tus salidas para que los pescadores reserven.',
  robots: { index: false, follow: true },
}

type Params = { searchParams: Promise<{ id?: string; t?: string; nuevo?: string }> }

export default async function OperatorPage({ searchParams }: Params) {
  const { id, t, nuevo } = await searchParams
  const spots = FISHING_SPOTS.map((s) => ({ slug: s.slug, name: s.name, region: s.region }))
  const species = SEA_SPECIES.map((s) => ({ id: s.id, name: s.name }))

  const operator = id && t ? await getOperatorByToken(id, t) : null

  if (operator) {
    const charters = await listChartersByOperator(operator.id)
    return (
      <Layout>
        <section className="bg-paper border-b border-ink/12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">⚓ Panel de operador{operator.verified ? ' · verificado ✓' : ' · pendiente'}</p>
            <h1 className="font-display uppercase text-3xl sm:text-4xl leading-[1.02] text-ink">{operator.businessName || operator.name}</h1>
            {nuevo === '1' && <p className="text-ink/70 text-sm max-w-2xl mt-3">¡Registrado! <strong>Guarda este enlace privado</strong> — es tu acceso al panel. Verificaremos tu licencia y seguro y podrás publicar salidas.</p>}
          </div>
        </section>
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <OperatorDashboard
            operatorId={operator.id}
            manageToken={t!}
            verified={operator.verified}
            defaultSpot={operator.spotSlug}
            spots={spots}
            species={species}
            charters={charters.map((c) => ({ id: c.id, spotName: getSpot(c.spotSlug)?.name ?? c.spotSlug, dateISO: c.dateISO, dayLabel: fmtDayLabel(c.dateISO), timeStart: c.timeStart, modality: c.modality, pricePerPerson: c.pricePerPerson, maxPlaces: c.maxPlaces, placesTaken: c.placesTaken, status: c.status, bookings: c.bookings.map((b) => ({ id: b.id, name: b.name, contact: b.contact, people: b.people, message: b.message, status: b.status })) }))}
          />
        </section>
      </Layout>
    )
  }

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5"><Link href="/charters" className="hover:text-accent">Chárters</Link> <span className="mx-1">/</span> <span className="text-ink">Operador</span></nav>
          <h1 className="font-display uppercase text-3xl sm:text-4xl md:text-5xl leading-[1.02] text-ink">¿Eres patrón profesional?</h1>
          <p className="text-ink/60 text-sm max-w-2xl mt-3">Ofrece tus salidas de pesca a nuestra comunidad. Verificamos tu <strong className="text-ink">titulación y tu seguro</strong>, y publicas tus chárters para que reserven plaza.</p>
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <OperatorRegister spots={spots} />
      </section>
    </Layout>
  )
}
