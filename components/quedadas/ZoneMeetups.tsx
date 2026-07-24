import Link from 'next/link'
import { listMeetupsBySpot, costInfo } from '@/lib/meetups-store'
import ZoneAlertSignup from '@/components/quedadas/ZoneAlertSignup'
import { getSpecies } from '@/lib/fishing-species'
import { todayMadridISO, fmtDayLabel } from '@/lib/solunar-format'

const MOD_EMOJI: Record<string, string> = { tierra: '🏖️', kayak: '🛶', barco: '🚤' }

/** Compact "quedadas in this zone" block for the spot dashboard. Streamed in a
 * Suspense boundary so it never blocks the forecast. */
export default async function ZoneMeetups({ spotSlug, spotName }: { spotSlug: string; spotName: string }) {
  const meetups = await listMeetupsBySpot(spotSlug, todayMadridISO())

  return (
    <div className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-6 space-y-4 scroll-mt-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display uppercase text-2xl text-ink leading-none flex items-center gap-2">
          <span aria-hidden>🎣</span> Quedadas en {spotName}
        </h2>
        <Link href={`/quedadas/nueva?zona=${spotSlug}`} className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-accent transition-colors">
          ➕ Organizar
        </Link>
      </div>

      {meetups.length === 0 ? (
        <p className="text-sm text-ink/60">
          Aún no hay quedadas aquí. Organiza una salida —orilla, kayak o barco a compartir gastos— y que se apunten otros pescadores.
        </p>
      ) : (
        <ul className="space-y-2">
          {meetups.slice(0, 5).map((m) => {
            const sp = m.targetSpecies ? getSpecies(m.targetSpecies) : null
            const full = m.placesTaken >= m.maxPlaces
            return (
              <li key={m.id}>
                <Link href={`/quedadas/${m.id}`} className="flex items-center justify-between gap-3 border border-ink/12 rounded-xl px-3.5 py-2.5 bg-paper hover:border-accent transition-colors">
                  <span className="min-w-0">
                    <span className="block font-bold text-ink text-sm">
                      {MOD_EMOJI[m.modality]} <span className="capitalize">{fmtDayLabel(m.dateISO)}</span> · {m.timeStart}
                      {sp ? ` · ${sp.name}` : ''}
                    </span>
                    <span className="block font-mono text-[10px] uppercase tracking-widest text-ink/45">
                      nivel {m.level} · {costInfo(m).label}
                    </span>
                  </span>
                  <span className={`font-mono text-[10px] font-bold uppercase tracking-widest shrink-0 ${m.status === 'confirmed' ? 'text-accent' : 'text-ink/40'}`}>
                    {full ? 'Completa' : m.status === 'confirmed' ? 'Confirmada' : `${m.placesTaken}/${m.maxPlaces}`}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <div className="border-t border-ink/10 pt-3">
        <ZoneAlertSignup spotSlug={spotSlug} spotName={spotName} />
      </div>
    </div>
  )
}
