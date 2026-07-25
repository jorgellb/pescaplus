import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import RequestBooking from '@/components/charters/RequestBooking'
import PayBooking from '@/components/charters/PayBooking'
import AskOperator from '@/components/messages/AskOperator'
import CharterIcon from '@/components/charters/CharterIcon'
import { BoatSpecs, TripSpecs } from '@/components/charters/CharterSpecs'
import { resolveOptions, LANGUAGES } from '@/lib/charter-options'
import { getCharter } from '@/lib/charters-store'
import { listReviewsForOperator } from '@/lib/reviews-store'
import { getSessionUser } from '@/lib/auth'
import { getOperatorByUser } from '@/lib/operators-store'
import { getSpot } from '@/lib/fishing-spots'
import { getSpecies } from '@/lib/fishing-species'
import { getMarineForecast, groupByDay, bestWindow, getModality } from '@/lib/marine-forecast'
import { dayVerdict, navigationWindows, safetyAlerts } from '@/lib/sea-state'
import { fmtDateLong, fmtWindowRange, todayMadridISO, addDaysISO } from '@/lib/solunar-format'

export const metadata: Metadata = { title: 'Chárter de pesca', robots: { index: false, follow: true } }

const MOD_LABEL: Record<string, string> = { tierra: '🏖️ Orilla', kayak: '🛶 Kayak', barco: '🚤 Barco' }

/** Headline fact with its icon (duración, tipo, grupo, idiomas). */
function SummaryChip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink/[0.07] bg-paper px-3.5 py-3">
      <CharterIcon name={icon} className="w-5 h-5 shrink-0 text-accent" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-ink/45 leading-none">{label}</p>
        <p className="font-semibold text-ink text-[14.5px] leading-tight mt-1 truncate">{value}</p>
      </div>
    </div>
  )
}

export default async function CharterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pagado?: string; cancelado?: string }> }) {
  const { id } = await params
  const { pagado, cancelado } = await searchParams
  const charter = await getCharter(id)
  if (!charter || !charter.operator?.verified) notFound()
  const spot = getSpot(charter.spotSlug)
  const sp = charter.targetSpecies ? getSpecies(charter.targetSpecies) : null
  const modality = getModality(charter.modality)
  const reviews = charter.operator.reviewCount > 0 ? await listReviewsForOperator(charter.operatorId, 8) : []
  const viewer = await getSessionUser()
  const viewerOperator = viewer ? await getOperatorByUser(viewer.id) : null
  const isOwner = !!viewerOperator && viewerOperator.id === charter.operatorId
  const langLabels = resolveOptions(LANGUAGES, charter.languages).map((l) => l.label).join(', ')
  const full = charter.placesTaken >= charter.maxPlaces
  const cancelled = charter.status === 'cancelled'

  const today = todayMadridISO()
  let outlook: { verdict: string; window: string | null; navSafe: boolean | null; danger: boolean } | null = null
  if (spot && spot.type === 'mar' && charter.dateISO >= today && charter.dateISO <= addDaysISO(today, 6)) {
    try {
      const forecast = await getMarineForecast(spot, charter.targetSpecies || null, charter.modality)
      const day = groupByDay(forecast.hours).find((g) => g.dateISO === charter.dateISO)
      if (day && day.hours.length) {
        const win = bestWindow(day.hours)
        const navWins = navigationWindows(day.hours, modality)
        const alerts = safetyAlerts(day.hours)
        outlook = {
          verdict: dayVerdict({ hours: day.hours, window: win, tideNote: null }),
          window: win ? fmtWindowRange(win.start, win.end, day.hours[0].time) : null,
          navSafe: navWins.length > 0,
          danger: alerts.some((a) => a.level === 'peligro') || navWins.length === 0,
        }
      }
    } catch { /* forecast unavailable */ }
  }

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5">
            <Link href="/charters" className="hover:text-accent">Chárters</Link> <span className="mx-1">/</span> <span className="text-ink">{spot?.name ?? charter.spotSlug}</span>
          </nav>
          {cancelled && <div className="border border-red-700/40 rounded-xl bg-red-700/[0.07] p-3 mb-5 text-sm font-bold text-red-900">Este chárter se ha cancelado.</div>}
          {pagado === '1' && <div className="border border-accent/40 rounded-xl bg-accent/[0.08] p-3 mb-5 text-sm font-bold text-ink">✅ ¡Pago completado! Tu plaza está reservada. El patrón recibirá tu reserva y te contactará con los detalles de la salida.</div>}
          {cancelado === '1' && <div className="border border-ink/20 rounded-xl bg-ink/[0.03] p-3 mb-5 text-sm text-ink/70">Has cancelado el pago. Tu plaza no se ha reservado; puedes intentarlo de nuevo cuando quieras.</div>}
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">{MOD_LABEL[charter.modality]}{sp ? ` · a por ${sp.name.toLowerCase()}` : ''}</p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-ink">{charter.highlights || `Pesca en ${spot?.name ?? charter.spotSlug}`}</h1>
          <p className="text-ink/60 text-[15px] mt-2 flex items-center gap-1.5">
            <CharterIcon name="location" className="w-4 h-4 shrink-0" />
            {charter.operator.marina || spot?.name || charter.spotSlug}
          </p>
          <p className="text-ink/70 text-[15px] mt-1 first-letter:uppercase">{fmtDateLong(charter.dateISO)} · {charter.timeStart}</p>

          {/* Chips de resumen: lo que un pescador compara de un vistazo. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
            <SummaryChip icon="clock" label="Duración" value={charter.durationH ? `${charter.durationH} horas` : 'A consultar'} />
            <SummaryChip icon={charter.tripType === 'privada' ? 'lock' : 'users'} label="Tipo de salida" value={charter.tripType === 'privada' ? 'Privada' : 'Compartida'} />
            <SummaryChip icon="users" label="Grupo" value={`${charter.maxPlaces} ${charter.maxPlaces === 1 ? 'persona' : 'personas'}`} />
            <SummaryChip icon="language" label="Idiomas" value={langLabels || 'Español'} />
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Operador verificado */}
        <div className="border border-accent/30 rounded-2xl bg-accent/[0.04] p-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">⚓ Patrón profesional verificado ✓</p>
          <p className="text-[15px] font-bold text-ink mt-1">{charter.operator.businessName || charter.operator.name}
            {charter.operator.reviewCount > 0 && <span className="ml-2 text-[13px] font-normal text-amber-600">★ {charter.operator.avgRating.toFixed(1)} <span className="text-ink/45">({charter.operator.reviewCount})</span></span>}
          </p>
          <p className="text-[13px] text-ink/70">{charter.operator.boatName} {charter.operator.boatType}{charter.operator.capacity ? ` · ${charter.operator.capacity} plazas` : ''}</p>
          {charter.operator.bio && <p className="text-[13px] text-ink/70 mt-1">{charter.operator.bio}</p>}
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink/40 mt-1">Licencia y seguro comprobados por PescaPlus.</p>
          {!cancelled && <div className="mt-3"><AskOperator charterId={charter.id} loggedIn={!!viewer} isOwner={isOwner} /></div>}
        </div>

        {/* Vista general */}
        {(charter.notes || charter.includes) && (
          <section>
            <h2 className="font-display text-2xl text-ink mb-2">Vista general</h2>
            {charter.notes && <p className="text-[15px] text-ink/80 leading-relaxed whitespace-pre-line">{charter.notes}</p>}
            {charter.includes && <p className="text-[15px] text-ink/80 mt-2"><strong className="font-semibold">Incluye:</strong> {charter.includes}</p>}
          </section>
        )}

        {charter.meetingPoint && (
          <div className="flex items-start gap-3 rounded-2xl border border-ink/[0.07] bg-paper p-4">
            <CharterIcon name="location" className="w-5 h-5 shrink-0 text-accent mt-0.5" />
            <div>
              <p className="font-semibold text-ink text-[15px]">Punto de encuentro</p>
              <p className="text-[14px] text-ink/70">{charter.meetingPoint}</p>
            </div>
          </div>
        )}

        {/* Todo lo que define la salida, con iconos */}
        <TripSpecs trip={{
          techniques: charter.techniques, species: charter.species, areas: charter.areas,
          included: charter.included, excluded: charter.excluded, policies: charter.policies,
          seasons: charter.seasons, languages: charter.languages, highlights: '',
        }} />

        {/* El barco */}
        <BoatSpecs boat={{
          boatName: charter.operator.boatName, boatType: charter.operator.boatType,
          capacity: charter.operator.capacity, crewSize: charter.operator.crewSize,
          boatLength: charter.operator.boatLength, boatBeam: charter.operator.boatBeam,
          boatEngineHp: charter.operator.boatEngineHp, boatMaxSpeedKn: charter.operator.boatMaxSpeedKn,
          boatYear: charter.operator.boatYear, marina: charter.operator.marina,
          navigation: charter.operator.navigation, safety: charter.operator.safety,
          amenities: charter.operator.amenities, gear: charter.operator.gear,
        }} />

        {/* Previsión del día */}
        {outlook && (
          <div className={`border rounded-2xl p-4 ${outlook.danger ? 'border-red-700/40 bg-red-700/[0.07]' : 'border-ink/15 bg-paper'}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">🌊 Previsión del día en {spot?.name}</p>
            {outlook.danger
              ? <p className="text-[14px] text-red-900 mt-1">⚠️ Condiciones exigentes o no navegables ese día. El patrón decide si la salida es segura.</p>
              : <p className="text-[14px] text-ink/85 mt-1">{outlook.verdict}{outlook.window ? ` · mejor ventana ${outlook.window}` : ''}{outlook.navSafe ? ' · navegación apta ✓' : ''}</p>}
            <Link href={`/mejores-horas/${charter.spotSlug}?modo=barco${charter.targetSpecies ? `&especie=${charter.targetSpecies}` : ''}`} className="inline-block text-[12px] font-bold uppercase tracking-wide text-accent hover:underline mt-1">Ver previsión completa →</Link>
          </div>
        )}

        {/* Reservar plaza: pago online si el operador tiene Stripe listo, si no, solicitud por contacto */}
        {!cancelled && (charter.operator.stripeReady
          ? <PayBooking id={charter.id} full={full} price={charter.pricePerPerson} />
          : <RequestBooking id={charter.id} full={full} price={charter.pricePerPerson} />)}

        {reviews.length > 0 && (
          <div className="space-y-3 border-t border-ink/12 pt-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">⭐ Opiniones de pescadores ({charter.operator.reviewCount})</p>
            {reviews.map((r) => (
              <div key={r.id} className="border border-ink/12 rounded-2xl bg-paper p-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{r.authorAvatar}</span>
                  <span className="font-bold text-ink text-sm">{r.authorName}</span>
                  <span className="text-amber-500 text-sm">{'★'.repeat(r.rating)}<span className="text-ink/20">{'★'.repeat(5 - r.rating)}</span></span>
                </div>
                {r.text && <p className="text-[14px] text-ink/80 mt-1.5">{r.text}</p>}
              </div>
            ))}
          </div>
        )}

        <p className="text-[12px] text-ink/50 leading-relaxed border-t border-ink/12 pt-6">
          Salida con patrón profesional verificado. Cada participante debe llevar su documentación.{charter.operator.stripeReady
            ? ' El pago se procesa de forma segura con Stripe; PescaPlus retiene una comisión de servicio y el resto llega al patrón.'
            : ' Coordinas el pago directamente con el patrón tras confirmar la plaza.'}
        </p>
      </section>
    </Layout>
  )
}
