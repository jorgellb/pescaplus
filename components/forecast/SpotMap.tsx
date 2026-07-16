import { FISHING_SPOTS, type FishingSpot } from '@/lib/fishing-spots'
import { MAP_W, MAP_H, PENINSULA_FRAME, CANARY_FRAME, CANARY_BOX, SPAIN_REGIONS } from '@/lib/spain-map'
import { regionSlug } from '@/lib/region-slug'

/**
 * Clickable map of Spain: real IGN coastline (simplified at build time — the
 * CSP forbids external assets at runtime) with the fishing spots on top.
 * Outline and dots share the same linear frames, so they align by construction.
 * Comunidades link to their accordion below; dots link to their forecast page.
 * Pure SVG anchors: everything works without JavaScript.
 */

function project(s: FishingSpot): { x: number; y: number } {
  const f = s.region === 'Canarias' ? CANARY_FRAME : PENINSULA_FRAME
  return { x: f.ox + (s.lon - f.lonMin) * f.kx, y: f.oy + (f.latMax - s.lat) * f.ky }
}

const REGIONS_WITH_SPOTS = new Set(FISHING_SPOTS.map((s) => s.region))

export default function SpotMap() {
  return (
    <div className="border border-ink/15 rounded-2xl bg-paper shadow-hard overflow-hidden">
      <div className="p-4 sm:p-6">
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full h-auto" role="img" aria-label="Mapa de España con las zonas de pesca">
          <style>{`
            .region { fill: #111111; fill-opacity: 0.05; stroke: #111111; stroke-opacity: 0.22; stroke-width: 0.7; transition: fill-opacity .15s; }
            a:hover .region, a:focus .region { fill: #0f766e; fill-opacity: 0.13; }
            .spot-g text { display: none; paint-order: stroke; stroke: #f2efe6; stroke-width: 3.5px; }
            .spot-g:hover text, .spot-g:focus-within text { display: block; }
            .spot-g:hover .dot, .spot-g:focus-within .dot { fill: #111111; }
          `}</style>

          {/* Land — recessive support under the data */}
          {SPAIN_REGIONS.map((r) =>
            REGIONS_WITH_SPOTS.has(r.name) ? (
              <a key={r.name} href={`#zona-${regionSlug(r.name)}`} aria-label={`Zonas de pesca en ${r.name}`}>
                <path className="region" d={r.path}>
                  <title>{r.name}</title>
                </path>
              </a>
            ) : (
              <path key={r.name} className="region" d={r.path} style={{ pointerEvents: 'none' }} />
            ),
          )}

          {/* Canarias inset frame */}
          <rect x={CANARY_BOX.x} y={CANARY_BOX.y} width={CANARY_BOX.w} height={CANARY_BOX.h} fill="none" stroke="#111111" strokeOpacity={0.18} rx={10} />
          <text x={CANARY_BOX.x + 10} y={CANARY_BOX.y + 16} fontSize={9.5} fontFamily="monospace" fill="#111111" fillOpacity={0.45} letterSpacing={2}>
            CANARIAS
          </text>

          {/* Spots — the data layer */}
          {FISHING_SPOTS.map((s) => {
            const { x, y } = project(s)
            const labelLeft = x > MAP_W - 120
            return (
              <a key={s.slug} href={`/mejores-horas/${s.slug}`} className="spot-g" aria-label={`Pesca en ${s.name}`}>
                <title>{`${s.name} · ${s.region}`}</title>
                <circle cx={x} cy={y} r={9} fill="transparent" />
                {s.type === 'mar' ? (
                  <circle className="dot" cx={x} cy={y} r={3.6} fill="#0f766e" stroke="#f2efe6" strokeWidth={1.2} />
                ) : (
                  <rect className="dot" x={x - 3.4} y={y - 3.4} width={6.8} height={6.8} rx={1.5} fill="#c98a1a" stroke="#f2efe6" strokeWidth={1.2} />
                )}
                <text x={labelLeft ? x - 9 : x + 9} y={y + 4} fontSize={12.5} fontWeight={700} fill="#111111" textAnchor={labelLeft ? 'end' : 'start'}>
                  {s.name}
                </text>
              </a>
            )
          })}
        </svg>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 px-4 sm:px-6 py-3 border-t border-ink/10 bg-ink/[0.02]">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-ink/45">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent inline-block border border-paper" /> Costa</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[#c98a1a] inline-block border border-paper" /> Embalses y ríos</span>
          <span className="hidden sm:inline">Pulsa un punto o una comunidad</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-widest text-ink/30">Silueta: IGN</span>
      </div>
    </div>
  )
}
