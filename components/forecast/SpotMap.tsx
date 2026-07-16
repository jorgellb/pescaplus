import { FISHING_SPOTS, type FishingSpot } from '@/lib/fishing-spots'

/**
 * Clickable map of Spain built from the spot coordinates themselves — the 187
 * coastal points literally trace the coastline, so no external map asset is
 * needed (the CSP forbids them anyway). Equirectangular projection with the
 * usual Canarias inset. Pure SVG links: works without JavaScript.
 */

const W = 860
const H = 560

// Peninsula + Baleares + Ceuta/Melilla frame.
const P = { latMin: 35.05, latMax: 43.95, lonMin: -9.6, lonMax: 4.6, x: 0, y: 0, w: W, h: H }
// Canarias inset (traditional bottom-left box).
const C = { latMin: 27.5, latMax: 29.5, lonMin: -18.3, lonMax: -13.3, x: 14, y: H - 148, w: 240, h: 134 }

function project(s: FishingSpot): { x: number; y: number; inset: boolean } {
  const f = s.region === 'Canarias' ? C : P
  const x = f.x + ((s.lon - f.lonMin) / (f.lonMax - f.lonMin)) * f.w
  const y = f.y + ((f.latMax - s.lat) / (f.latMax - f.latMin)) * f.h
  return { x, y, inset: s.region === 'Canarias' }
}

export default function SpotMap() {
  return (
    <div className="border border-ink/15 rounded-2xl bg-paper shadow-hard p-4 sm:p-6 overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Mapa de localidades de pesca de España">
        <style>{`
          .spot-g text { display: none; paint-order: stroke; stroke: #f2efe6; stroke-width: 3px; }
          .spot-g:hover text, .spot-g:focus-within text { display: block; }
          .spot-g:hover .dot, .spot-g:focus-within .dot { fill: #111111; }
        `}</style>

        {/* Canarias inset frame */}
        <rect x={C.x - 8} y={C.y - 22} width={C.w + 16} height={C.h + 30} fill="none" stroke="#111111" strokeOpacity={0.15} rx={10} />
        <text x={C.x} y={C.y - 8} fontSize={10} fontFamily="monospace" fill="#111111" fillOpacity={0.45} style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
          Canarias
        </text>

        {FISHING_SPOTS.map((s) => {
          const { x, y } = project(s)
          const labelLeft = x > W - 130
          return (
            <a key={s.slug} href={`/mejores-horas/${s.slug}`} className="spot-g" aria-label={`Pesca en ${s.name}`}>
              <title>{`${s.name} · ${s.region}`}</title>
              {/* generous invisible hit area */}
              <circle cx={x} cy={y} r={9} fill="transparent" />
              {s.type === 'mar' ? (
                <circle className="dot" cx={x} cy={y} r={4} fill="#0f766e" opacity={0.85} />
              ) : (
                <rect className="dot" x={x - 3.5} y={y - 3.5} width={7} height={7} rx={1.5} fill="#c98a1a" opacity={0.9} />
              )}
              <text x={labelLeft ? x - 9 : x + 9} y={y + 4} fontSize={13} fontWeight={700} fill="#111111" textAnchor={labelLeft ? 'end' : 'start'}>
                {s.name}
              </text>
            </a>
          )
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 font-mono text-[10px] uppercase tracking-widest text-ink/45">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" /> Costa</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[#c98a1a] inline-block" /> Embalses y ríos</span>
        <span>Pasa el cursor y pulsa tu zona</span>
      </div>
    </div>
  )
}
