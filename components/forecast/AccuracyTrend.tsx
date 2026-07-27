import { INK } from '@/lib/forecast-format'
import type { AccuracyPoint } from '@/lib/verification-store'

/**
 * Day-by-day forecast error, so "fiabilidad verificada" is more than one
 * aggregate number — you can see whether we're actually getting better, not
 * just how we did on average. Bars above the line mean we predicted MORE
 * wind than there was; below, less. Colour is purely the error's size.
 */
export default function AccuracyTrend({ history }: { history: AccuracyPoint[] }) {
  if (history.length < 3) return null
  const W = 320
  const H = 64
  const padL = 3
  const padR = 3
  const padT = 6
  const padB = 6
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const maxAbs = Math.max(5, ...history.map((h) => Math.abs(h.errorKmh)))
  const barW = Math.max(2, (innerW / history.length) * 0.6)
  const x = (i: number) => padL + (innerW / history.length) * (i + 0.5)
  const y0 = padT + innerH / 2
  const y = (v: number) => y0 - (v / maxAbs) * (innerH / 2)
  const colorFor = (e: number) => (Math.abs(e) <= 5 ? '#0a7d72' : Math.abs(e) <= 10 ? '#b45309' : '#b91c1c')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-w-[220px]" role="img" aria-label={`Error de previsión de viento en los últimos ${history.length} días verificados`}>
      <line x1={padL} x2={padL + innerW} y1={y0} y2={y0} stroke={INK} strokeOpacity={0.15} strokeWidth={1} />
      {history.map((h, i) => {
        const barY = h.errorKmh >= 0 ? y(h.errorKmh) : y0
        const barH = Math.max(1.5, Math.abs(y(h.errorKmh) - y0))
        return <rect key={h.dateISO} x={x(i) - barW / 2} y={barY} width={barW} height={barH} rx={1} fill={colorFor(h.errorKmh)} opacity={0.85} />
      })}
    </svg>
  )
}
