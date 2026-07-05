interface OceanWavesProps {
  className?: string
  /** Flip vertically so waves crest downward (useful at the top of a section). */
  flip?: boolean
}

/**
 * Layered, seamlessly-scrolling wave divider. Each layer is a 200%-wide group
 * that translates by -50% so the loop is continuous. Pure SVG, no JS.
 */
export default function OceanWaves({ className, flip }: OceanWavesProps) {
  const wave =
    'M0 60 C 150 20 300 100 450 60 C 600 20 750 100 900 60 C 1050 20 1200 100 1350 60 L 1350 140 L 0 140 Z'
  return (
    <div className={className} style={flip ? { transform: 'rotate(180deg)' } : undefined} aria-hidden>
      <svg viewBox="0 0 1350 140" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="waveA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0891b2" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0e7490" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="waveB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <g className="animate-wave-scroll" style={{ animationDuration: '22s' }}>
          <path d={wave} fill="url(#waveA)" />
          <path d={wave} fill="url(#waveA)" transform="translate(1350 0)" />
        </g>
        <g className="animate-wave-scroll" style={{ animationDuration: '14s' }}>
          <path d={wave} fill="url(#waveB)" transform="translate(0 24)" />
          <path d={wave} fill="url(#waveB)" transform="translate(1350 24)" />
        </g>
      </svg>
    </div>
  )
}
