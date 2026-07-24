import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import RequestBooking from '@/components/charters/RequestBooking'
import { getCharter } from '@/lib/charters-store'
import { getSpot } from '@/lib/fishing-spots'
import { getSpecies } from '@/lib/fishing-species'
import { getMarineForecast, groupByDay, bestWindow, getModality } from '@/lib/marine-forecast'
import { dayVerdict, navigationWindows, safetyAlerts } from '@/lib/sea-state'
import { fmtDateLong, fmtWindowRange, todayMadridISO, addDaysISO } from '@/lib/solunar-format'

export const metadata: Metadata = { title: 'Chárter de pesca', robots: { index: false, follow: true } }

const MOD_LABEL: Record<string, string> = { tierra: '🏖️ Orilla', kayak: '🛶 Kayak', barco: '🚤 Barco' }

export default async function CharterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const charter = await getCharter(id)
  if (!charter || !charter.operator?.verified) notFound()
  const spot = getSpot(charter.spotSlug)
  const sp = charter.targetSpecies ? getSpecies(charter.targetSpecies) : null
  const modality = getModality(charter.modality)
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
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">{MOD_LABEL[charter.modality]}{sp ? ` · a por ${sp.name.toLowerCase()}` : ''}</p>
          <h1 className="font-display uppercase text-3xl sm:text-4xl md:text-5xl leading-[1.02] text-ink">{spot?.name ?? charter.spotSlug}</h1>
          <p className="text-ink/70 text-[15px] mt-3 capitalize">{fmtDateLong(charter.dateISO)} · {charter.timeStart}{charter.durationH ? ` · ${charter.durationH} h` : ''}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2 text-sm"><span className="font-mono text-[10px] uppercase tracking-widest text-ink/50">Precio</span><span className="font-display text-lg text-ink">{charter.pricePerPerson} €/persona</span></span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2 text-sm"><span className="font-mono text-[10px] uppercase tracking-widest text-ink/50">Plazas</span><span className="font-display text-lg text-ink">{charter.placesTaken}/{charter.maxPlaces}</span></span>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Operador verificado */}
        <div className="border border-accent/30 rounded-2xl bg-accent/[0.04] p-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">⚓ Patrón profesional verificado ✓</p>
          <p className="text-[15px] font-bold text-ink mt-1">{charter.operator.businessName || charter.operator.name}</p>
          <p className="text-[13px] text-ink/70">{charter.operator.boatName} {charter.operator.boatType}{charter.operator.capacity ? ` · ${charter.operator.capacity} plazas` : ''}</p>
          {charter.operator.bio && <p className="text-[13px] text-ink/70 mt-1">{charter.operator.bio}</p>}
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink/40 mt-1">Licencia y seguro comprobados por PescaPlus.</p>
        </div>

        <div className="space-y-2 text-[15px] text-ink/85">
          {charter.includes && <p><strong>✅ Incluye:</strong> {charter.includes}</p>}
          {charter.notes && <p className="text-ink/75 whitespace-pre-line border-l-4 border-accent/40 pl-3">{charter.notes}</p>}
        </div>

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

        {/* Solicitar plaza (stub de pago) */}
        {!cancelled && <RequestBooking id={charter.id} full={full} price={charter.pricePerPerson} />}

        <p className="text-[12px] text-ink/50 leading-relaxed border-t border-ink/12 pt-6">
          Salida con patrón profesional verificado. Cada participante debe llevar su documentación. El pago con tarjeta
          en la web llegará pronto; de momento, coordinas el pago directamente con el patrón tras confirmar la plaza.
        </p>
      </section>
    </Layout>
  )
}
