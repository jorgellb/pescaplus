import Link from 'next/link'
import type { SpotActivity } from '@/lib/catch-reports'
import { fmtDayLabel } from '@/lib/solunar-format'
import Icon from '@/components/icons/Icon'

/**
 * What anglers have actually been catching here lately — the one thing no
 * weather model can answer. Fed by catches shared anonymously from the diary.
 *
 * Below the threshold it doesn't hide: it invites. An empty state that explains
 * how the data appears is what turns a reader into the first contributor.
 */
export default function SpotCatchActivity({ activity, spotName }: {
  activity: SpotActivity
  spotName: string
}) {
  if (!activity.enough) {
    return (
      <div className="border border-ink/[0.07] rounded-2xl bg-paper p-5">
        <h3 className="font-display text-xl text-ink inline-flex items-center gap-2"><Icon name="fish" className="w-4 h-4" strokeWidth={1.8} />Qué se está pescando en {spotName}</h3>
        <p className="text-[14px] text-ink/70 mt-2 leading-relaxed">
          Todavía no hay capturas suficientes de esta zona. Es el dato que ninguna previsión
          puede darte —lo que de verdad está entrando— y sale de lo que comparte la gente.
        </p>
        <Link href="/diario" className="inline-block mt-3 text-[14px] font-semibold text-accent hover:underline">
          Apunta tu captura y ayuda al siguiente →
        </Link>
      </div>
    )
  }

  const top = activity.species.slice(0, 6)
  const max = top[0]?.reports ?? 1

  return (
    <div className="border border-accent/25 rounded-2xl bg-accent/[0.04] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-display text-xl text-ink inline-flex items-center gap-2"><Icon name="fish" className="w-4 h-4" strokeWidth={1.8} />Qué se está pescando en {spotName}</h3>
        <p className="text-[12.5px] text-ink/60">
          {activity.reports} capturas · últimos {activity.days} días
          {activity.lastDateISO && <> · última <span className="first-letter:uppercase inline-block">{fmtDayLabel(activity.lastDateISO)}</span></>}
        </p>
      </div>

      <ul className="space-y-2 mt-4">
        {top.map((s) => (
          <li key={s.speciesId} className="flex items-center gap-3">
            <span className="w-32 sm:w-40 shrink-0 text-[14.5px] text-ink/85 truncate">{s.name}</span>
            <span className="flex-1 h-2.5 rounded-full bg-ink/[0.06] overflow-hidden">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round((s.reports / max) * 100)}%` }} />
            </span>
            <span className="w-14 shrink-0 text-right text-[13px] text-ink/60">{s.share}%</span>
          </li>
        ))}
      </ul>

      <p className="text-[12px] text-ink/60 mt-4">
        Datos anónimos y agregados por zona, compartidos por pescadores desde su diario.
        Nunca se publican puntos concretos ni quién los aportó.
      </p>
    </div>
  )
}
