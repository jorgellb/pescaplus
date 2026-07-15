import type { HourPoint } from '@/lib/marine-forecast'
import { scoreHex, windHex, waveHex, weatherEmoji } from '@/lib/forecast-format'
import { fmtDayLabel } from '@/lib/solunar-format'

function WindArrow({ deg }: { deg: number | null }) {
  if (deg == null) return <span className="text-ink/30">–</span>
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ transform: `rotate(${deg + 180}deg)` }} className="inline-block">
      <path d="M12 2l5 10h-3.2v10h-3.6V12H7z" />
    </svg>
  )
}

const LABEL = 'sticky left-0 z-10 bg-paper text-left font-mono text-[10px] font-bold uppercase tracking-wide text-ink/50 px-2 py-1 whitespace-nowrap border-r border-ink/12'
const CELL = 'text-center px-1 py-1 text-[11px] tabular-nums border-l border-ink/[0.06]'

export default function HourlyTable({ hours, hasMarine }: { hours: HourPoint[]; hasMarine: boolean }) {
  if (hours.length === 0) return null

  // Group by day for the header.
  const groups: { date: string; span: number }[] = []
  for (const h of hours) {
    const last = groups[groups.length - 1]
    if (last && last.date === h.dateISO) last.span += 1
    else groups.push({ date: h.dateISO, span: 1 })
  }

  const colBg = (h: HourPoint) => (h.isNow ? 'bg-accent/[0.08]' : h.solunar ? 'bg-accent/[0.04]' : !h.isDay ? 'bg-ink/[0.03]' : '')

  return (
    <div className="border border-ink/12 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="border-collapse w-max">
          <thead>
            <tr>
              <th className={`${LABEL} align-bottom`}></th>
              {groups.map((g) => (
                <th key={g.date} colSpan={g.span} className="text-left font-display uppercase text-sm text-ink px-2 py-1.5 border-l border-ink/12 whitespace-nowrap capitalize">
                  {fmtDayLabel(g.date)}
                </th>
              ))}
            </tr>
            <tr>
              <th className={LABEL}>Hora</th>
              {hours.map((h, i) => (
                <th key={i} className={`${CELL} font-mono text-[10px] text-ink/50 font-bold ${colBg(h)}`}>{h.hourLabel.slice(0, 2)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Sky */}
            <tr>
              <td className={LABEL}>Cielo</td>
              {hours.map((h, i) => (
                <td key={i} className={`${CELL} ${colBg(h)}`}>{weatherEmoji(h.code, h.isDay)}</td>
              ))}
            </tr>
            {/* Score */}
            <tr>
              <td className={LABEL}>Pesca</td>
              {hours.map((h, i) => (
                <td key={i} className={`${CELL} ${colBg(h)}`}>
                  <span className="inline-block min-w-[22px] rounded text-paper font-bold text-[11px] px-1 py-0.5" style={{ background: scoreHex(h.score) }}>{h.score}</span>
                </td>
              ))}
            </tr>
            {/* Wind */}
            <tr>
              <td className={LABEL}>Viento</td>
              {hours.map((h, i) => (
                <td key={i} className={`${CELL} font-bold ${colBg(h)}`} style={{ color: windHex(h.windKmh) }}>{h.windKmh ?? '–'}</td>
              ))}
            </tr>
            {/* Gusts */}
            <tr>
              <td className={LABEL}>Rachas</td>
              {hours.map((h, i) => (
                <td key={i} className={`${CELL} text-ink/60 ${colBg(h)}`}>{h.gustKmh ?? '–'}</td>
              ))}
            </tr>
            {/* Direction */}
            <tr>
              <td className={LABEL}>Dir.</td>
              {hours.map((h, i) => (
                <td key={i} className={`${CELL} text-ink/70 ${colBg(h)}`} title={h.windDirLabel ?? ''}><WindArrow deg={h.windDir} /></td>
              ))}
            </tr>
            {hasMarine && (
              <>
                {/* Waves */}
                <tr>
                  <td className={LABEL}>Olas m</td>
                  {hours.map((h, i) => (
                    <td key={i} className={`${CELL} font-bold ${colBg(h)}`} style={{ color: waveHex(h.waveM) }}>{h.waveM != null ? h.waveM.toFixed(1) : '–'}</td>
                  ))}
                </tr>
                {/* Period */}
                <tr>
                  <td className={LABEL}>Periodo s</td>
                  {hours.map((h, i) => (
                    <td key={i} className={`${CELL} text-ink/60 ${colBg(h)}`}>{h.wavePeriod != null ? Math.round(h.wavePeriod) : '–'}</td>
                  ))}
                </tr>
              </>
            )}
            {/* Temp */}
            <tr>
              <td className={LABEL}>Temp °C</td>
              {hours.map((h, i) => (
                <td key={i} className={`${CELL} text-ink/70 ${colBg(h)}`}>{h.temp != null ? Math.round(h.temp) : '–'}</td>
              ))}
            </tr>
            {/* Precip */}
            <tr>
              <td className={LABEL}>Lluvia %</td>
              {hours.map((h, i) => (
                <td key={i} className={`${CELL} ${colBg(h)} ${h.precipProb != null && h.precipProb >= 50 ? 'text-ink font-bold' : 'text-ink/40'}`}>{h.precipProb ?? '–'}</td>
              ))}
            </tr>
            {/* Pressure */}
            <tr>
              <td className={LABEL}>Presión</td>
              {hours.map((h, i) => (
                <td key={i} className={`${CELL} text-ink/50 text-[10px] ${colBg(h)}`}>{h.pressure != null ? Math.round(h.pressure) : '–'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
