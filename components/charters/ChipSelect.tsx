'use client'

import { useState } from 'react'
import CharterIcon from './CharterIcon'
import type { Option } from '@/lib/charter-options'

/**
 * Multi-select rendered as icon chips. Long catalogues (species, techniques)
 * collapse to a first row with a "ver todas" toggle, so the publish form stays
 * scannable instead of becoming a wall of checkboxes.
 */
export default function ChipSelect({ label, hint, icon, options, value, onChange, collapseAfter = 12 }: {
  label: string
  hint?: string
  icon?: string
  options: Option[]
  value: string[]
  onChange: (next: string[]) => void
  collapseAfter?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const collapsed = options.length > collapseAfter && !expanded
  // Selected options always stay visible, even when the list is collapsed.
  const shown = collapsed
    ? options.filter((o, i) => i < collapseAfter || value.includes(o.id))
    : options

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  return (
    <fieldset className="space-y-2">
      <legend className="flex items-center gap-2 font-semibold text-ink text-[15px]">
        {icon && <CharterIcon name={icon} className="w-[18px] h-[18px] text-accent" />}
        {label}
        {value.length > 0 && <span className="text-[12px] font-normal text-accent">({value.length})</span>}
      </legend>
      {hint && <p className="text-[13px] text-ink/55 -mt-1">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {shown.map((o) => {
          const on = value.includes(o.id)
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              aria-pressed={on}
              className={`inline-flex items-center gap-2 border rounded-full px-3 py-1.5 text-[13.5px] transition-colors ${
                on ? 'bg-accent text-paper border-accent' : 'bg-paper text-ink/75 border-ink/[0.07] hover:border-accent/50 hover:text-ink'
              }`}
            >
              <CharterIcon name={o.icon} className="w-4 h-4 shrink-0 opacity-80" />
              {o.label}
            </button>
          )
        })}
        {options.length > collapseAfter && (
          <button type="button" onClick={() => setExpanded((v) => !v)}
            className="text-[13px] font-semibold text-accent hover:underline px-2 py-1.5">
            {expanded ? 'Ver menos' : `Ver las ${options.length}`}
          </button>
        )}
      </div>
    </fieldset>
  )
}
