import type { HourPoint } from '@/lib/marine-forecast'
import { windHex, INK } from '@/lib/forecast-format'

/** Hourly wind bars + gust line for a single day, with night and solunar bands. */
export default function WindChart({
  hours,
  sunrise,
  sunset,
  periods,
  now,
}: {
  hours: HourPoint[]
  sunrise: number | null
  sunset: number | null
  periods: { start: number; end: number }[]
  now: number
}) {
  if (hours.length === 0) return null
  const W = 720
  const H = 190
  const padL = 8
  const padR = 8
  const padB = 22
  const padT = 10
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const dayStart = hours[0].time
  const dayEnd = dayStart + 24 * 3600000
  const x = (t: number) => padL + ((t - dayStart) / (dayEnd - dayStart)) * innerW
  const gusts = hours.map((h) => h.gustKmh ?? 0)
  const winds = hours.map((h) => h.windKmh ?? 0)
  const scale = Math.max(40, Math.ceil(Math.max(...gusts, ...winds) / 10) * 10)
  const y = (v: number) => padT + innerH - (v / scale) * innerH
  const barW = (innerW / 24) * 0.62

  const gustPts = hours.map((h) => `${x(h.time)},${y(h.gustKmh ?? 0)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Previsión de viento por horas">
      {/* night shading */}
      {sunrise != null && sunrise > dayStart && <rect x={padL} y={padT} width={x(sunrise) - padL} height={innerH} fill={INK} opacity={0.05} />}
      {sunset != null && sunset < dayEnd && <rect x={x(sunset)} y={padT} width={padL + innerW - x(sunset)} height={innerH} fill={INK} opacity={0.05} />}
      {/* solunar bands */}
      {periods.map((p, i) => (
        <rect key={i} x={x(Math.max(p.start, dayStart))} y={padT} width={Math.max(0, x(Math.min(p.end, dayEnd)) - x(Math.max(p.start, dayStart)))} height={innerH} fill="#0f766e" opacity={0.08} />
      ))}
      {/* gridlines every 10 km/h */}
      {Array.from({ length: Math.floor(scale / 10) }, (_, i) => (i + 1) * 10).map((v) => (
        <line key={v} x1={padL} x2={padL + innerW} y1={y(v)} y2={y(v)} stroke={INK} strokeOpacity={0.08} strokeWidth={1} />
      ))}
      {/* wind bars */}
      {hours.map((h, i) => {
        const v = h.windKmh ?? 0
        return <rect key={i} x={x(h.time) - barW / 2} y={y(v)} width={barW} height={padT + innerH - y(v)} rx={2} fill={windHex(h.windKmh)} opacity={h.isDay ? 0.9 : 0.55} />
      })}
      {/* gust line */}
      <polyline points={gustPts} fill="none" stroke={INK} strokeWidth={1.5} strokeOpacity={0.55} strokeLinejoin="round" />
      {/* now marker */}
      {now >= dayStart && now <= dayEnd && (
        <line x1={x(now)} x2={x(now)} y1={padT} y2={padT + innerH} stroke="#0f766e" strokeWidth={1.5} strokeDasharray="3 3" />
      )}
      {/* hour axis */}
      {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((hh) => (
        <text key={hh} x={x(dayStart + hh * 3600000)} y={H - 6} textAnchor="middle" fontSize={10} fill={INK} fillOpacity={0.45} fontFamily="monospace">
          {String(hh % 24).padStart(2, '0')}
        </text>
      ))}
    </svg>
  )
}
