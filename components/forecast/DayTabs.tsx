'use client'

import { Children, useState } from 'react'

/** Client-side day switcher: renders one server-rendered day panel at a time. */
export default function DayTabs({ labels, children }: { labels: string[]; children: React.ReactNode }) {
  const [active, setActive] = useState(0)
  const panels = Children.toArray(children)

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none" role="tablist">
        {labels.map((l, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-tight border transition-colors ${
              i === active ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink/70 border-ink/15 hover:bg-ink/5'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      {panels[active]}
    </div>
  )
}
