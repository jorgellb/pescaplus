import type { HourPoint, FishingWindow } from '@/lib/marine-forecast'
import { INK, ACCENT } from '@/lib/forecast-format'

/** Day activity curve: the fishing score over 24 h with the best window shaded. */
export default function ActivityChart({
  hours,
  window: win,
  now,
}: {
  hours: HourPoint[]
  window: FishingWindow | null
  now: number
}) {
  if (hours.length === 0) return null
  const W = 720
  const H = 150
  const padL = 8
  const padR = 8
  const padT = 12
  const padB = 22
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const dayStart = hours[0].time
  const dayEnd = dayStart + 24 * 3600000
  const x = (t: number) => padL + ((t - dayStart) / (dayEnd - dayStart)) * innerW
  const y = (s: number) => padT + innerH - (s / 100) * innerH

  const pts = hours.map((h) => [x(h.time + 1800000), y(h.score)] as const)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${padT + innerH} L${pts[0][0].toFixed(1)},${padT + innerH} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Actividad de pesca prevista a lo largo del día">
      {/* thresholds */}
      {[40, 70].map((v) => (
        <line key={v} x1={padL} x2={padL + innerW} y1={y(v)} y2={y(v)} stroke={INK} strokeOpacity={0.08} strokeWidth={1} strokeDasharray="4 4" />
      ))}
      {/* best window band */}
      {win && (
        <rect x={x(Math.max(win.start, dayStart))} y={padT} width={Math.max(0, x(Math.min(win.end, dayEnd)) - x(Math.max(win.start, dayStart)))} height={innerH} fill={ACCENT} opacity={0.12} rx={4} />
      )}
      <path d={area} fill={ACCENT} opacity={0.14} />
      <path d={line} fill="none" stroke={ACCENT} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {/* now marker */}
      {now >= dayStart && now <= dayEnd && (
        <line x1={x(now)} x2={x(now)} y1={padT} y2={padT + innerH} stroke={INK} strokeWidth={1.5} strokeDasharray="3 3" strokeOpacity={0.5} />
      )}
      {/* peak label */}
      {(() => {
        const peak = hours.reduce((a, b) => (b.score > a.score ? b : a))
        const px = x(peak.time + 1800000)
        const py = y(peak.score)
        return (
          <g>
            <circle cx={px} cy={py} r={4} fill={ACCENT} stroke="#f2efe6" strokeWidth={1.5} />
            <text x={Math.min(Math.max(px, 24), W - 24)} y={Math.max(py - 8, 10)} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK}>
              {peak.score}
            </text>
          </g>
        )
      })()}
      {[0, 6, 12, 18, 24].map((hh) => (
        <text key={hh} x={x(dayStart + hh * 3600000)} y={H - 6} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={INK} fillOpacity={0.45}>
          {String(hh % 24).padStart(2, '0')}
        </text>
      ))}
    </svg>
  )
}
