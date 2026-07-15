import type { TideExtreme } from '@/lib/tides'
import { fmtTime } from '@/lib/solunar-format'
import { INK, ACCENT } from '@/lib/forecast-format'

/** Smooth tide curve for one day, interpolated (cosine) between the extremes. */
export default function TideChart({ extremes, dayStart, now }: { extremes: TideExtreme[]; dayStart: number; now: number }) {
  if (extremes.length < 2) return null
  const W = 720
  const H = 170
  const padL = 10
  const padR = 10
  const padT = 16
  const padB = 22
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const dayEnd = dayStart + 24 * 3600000

  const sorted = [...extremes].sort((a, b) => a.time - b.time)
  const heights = sorted.map((e) => e.height)
  const hMin = Math.min(...heights)
  const hMax = Math.max(...heights)
  const pad = (hMax - hMin) * 0.18 || 0.15
  const yMin = hMin - pad
  const yMax = hMax + pad

  const x = (t: number) => padL + ((t - dayStart) / (dayEnd - dayStart)) * innerW
  const y = (h: number) => padT + innerH - ((h - yMin) / (yMax - yMin)) * innerH

  const interp = (t: number): number => {
    if (t <= sorted[0].time) return sorted[0].height
    if (t >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].height
    let a = sorted[0]
    let b = sorted[1]
    for (let i = 0; i < sorted.length - 1; i++) {
      if (t >= sorted[i].time && t <= sorted[i + 1].time) {
        a = sorted[i]
        b = sorted[i + 1]
        break
      }
    }
    const f = (t - a.time) / (b.time - a.time)
    return a.height + (b.height - a.height) * (1 - Math.cos(Math.PI * f)) / 2
  }

  const N = 96
  const pts: [number, number][] = []
  for (let i = 0; i <= N; i++) {
    const t = dayStart + (i / N) * (dayEnd - dayStart)
    pts.push([x(t), y(interp(t))])
  }
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${padL + innerW},${padT + innerH} L${padL},${padT + innerH} Z`
  const dayExtremes = sorted.filter((e) => e.time >= dayStart && e.time <= dayEnd)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Curva de marea del día">
      <path d={area} fill={ACCENT} opacity={0.1} />
      <path d={line} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />
      {dayExtremes.map((e, i) => (
        <g key={i}>
          <circle cx={x(e.time)} cy={y(e.height)} r={3.5} fill={ACCENT} />
          <text x={x(e.time)} y={e.type === 'alta' ? y(e.height) - 7 : y(e.height) + 15} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={INK} fillOpacity={0.75}>
            {fmtTime(e.time)}
          </text>
          <text x={x(e.time)} y={e.type === 'alta' ? y(e.height) - 18 : y(e.height) + 26} textAnchor="middle" fontSize={8} fontFamily="monospace" fill={INK} fillOpacity={0.4}>
            {e.height.toFixed(1)}m
          </text>
        </g>
      ))}
      {now >= dayStart && now <= dayEnd && (
        <>
          <line x1={x(now)} x2={x(now)} y1={padT} y2={padT + innerH} stroke={ACCENT} strokeWidth={1.5} strokeDasharray="3 3" />
          <circle cx={x(now)} cy={y(interp(now))} r={4} fill={ACCENT} stroke="#f2efe6" strokeWidth={1.5} />
        </>
      )}
      {[0, 6, 12, 18, 24].map((hh) => (
        <text key={hh} x={x(dayStart + hh * 3600000)} y={H - 6} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={INK} fillOpacity={0.45}>
          {String(hh % 24).padStart(2, '0')}
        </text>
      ))}
    </svg>
  )
}
