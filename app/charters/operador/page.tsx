import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import OperatorRegister from '@/components/charters/OperatorRegister'
import OperatorDashboard from '@/components/charters/OperatorDashboard'
import { getOperatorByToken } from '@/lib/operators-store'
import { getSessionUser } from '@/lib/auth'
import { buildDashboardCharters, toProfileProps } from '@/lib/operator-view'
import { syncOperatorStripe } from '@/lib/charter-payments'
import { stripeConfigured } from '@/lib/stripe'
import { listChartersByOperator } from '@/lib/charters-store'
import { FISHING_SPOTS } from '@/lib/fishing-spots'
import { SEA_SPECIES } from '@/lib/fishing-species'

export const metadata: Metadata = {
  title: '¿Eres patrón? Ofrece tus salidas de pesca',
  description: 'Regístrate como operador de chárter de pesca en PescaPlus: verificamos tu licencia y seguro y publicas tus salidas para que los pescadores reserven.',
  robots: { index: false, follow: true },
}

type Params = { searchParams: Promise<{ id?: string; t?: string; nuevo?: string; stripe?: string }> }

export default async function OperatorPage({ searchParams }: Params) {
  const { id, t, nuevo, stripe } = await searchParams
  const spots = FISHING_SPOTS.map((s) => ({ slug: s.slug, name: s.name, region: s.region }))
  const species = SEA_SPECIES.map((s) => ({ id: s.id, name: s.name }))
  const paymentsAvailable = stripeConfigured()

  const operator = id && t ? await getOperatorByToken(id, t) : null

  if (operator) {
    // Refresh Stripe readiness when the operator just came back from onboarding,
    // or whenever they have an account that isn't marked ready yet.
    let stripeReady = operator.stripeReady
    if (paymentsAvailable && operator.stripeAccountId && (!operator.stripeReady || stripe === 'done')) {
      stripeReady = await syncOperatorStripe(operator)
    }
    // Valorar pescadores exige sesión: solo se ofrece si quien mira es la
    // cuenta dueña de este perfil (la API lo verifica igualmente).
    const viewer = await getSessionUser()
    const reviewerUserId = viewer && operator.userId === viewer.id ? viewer.id : null
    const charters = await listChartersByOperator(operator.id)
    return (
      <Layout>
        <section className="bg-paper border-b border-ink/[0.07]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">⚓ Panel de operador{operator.verified ? ' · verificado ✓' : ' · pendiente'}</p>
            <h1 className="font-display uppercase text-3xl sm:text-4xl leading-[1.02] text-ink">{operator.businessName || operator.name}</h1>
            {nuevo === '1' && <p className="text-ink/70 text-sm max-w-2xl mt-3">¡Registrado! <strong>Guarda este enlace privado</strong> — es tu acceso al panel. Verificaremos tu licencia y seguro y podrás publicar salidas.</p>}
            {stripe === 'done' && stripeReady && <p className="text-accent text-sm max-w-2xl mt-3">✓ Stripe conectado. Ya puedes recibir reservas pagadas por adelantado.</p>}
            {stripe === 'done' && !stripeReady && <p className="text-ink/70 text-sm max-w-2xl mt-3">Stripe está terminando de revisar tus datos. Vuelve a este enlace en unos minutos para comprobar si ya está activo.</p>}
          </div>
        </section>
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <OperatorDashboard
            operatorId={operator.id}
            manageToken={t!}
            verified={operator.verified}
            stripeReady={stripeReady}
            paymentsAvailable={paymentsAvailable}
            defaultSpot={operator.spotSlug}
            spots={spots}
            profile={toProfileProps(operator)}
            charters={await buildDashboardCharters(charters, { reviewerUserId: reviewerUserId })}
          />
        </section>
      </Layout>
    )
  }

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/[0.07]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/60 mb-5"><Link href="/charters" className="hover:text-accent">Chárters</Link> <span className="mx-1">/</span> <span className="text-ink">Operador</span></nav>
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
