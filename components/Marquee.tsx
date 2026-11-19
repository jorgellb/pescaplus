interface MarqueeProps {
  items: string[]
  className?: string
}

/**
 * Teletipo: una banda azul de fondo con letra de datos, como la línea de
 * avisos de una carta. Los textos se duplican para que el bucle no tenga
 * costura. Es decorativa (aria-hidden): lo que dice está también en la página.
 */
export default function Marquee({ items, className = 'bg-deep text-foam' }: MarqueeProps) {
  const loop = [...items, ...items]
  return (
    <div className={`overflow-hidden py-3.5 ${className}`} aria-hidden="true">
      <div className="flex w-max animate-marquee">
        {loop.map((text, i) => (
          <span key={i} className="flex items-center gap-7 mx-7 font-mono text-[12px] font-medium uppercase tracking-[0.14em] whitespace-nowrap">
            {text}
            <span className="w-1.5 h-1.5 rounded-full bg-buoy" />
          </span>
        ))}
      </div>
    </div>
  )
}
