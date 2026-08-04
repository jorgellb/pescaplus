import type { Metadata } from 'next'
import Link from 'next/link'
import Layout from '@/components/Layout'
import OperatorRegister from '@/components/charters/OperatorRegister'
import OperatorPitch from '@/components/charters/OperatorPitch'
import OperatorDashboard from '@/components/charters/OperatorDashboard'
import { getOperatorByToken } from '@/lib/operators-store'
import { getSessionUser } from '@/lib/auth'
import { buildDashboardCharters, toProfileProps } from '@/lib/operator-view'
import { syncOperatorStripe } from '@/lib/charter-payments'
import { stripeConfigured, PLATFORM_FEE_PERCENT } from '@/lib/stripe'
import { listChartersByOperator } from '@/lib/charters-store'
import { FISHING_SPOTS } from '@/lib/fishing-spots'
import { SEA_SPECIES } from '@/lib/fishing-species'
import Icon from '@/components/icons/Icon'

/**
 * Esta URL es dos páginas: con `id` y `t` es el panel privado del patrón, y sin
 * ellos, el argumentario público para captar patrones.
 *
 * Antes TODA la ruta estaba en `noindex`, y eso dejaba invisible para Google la
 * página más importante del lado de la oferta: un patrón que busque «publicar
 * salidas de pesca» no la encontraba jamás. Ahora el `noindex` se aplica solo
 * cuando hay token, que es lo que de verdad no debe indexarse.
 */
export async function generateMetadata({ searchParams }: Params): Promise<Metadata> {
  const { id, t } = await searchParams
  if (id && t) return { title: 'Panel del patrón', robots: { index: false, follow: false } }
  return {
    title: 'Publica tus salidas de pesca: da de alta tu chárter',
    description: `¿Eres patrón profesional? Publica tus chárters de pesca gratis en PescaPlus: sin cuota ni exclusividad, ${PLATFORM_FEE_PERCENT} % de comisión solo cuando cobras, y cada salida con la previsión de mareas y viento de ese día. Verificamos tu titulación y tu seguro.`,
    alternates: { canonical: '/charters/operador' },
  }
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
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3"><Icon name="anchor" className="w-3.5 h-3.5 inline -mt-0.5" strokeWidth={2} /> Panel de operador{operator.verified
              ? <> · verificado <Icon name="checkCircle" className="w-3.5 h-3.5 inline -mt-0.5 text-accent" strokeWidth={2} /></>
              : ' · pendiente'}</p>
            <h1 className="font-display uppercase text-3xl sm:text-4xl leading-[1.02] text-ink">{operator.businessName || operator.name}</h1>
            {nuevo === '1' && <p className="text-ink/70 text-sm max-w-2xl mt-3">¡Registrado! <strong>Guarda este enlace privado</strong> — es tu acceso al panel. Verificaremos tu licencia y seguro y podrás publicar salidas.</p>}
            {stripe === 'done' && stripeReady && <p className="text-accent text-sm max-w-2xl mt-3 inline-flex items-start gap-1.5"><Icon name="checkCircle" className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />Stripe conectado. Ya puedes recibir reservas pagadas por adelantado.</p>}
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/60 mb-5"><Link href="/charters" className="hover:text-accent">Chárters</Link> <span className="mx-1">/</span> <span className="text-ink">Patrones</span></nav>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3"><Icon name="anchor" className="w-3.5 h-3.5 inline -mt-0.5" strokeWidth={2} /> Para patrones profesionales</p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl md:text-6xl leading-[1.02] text-ink">Llena tus salidas<br />los días que importan</h1>
          <p className="text-ink/70 text-[15px] max-w-2xl mt-4 leading-relaxed">
            Publica tus chárters gratis, sin cuota ni exclusividad. Cada salida sale acompañada de la
            previsión real de ese día en tu puerto — que es lo que hace que un pescador se decida.
          </p>
          <a href="#alta" className="inline-flex items-center gap-2 bg-ink text-paper px-6 py-3 text-sm font-semibold rounded-full shadow-hard hover-shift hover:bg-accent mt-7">
            <Icon name="anchor" className="w-4 h-4" strokeWidth={2} /> Darme de alta
          </a>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <OperatorPitch />
      </section>

      <section id="alta" className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 scroll-mt-8">
        <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[1.02] text-ink">Date de alta</h2>
        <p className="text-[14px] text-ink/65 mt-2 mb-6">
          Cinco minutos. Después te escribimos para verificar la titulación y el seguro.
        </p>
        <OperatorRegister spots={spots} />
      </section>
    </Layout>
  )
}
