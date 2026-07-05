import FishSilhouette from './FishSilhouette'

/** Decorative, non-interactive underwater scene layered behind the hero copy. */
export default function HeroArt() {
  const bubbles = [
    { left: '12%', bottom: '18%', size: 8, delay: '0s', dur: '7s' },
    { left: '18%', bottom: '10%', size: 5, delay: '1.5s', dur: '6s' },
    { left: '80%', bottom: '22%', size: 10, delay: '0.8s', dur: '8s' },
    { left: '86%', bottom: '14%', size: 6, delay: '2.2s', dur: '6.5s' },
    { left: '50%', bottom: '8%', size: 7, delay: '3s', dur: '7.5s' },
  ]

  return (
    <div className="absolute inset-0 -z-[5] overflow-hidden pointer-events-none" aria-hidden>
      {/* Light rays from the surface */}
      <svg className="absolute -top-10 left-0 w-full h-2/3 animate-ray" viewBox="0 0 1200 500" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="200,0 320,0 240,500 40,500" fill="url(#ray)" />
        <polygon points="560,0 680,0 640,500 420,500" fill="url(#ray)" />
        <polygon points="920,0 1020,0 1080,500 820,500" fill="url(#ray)" />
      </svg>

      {/* Fish */}
      <div className="absolute top-[24%] left-[6%] w-40 md:w-56 text-cyan-500/10 animate-swim">
        <FishSilhouette className="w-full h-auto" />
      </div>
      <div className="absolute top-[16%] right-[10%] w-24 md:w-32 text-teal-400/10 animate-swim-slow">
        <FishSilhouette className="w-full h-auto -scale-x-100" />
      </div>
      <div className="absolute bottom-[26%] right-[22%] w-16 md:w-20 text-cyan-400/[0.08] animate-float-y">
        <FishSilhouette className="w-full h-auto -scale-x-100" />
      </div>

      {/* Fishing line + hook + lure descending on the right */}
      <div className="absolute top-0 right-[16%] h-[62%] animate-bob origin-top">
        <svg viewBox="0 0 60 320" className="h-full w-auto">
          <line x1="30" y1="0" x2="30" y2="230" stroke="#67e8f9" strokeOpacity="0.35" strokeWidth="1.5" />
          {/* hook */}
          <path
            d="M30 230 L30 262 C30 280 14 284 14 268 C14 260 20 258 22 262"
            stroke="#a5f3fc"
            strokeOpacity="0.55"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* lure */}
          <g className="animate-float-y" style={{ transformOrigin: '30px 224px' }}>
            <ellipse cx="30" cy="220" rx="9" ry="15" fill="#f59e0b" fillOpacity="0.5" />
            <circle cx="30" cy="212" r="2.4" fill="#0b1220" />
            <path d="M22 226 l-6 6 M38 226 l6 6" stroke="#f59e0b" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* Rising bubbles */}
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="absolute rounded-full border border-cyan-300/30 bg-cyan-300/10"
          style={{
            left: b.left,
            bottom: b.bottom,
            width: b.size,
            height: b.size,
            animation: `bubble-rise ${b.dur} ease-in ${b.delay} infinite`,
          }}
        />
      ))}
    </div>
  )
}
