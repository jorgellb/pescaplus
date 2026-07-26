import CharterIcon from './CharterIcon'
import type { Option } from '@/lib/charter-options'

/**
 * A labelled block of icon chips. Shared by charter listings and quedadas so
 * both read the same way — same catalogue, same icons, same shape. Renders
 * nothing when there's nothing to show, so a sparse listing is just shorter.
 */
export default function OptionGroup({ title, icon, options, tone = 'neutral' }: {
  title: string
  icon: string
  options: Option[]
  tone?: 'neutral' | 'yes' | 'no'
}) {
  if (options.length === 0) return null
  const chip =
    tone === 'yes' ? 'bg-accent/[0.07] text-ink border-accent/25'
    : tone === 'no' ? 'bg-ink/[0.03] text-ink/60 border-ink/10'
    : 'bg-paper text-ink/85 border-ink/[0.09]'
  return (
    <section>
      <h3 className="flex items-center gap-2 font-semibold text-ink mb-3">
        <CharterIcon name={icon} className="w-[18px] h-[18px] text-accent" />
        {title}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {options.map((o) => (
          <li key={o.id} className={`inline-flex items-center gap-2 border rounded-full px-3 py-1.5 text-[13.5px] ${chip}`}>
            <CharterIcon name={o.icon} className="w-4 h-4 shrink-0 opacity-70" />
            {o.label}
          </li>
        ))}
      </ul>
    </section>
  )
}
