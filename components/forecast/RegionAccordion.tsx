import Link from 'next/link'
import { FISHING_SPOTS, type FishingSpot } from '@/lib/fishing-spots'
import { regionSlug } from '@/lib/region-slug'

/**
 * Comunidad-by-comunidad accordions for every fishing zone. Native
 * details/summary (accessible, works without JS, content stays crawlable);
 * anchored so the map's regions can deep-link into them.
 */

const COASTAL_ORDER = [
  'Galicia', 'Asturias', 'Cantabria', 'País Vasco', 'Andalucía', 'Murcia',
  'Comunidad Valenciana', 'Cataluña', 'Baleares', 'Canarias', 'Ceuta', 'Melilla',
]

function groups(): { region: string; spots: FishingSpot[]; coastal: boolean }[] {
  const map = new Map<string, FishingSpot[]>()
  for (const s of FISHING_SPOTS) {
    const list = map.get(s.region)
    if (list) list.push(s)
    else map.set(s.region, [s])
  }
  const coastal = COASTAL_ORDER.filter((r) => map.has(r)).map((r) => ({ region: r, spots: map.get(r)!, coastal: true }))
  const inland = [...map.keys()]
    .filter((r) => !COASTAL_ORDER.includes(r))
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((r) => ({ region: r, spots: map.get(r)!, coastal: false }))
  return [...coastal, ...inland]
}

export default function RegionAccordion() {
  return (
    <div className="space-y-2.5">
      {groups().map(({ region, spots, coastal }, i) => (
        <details
          key={region}
          id={`zona-${regionSlug(region)}`}
          open={i === 0}
          className="group border border-ink/15 rounded-2xl bg-paper overflow-hidden scroll-mt-24 open:shadow-hard transition-shadow"
        >
          <summary className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden hover:bg-ink/[0.03] transition-colors">
            <span className="flex items-center gap-3 min-w-0">
              <span
                className={`flex-shrink-0 ${coastal ? 'w-2.5 h-2.5 rounded-full bg-accent' : 'w-2.5 h-2.5 rounded-[3px] bg-[#c98a1a]'}`}
                aria-hidden
              />
              <span className="font-display uppercase text-lg sm:text-xl text-ink leading-none truncate">{region}</span>
              <span className="flex-shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/45 border border-ink/15 rounded-full px-2 py-0.5">
                {spots.length} {spots.length === 1 ? 'zona' : 'zonas'}
              </span>
            </span>
            <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center border border-ink/15 rounded-full text-accent text-lg leading-none transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="px-4 sm:px-5 pb-4 pt-1 border-t border-ink/10">
            <div className="flex flex-wrap gap-2">
              {spots.map((s) => (
                <Link
                  key={s.slug}
                  href={`/mejores-horas/${s.slug}`}
                  className="px-3 py-1.5 text-sm font-semibold text-ink border border-ink/15 rounded-full hover:bg-ink hover:text-paper transition-colors"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        </details>
      ))}
    </div>
  )
}
