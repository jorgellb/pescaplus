import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Layout from '@/components/Layout'
import JoinMeetup from '@/components/quedadas/JoinMeetup'
import ManageMeetup from '@/components/quedadas/ManageMeetup'
import MeetupShare from '@/components/quedadas/MeetupShare'
import { getMeetup, getMeetupByToken, costInfo } from '@/lib/meetups-store'
import { getSpot } from '@/lib/fishing-spots'
import { getSpecies } from '@/lib/fishing-species'
import { getMarineForecast, groupByDay, bestWindow, getModality } from '@/lib/marine-forecast'
import { safetyAlerts, navigationWindows, dayVerdict } from '@/lib/sea-state'
import { fmtDateLong, fmtWindowRange, todayMadridISO, addDaysISO } from '@/lib/solunar-format'

export const metadata: Metadata = {
  title: 'Quedada de pesca',
  robots: { index: false, follow: true },
}

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; nueva?: string }> }

const MOD_LABEL: Record<string, string> = { tierra: '🏖️ Orilla / costa', kayak: '🛶 Kayak', barco: '🚤 Barco (compartir gastos)' }

export default async function MeetupPage({ params, searchParams }: Params) {
  const { id } = await params
  const { t, nueva } = await searchParams
  const meetup = await getMeetup(id)
  if (!meetup) notFound()

  const isHost = t ? (await getMeetupByToken(id, t)) !== null : false
  const spot = getSpot(meetup.spotSlug)
  const sp = meetup.targetSpecies ? getSpecies(meetup.targetSpecies) : null
  const modality = getModality(meetup.modality)
  const full = meetup.placesTaken >= meetup.maxPlaces
  const cancelled = meetup.status === 'cancelled'
  const cost = costInfo(meetup)

  // Forecast + safety for the meetup's day, from our own marine engine.
  const today = todayMadridISO()
  const horizonEnd = addDaysISO(today, 6)
  let outlook: { verdict: string; alerts: { level: string; text: string }[]; navSafe: boolean | null; window: string | null } | null = null
  let daysAway: number | null = null
  if (spot && spot.type === 'mar' && meetup.dateISO >= today && meetup.dateISO <= horizonEnd) {
    try {
      const forecast = await getMarineForecast(spot, meetup.targetSpecies || null, meetup.modality)
      const day = groupByDay(forecast.hours).find((g) => g.dateISO === meetup.dateISO)
      if (day && day.hours.length) {
        const win = bestWindow(day.hours)
        const navWins = meetup.modality !== 'tierra' ? navigationWindows(day.hours, modality) : []
        outlook = {
          verdict: dayVerdict({ hours: day.hours, window: win, tideNote: null }),
          alerts: safetyAlerts(day.hours),
          navSafe: meetup.modality === 'tierra' ? null : navWins.length > 0,
          window: win ? fmtWindowRange(win.start, win.end, day.hours[0].time) : null,
        }
      }
    } catch {
      /* forecast unavailable — the meetup still shows */
    }
  } else if (spot && meetup.dateISO > horizonEnd) {
    daysAway = Math.round((Date.parse(`${meetup.dateISO}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000)
  }

  const danger = outlook?.alerts.some((a) => a.level === 'peligro') || outlook?.navSafe === false

  return (
    <Layout>
      <section className="bg-paper border-b border-ink/12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <nav className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-5">
            <Link href="/quedadas" className="hover:text-accent">Quedadas</Link> <span className="mx-1">/</span>{' '}
            <span className="text-ink">{spot?.name ?? meetup.spotSlug}</span>
          </nav>

          {cancelled && (
            <div className="border border-red-700/40 rounded-xl bg-red-700/[0.07] p-3 mb-5 text-sm font-bold text-red-900">
              Esta quedada se ha cancelado.
            </div>
          )}

          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">
            {MOD_LABEL[meetup.modality]}{sp ? ` · a por ${sp.name.toLowerCase()}` : ''}
          </p>
          <h1 className="font-display uppercase text-3xl sm:text-4xl md:text-5xl leading-[1.02] text-ink">
            {spot?.name ?? meetup.spotSlug}
          </h1>
          <p className="text-ink/70 text-[15px] mt-3 capitalize">{fmtDateLong(meetup.dateISO)} · {meetup.timeStart}</p>

          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2 text-sm">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink/50">Plazas</span>
              <span className="font-display text-lg text-ink">{meetup.placesTaken}/{meetup.maxPlaces}</span>
              <span className={`font-mono text-[10px] uppercase tracking-widest ${meetup.status === 'confirmed' ? 'text-accent' : 'text-ink/40'}`}>
                {meetup.status === 'confirmed' ? '✓ confirmada' : `mín. ${meetup.minToConfirm}`}
              </span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2 text-sm">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink/50">Nivel</span>
              <span className="font-bold text-ink capitalize">{meetup.level}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2 text-sm">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink/50">Coste</span>
              <span className="font-bold text-ink">{cost.label}</span>
            </span>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {isHost && <ManageMeetup id={meetup.id} manageToken={t!} justCreated={nueva === '1'} />}

        {/* Detalle */}
        <div className="space-y-2 text-[15px] text-ink/85">
          {meetup.meetingPoint && <p><strong>📍 Punto de encuentro:</strong> {meetup.meetingPoint}</p>}
          <p><strong>👤 Anfitrión:</strong> {meetup.hostName}</p>
          {meetup.notes && <p className="text-ink/75 whitespace-pre-line border-l-4 border-accent/40 pl-3">{meetup.notes}</p>}
        </div>

        {!cancelled && (
          <MeetupShare
            waText={`🎣 Quedada de pesca en ${spot?.name ?? meetup.spotSlug} — ${fmtDateLong(meetup.dateISO)} a las ${meetup.timeStart}${sp ? ` (a por ${sp.name.toLowerCase()})` : ''}. ${meetup.placesTaken}/${meetup.maxPlaces} plazas. ¿Te apuntas?`}
          />
        )}

        {/* Reparto de gastos dinámico (barco compartido, sin lucro) */}
        {cost.mode === 'reparto' && cost.perPersonNow != null && (
          <div className="border border-accent/30 rounded-2xl bg-accent/[0.05] p-4 space-y-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">🚤 Gastos compartidos</p>
            <p className="text-[15px] text-ink/85">
              Gastos totales <strong>{meetup.totalCost} €</strong> a repartir entre todos los que vais.
              Ahora sois <strong>{meetup.placesTaken + 1}</strong> a bordo → <strong>≈{cost.perPersonNow} €/persona</strong>.
              {!full && cost.perPersonFull != null && cost.perPersonFull < cost.perPersonNow && (
                <> Si se llena ({meetup.maxPlaces + 1} a bordo), baja a <strong>≈{cost.perPersonFull} €</strong>. Cuantos más seáis, más barato.</>
              )}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wide text-ink/40">Solo reparto de gastos reales, sin ánimo de lucro.</p>
          </div>
        )}

        {/* Previsión + seguridad del día */}
        {danger && (
          <div className="border border-red-700/40 rounded-2xl bg-red-700/[0.07] p-4">
            <p className="font-bold text-red-900 text-sm">
              ⚠️ Condiciones no aptas para {meetup.modality} este día
            </p>
            <p className="text-[13px] text-red-900/80 mt-1">
              {outlook?.navSafe === false
                ? 'No hay ninguna franja segura para navegar según la previsión. Considera cambiar de día o modalidad.'
                : outlook?.alerts.find((a) => a.level === 'peligro')?.text}
            </p>
          </div>
        )}
        {outlook && !danger && (
          <div className="border border-ink/15 rounded-2xl bg-paper p-4 space-y-2">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">🌊 Previsión del día en {spot?.name}</p>
            {outlook.verdict && <p className="text-[14px] text-ink/85">{outlook.verdict}</p>}
            {outlook.window && <p className="text-[13px] text-ink/70">Mejor ventana: <strong>{outlook.window}</strong>{outlook.navSafe ? ' · franja de navegación apta ✓' : ''}</p>}
            {outlook.alerts.filter((a) => a.level === 'aviso').map((a, i) => (
              <p key={i} className="text-[13px] text-amber-800">⚠️ {a.text}</p>
            ))}
            <Link href={`/mejores-horas/${meetup.spotSlug}?modo=${meetup.modality}${meetup.targetSpecies ? `&especie=${meetup.targetSpecies}` : ''}`} className="inline-block text-[12px] font-bold uppercase tracking-wide text-accent hover:underline">
              Ver previsión completa hora a hora →
            </Link>
          </div>
        )}
        {daysAway != null && (
          <p className="text-[13px] text-ink/55 border border-ink/12 rounded-xl bg-ink/[0.02] p-3">
            🗓️ Faltan {daysAway} días — la previsión detallada aparecerá cuando entre en el rango de 7 días. Mientras, mira el{' '}
            <Link href={`/mejores-horas/${meetup.spotSlug}/planificador`} className="text-accent underline">planificador de la zona</Link>.
          </p>
        )}

        {/* Apuntarse */}
        {!cancelled && <JoinMeetup id={meetup.id} full={full} />}

        {/* Quién va */}
        {meetup.rsvps.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">Quién va ({meetup.placesTaken})</p>
            <div className="flex flex-wrap gap-2">
              {meetup.rsvps.map((r) => (
                <span key={r.id} className="inline-flex items-center gap-1.5 border border-ink/12 rounded-full px-3 py-1.5 text-sm text-ink">
                  {r.name}{r.places > 1 ? ` +${r.places - 1}` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-[12px] text-ink/50 leading-relaxed border-t border-ink/12 pt-6">
          Quedada para compartir gastos, sin ánimo de lucro. Lleva tu licencia de pesca, chaleco y avisa a alguien en tierra.
          El anfitrión y cada participante son responsables de su propia seguridad.
        </p>
      </section>
    </Layout>
  )
}
