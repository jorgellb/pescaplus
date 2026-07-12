interface MarqueeProps {
  items: string[]
  className?: string
}

/** Brutalist scrolling ticker. Items are duplicated for a seamless loop. */
export default function Marquee({ items, className = 'bg-ink text-paper' }: MarqueeProps) {
  const loop = [...items, ...items]
  return (
    <div className={`overflow-hidden border-y border-ink/12 py-2.5 ${className}`} aria-hidden="true">
      <div className="flex w-max animate-marquee">
        {loop.map((text, i) => (
          <span key={i} className="flex items-center gap-5 mx-5 font-mono text-xs font-bold uppercase tracking-widest whitespace-nowrap">
            {text}
            <span className="text-accent text-sm">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
