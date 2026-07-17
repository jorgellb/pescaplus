import { MAP_W, MAP_H, PENINSULA_FRAME, CANARY_FRAME, CANARY_BOX, SPAIN_REGIONS } from '@/lib/spain-map'
import { scoreHex } from '@/lib/forecast-format'
import type { SpotDayScore } from '@/lib/day-scores'

/**
 * The day map: every zone coloured by its fishing score for the chosen day.
 * Same IGN silhouette and shared frames as SpotMap, but here colour IS the
 * data — dots are sorted so the best zones paint on top. Pure SVG anchors.
 */

function project(s: SpotDayScore): { x: number; y: number } {
  const f = s.region === 'Canarias' ? CANARY_FRAME : PENINSULA_FRAME
  return { x: f.ox + (s.lon - f.lonMin) * f.kx, y: f.oy + (f.latMax - s.lat) * f.ky }
}

const LEGEND = [
  { label: 'Excelente ≥70', color: scoreHex(75) },
  { label: 'Buena 55–69', color: scoreHex(60) },
  { label: 'Regular 40–54', color: scoreHex(45) },
  { label: 'Floja <40', color: scoreHex(20) },
]

export default function DayScoreMap({ spots, showNav }: { spots: SpotDayScore[]; showNav: boolean }) {
  const ordered = [...spots].sort((a, b) => a.score - b.score)
  return (
    <div className="border border-ink/15 rounded-2xl bg-paper shadow-hard overflow-hidden">
      <div className="p-4 sm:p-6">
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full h-auto" role="img" aria-label="Mapa de España coloreado por puntuación de pesca del día">
          <style>{`
            .region-bg { fill: #111111; fill-opacity: 0.045; stroke: #111111; stroke-opacity: 0.2; stroke-width: 0.7; }
            .day-spot text { display: none; paint-order: stroke; stroke: #f2efe6; stroke-width: 3.5px; }
            .day-spot:hover text, .day-spot:focus-within text { display: block; }
            .day-spot:hover .dot, .day-spot:focus-within .dot { stroke: #111111; stroke-width: 1.6; }
          `}</style>

          {SPAIN_REGIONS.map((r) => (
            <path key={r.name} className="region-bg" d={r.path} style={{ pointerEvents: 'none' }} />
          ))}

          <rect x={CANARY_BOX.x} y={CANARY_BOX.y} width={CANARY_BOX.w} height={CANARY_BOX.h} fill="none" stroke="#111111" strokeOpacity={0.18} rx={10} />
          <text x={CANARY_BOX.x + 10} y={CANARY_BOX.y + 16} fontSize={9.5} fontFamily="monospace" fill="#111111" fillOpacity={0.45} letterSpacing={2}>
            CANARIAS
          </text>

          {ordered.map((s) => {
            const { x, y } = project(s)
            const labelLeft = x > MAP_W - 130
            const fill = scoreHex(s.score)
            const noNav = showNav && !s.navegable
            return (
              <a key={s.slug} href={`/mejores-horas/${s.slug}`} className="day-spot" aria-label={`${s.name}: puntuación ${s.score}`}>
                <title>{`${s.name} · ${s.score}/100${noNav ? ' · no navegable' : ''}`}</title>
                <circle cx={x} cy={y} r={9} fill="transparent" />
                {s.type === 'mar' ? (
                  <circle className="dot" cx={x} cy={y} r={4} fill={fill} stroke={noNav ? '#b23b2e' : '#f2efe6'} strokeWidth={noNav ? 1.8 : 1.1} />
                ) : (
                  <rect className="dot" x={x - 3.6} y={y - 3.6} width={7.2} height={7.2} rx={1.5} fill={fill} stroke="#f2efe6" strokeWidth={1.1} />
                )}
                <text x={labelLeft ? x - 10 : x + 10} y={y + 4} fontSize={12.5} fontWeight={700} fill="#111111" textAnchor={labelLeft ? 'end' : 'start'}>
                  {`${s.name} · ${s.score}`}
                </text>
              </a>
            )
          })}
        </svg>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 px-4 sm:px-6 py-3 border-t border-ink/10 bg-ink/[0.02]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-ink/50">
          {LEGEND.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block border border-paper" style={{ backgroundColor: l.color }} /> {l.label}
            </span>
          ))}
          {showNav && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block border-2 border-[#b23b2e]" /> No navegable
            </span>
          )}
        </div>
        <span className="font-mono text-[9px] uppercase tracking-widest text-ink/30">Silueta: IGN</span>
      </div>
    </div>
  )
}
