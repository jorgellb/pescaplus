interface MarqueeProps {
  items: string[]
  className?: string
}

/** Scrolling ticker of selling points. Items are duplicated for a seamless loop. */
export default function Marquee({ items, className = 'bg-paper text-ink/70' }: MarqueeProps) {
  const loop = [...items, ...items]
  return (
    <div className={`overflow-hidden border-y border-ink/[0.07] py-3 ${className}`} aria-hidden="true">
      <div className="flex w-max animate-marquee">
        {loop.map((text, i) => (
          <span key={i} className="flex items-center gap-6 mx-6 text-sm font-medium whitespace-nowrap">
            {text}
            <span className="text-accent/50 text-xs">●</span>
          </span>
        ))}
      </div>
    </div>
  )
}
